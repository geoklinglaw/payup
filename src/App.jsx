import { useState } from 'react';
import { Box, Container, Progress, Alert, AlertIcon } from '@chakra-ui/react'
import Fab from './components/Fab'
import ContributorsPanel from './components/ContributorsPanel'
import ReceiptCapture from './components/ReceiptCapture'
import BillEntry from './components/BillEntry'
import BillsList from './components/BillsList'
import FinalSummary from './components/FinalSummary'
import { BillProvider, useBillState } from './state/useBillState'

function StepRouter() {
  const { state, dispatch, callExtractHandler } = useBillState()
  const [busy, setBusy] = useState(false);

  const canNext = () => {
    if (state.step === 0) return state.contributors.length >= 1
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
        // Force navigation to BillEntry after extraction finishes
        dispatch({ type: 'GOTO', step: 2 })
      } catch (err) {
        console.error('[StepRouter] Extraction failed:', err)
      } finally {
        setBusy(false);
      }
      return
    }
  
    if (state.step === 2) return
    dispatch({ type: 'NEXT' })
  }
  

  return (
    <Container maxW="6xl" py={6}>
      <Progress value={(state.step / 4) * 100} mb={4} size="sm" />

      {state.step === 0 && <ContributorsPanel />}
      {state.step === 1 && <ReceiptCapture />}
      {state.step === 2 && <BillEntry />}
      {state.step === 3 && <BillsList />}
      {state.step === 4 && <FinalSummary />}

      {state.step === 1 && !callExtractHandler && (
        <Alert status="warning" mt={3}>
          <AlertIcon />
          ReceiptCapture hasn’t registered the extract handler yet.
        </Alert>
      )}

      <Fab onAdd={onAdd} onNext={onNext} isLoading={busy} />
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
