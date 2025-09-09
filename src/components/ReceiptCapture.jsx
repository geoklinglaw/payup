import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner,
  useToast,
  Image,
  Divider,
  Code,
} from '@chakra-ui/react';
import { FaCamera } from "react-icons/fa";
import { IoImage } from "react-icons/io5";
import { extractReceipt } from '../utils/extractReceipt'; 
import { useBillState } from '../state/useBillState';

export default function ReceiptCapture() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const { state, dispatch: billDispatch, setExtractHandler } = useBillState()
  const [hasStream, setHasStream] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const toast = useToast();

  const requestCamera = async () => {
    setError(null);
    setIsRequesting(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasStream(true);
      }
    } catch (e) {
      setError(e?.message || 'Unable to access camera');
      setHasStream(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setHasStream(false);
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.92);
    setSnapshotUrl(url);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const onFilePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (snapshotUrl && snapshotUrl.startsWith('blob:')) {
      URL.revokeObjectURL(snapshotUrl);
    }
    const url = URL.createObjectURL(f);
    setSnapshotUrl(url);
    toast({ title: 'Photo selected', status: 'info', duration: 2000, isClosable: true });
  };

  const toBase64 = async (urlOrDataUrl) => {
    if (!urlOrDataUrl) return null;
    if (urlOrDataUrl.startsWith('data:')) {
      return urlOrDataUrl.split(',')[1];
    }
    const res = await fetch(urlOrDataUrl);
    const blob = await res.blob();
    const reader = new FileReader();
    return await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const runExtraction = async () => {
    if (!snapshotUrl) {
      toast({ title: 'Add a photo first', status: 'warning', duration: 2000 });
      throw new Error('No snapshotUrl');
    }
    setIsExtracting(true);
    setError(null);
    try {
      const loadingToast = toast({
        title: 'Loading...',
        status: 'info',
        duration: null,
        isClosable: false,
      });
      const base64 = await toBase64(snapshotUrl);
      let jsonText = await extractReceipt(base64);
      jsonText = jsonText.replace(/```json|```/g, "").trim();
      console.log(jsonText)
      const parsed = JSON.parse(jsonText);

      billDispatch({ type: "SET_RECEIPT_ITEMS", items: parsed.line_items });
      billDispatch({
        type: 'SET_RECEIPT_META',
        meta: {
          merchant: parsed?.merchant || '',
          date: parsed?.date || '',
          subtotal: Number(parsed?.subtotal) || 0,
          tax: Number(parsed?.tax) || 0,
          total: Number(parsed?.total) || 0,
          currency: parsed?.currency || ''
        }
      });

      setResult(parsed);
      billDispatch({ type: 'GOTO', step: 2 });
      toast.close(loadingToast);
      toast({ title: 'Receipt extracted!', status: 'success', duration: 2000, isClosable: true });
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to extract receipt');
      throw e;
    } finally {
      setIsExtracting(false);
    }
  };
  
  useEffect(() => {
    setExtractHandler(runExtraction)
  }, [setExtractHandler, snapshotUrl]);

  return (
    <Box className="max-w-3xl mx-auto" p={6}>
      <Heading size="md" mb={4}>
        Upload Receipt
      </Heading>

      <VStack
        borderWidth="1px"
        borderStyle="dashed"
        borderRadius="xl"
        p={6}
        bg="white"
        align="stretch"
        spacing={4}
      >
        <Box
          position="relative"
          overflow="hidden"
          borderRadius="lg"
          borderWidth="1px"
          bg="gray.50"
          minH="240px"
        >
          {!hasStream && !snapshotUrl && (
            <VStack py={10} spacing={3}>
              <VStack
                  py={10}
                  spacing={4}      
                  align="center" 
                  justify="center"
                >
                <Button onClick={requestCamera} colorScheme="blue" isLoading={isRequesting}>
                  {isRequesting ? "Requesting…" : (
                    <>
                      <FaCamera style={{ marginRight: 6 }} /> Camera
                    </>
                  )}
                </Button>

                <Button as="label" variant="outline" leftIcon={<IoImage />}>
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={onFilePick}
                  />
                </Button>
              </VStack>
            </VStack>
          )}

          {snapshotUrl && !hasStream && (
            <Image src={snapshotUrl} alt="Receipt preview" w="100%" objectFit="contain" />
          )}
        </Box>

        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack>
            {hasStream && (
              <>
                <Button colorScheme="blue" onClick={captureFrame}>
                  Capture
                </Button>
                <Button variant="ghost" onClick={stopCamera}>
                  Close Camera
                </Button>
              </>
            )}
          </HStack>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}. If you denied permission, re-enable camera access in your browser settings.
          </Alert>
        )}
      </VStack>
    </Box>
  );
}
