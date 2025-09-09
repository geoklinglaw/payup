import { useEffect, useState } from 'react';
import { Box, Heading, VStack, Image, Alert, AlertIcon, useToast } from '@chakra-ui/react';
import { extractReceipt } from '../utils/extractReceipt';
import { useBillState } from '../state/useBillState';

export default function ReceiptCapture() {
  const { state, dispatch: billDispatch, setExtractHandler } = useBillState();
  const snapshotUrl = state.snapshotUrl;
  const [error, setError] = useState(null);
  const toast = useToast();

  const toBase64 = async (urlOrDataUrl) => {
    if (!urlOrDataUrl) return null;
    if (urlOrDataUrl.startsWith('data:')) return urlOrDataUrl.split(',')[1];
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
      toast({ title: 'Insert a photo first', status: 'warning', duration: 2000 });
      throw new Error('No snapshotUrl');
    }
    setError(null);
    const loadingToast = toast({ title: 'Loading...', status: 'info', duration: null, isClosable: false });
    try {
      const base64 = await toBase64(snapshotUrl);
      let jsonText = await extractReceipt(base64);
      jsonText = jsonText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonText);

      billDispatch({ type: 'SET_RECEIPT_ITEMS', items: parsed.line_items });
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

      billDispatch({ type: 'GOTO', step: 2 });
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to extract receipt');
      throw e;
    } finally {
      toast.close(loadingToast);
    }
  };

  useEffect(() => {
    setExtractHandler(runExtraction);
  }, [setExtractHandler, snapshotUrl]);

  return (
    <Box className="max-w-3xl mx-auto" p={6}>
      <Heading size="md" mb={4}>Receipt</Heading>
      <VStack borderWidth="1px" borderStyle="dashed" borderRadius="xl" p={6} bg="white" align="stretch" spacing={4}>
        {snapshotUrl ? (
          <Image src={snapshotUrl} alt="Receipt preview" w="100%" objectFit="contain" />
        ) : (
          <Alert status="warning">
            <AlertIcon />
            No image selected yet.
          </Alert>
        )}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}
      </VStack>
    </Box>
  );
}
