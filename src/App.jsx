import { useRef, useState } from 'react';
import { Box, Container, Progress, Alert, AlertIcon } from '@chakra-ui/react'
import Fab from './components/Fab'
import ContributorsPanel from './components/ContributorsPanel'
import ReceiptCapture from './components/ReceiptCapture'
import BillEntry from './components/BillEntry'
import FinalSummary from './components/FinalSummary'
import { BillProvider, useBillState } from './state/useBillState'

function StepRouter() {
  const { state, dispatch, callExtractHandler, callSaveHandler, resetAll } = useBillState()
  const [busy, setBusy] = useState(false);
  const shouldNavigateToHome = state.step === 3;
  const fileInputRef = useRef(null);
  
  const handleFilePicked = (e) => {
    const f = e.target.files?.[0];
    // allow picking the same file again later
    e.target.value = '';
    if (!f) return; // user cancelled -> stay on step 0
    const url = URL.createObjectURL(f);
    // if you had a previous snapshotUrl you can revoke it here if you store it
    dispatch({ type: 'SET_SNAPSHOT_URL', url });
    dispatch({ type: 'GOTO', step: 1 }); // show the image page
  };

  const canNext = () => {
    if (state.step === 0) return state.contributors.length > 1
    if (state.step === 1) return true
    if (state.step === 2) return true
    if (state.step === 3) return state.bills.length > 0
    return false
  }

  const onAdd = () => {
    if (state.step === 0) {
      dispatch({ type: 'ADD_CONTRIB', name: `Name ${state.contributors.length + 1}` })
    }
    if (state.step === 3) {
      dispatch({ type: 'GOTO', step: 2 })
    }
  }

  const onNext = async () => {
    if (!canNext()) return

    if (state.step === 0) {
      fileInputRef.current?.click();
      return; 
    }

    if (state.step === 1) {
      console.log('[StepRouter] Arrow clicked on step 1. callExtractHandler exists?', !!callExtractHandler)
      if (!callExtractHandler) {
        console.warn('[StepRouter] No extract handler registered yet (ReceiptCapture not mounted or not set).')
        return
      }
      try {
        setBusy(true); 
        const ok = await callExtractHandler() 
        console.log('[StepRouter] Extraction finished. ok =', ok)
        dispatch({ type: 'GOTO', step: 2 })
      } catch (err) {
        console.error('[StepRouter] Extraction failed:', err)
      } finally {
        setBusy(false);
      }
      return
    }
  
    if (state.step === 2) {
      console.log('[StepRouter] Arrow clicked on step 1. callSaveHandler exists?', !!callSaveHandler)
      if (!callSaveHandler) {
        console.warn('[StepRouter] No save handler registered yet (BillEntry not mounted or not set).')
        return
      }
      try {
        const ok = await callSaveHandler() 
        if (!ok) return;  
        console.log('[StepRouter] Bill entry confirmed. ok =', ok)
        dispatch({ type: 'GOTO', step: 3 })
      } catch (err) {
        console.error('[StepRouter] Bill entry failed:', err)
      } 
      return
    }

    if (state.step === 3) {
      resetAll()
      return
    }

    dispatch({ type: 'NEXT' })
  }
  

  return (
    <Container maxW="6xl" py={6}>
      <Progress value={(state.step / 4) * 100} mb={4} size="sm" />

      {state.step === 0 && <ContributorsPanel />}
      {state.step === 1 && <ReceiptCapture />}
      {state.step === 2 && <BillEntry />}
      {state.step === 3 && <FinalSummary />}

      {state.step === 1 && !callExtractHandler && (
        <Alert status="warning" mt={3}>
          <AlertIcon />
          There was an error capturing the receipt.
        </Alert>
      )}

      {state.step === 1 && !callSaveHandler && (
        <Alert status="warning" mt={3}>
          <AlertIcon />
          There was an error calculating the bill split.
        </Alert>
      )}

      <Fab onAdd={onAdd} onNext={onNext} isLoading={busy} navigateToHome={shouldNavigateToHome} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFilePicked}
      />
    </Container>
  )
}

export default function App() {
  return (
    <BillProvider>
      <Box className="min-h-screen">
        <StepRouter />
      </Box>
    </BillProvider>
  )
}
