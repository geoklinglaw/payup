import { useMemo, useEffect } from 'react'
import { Box, Button, Heading, Textarea, VStack } from '@chakra-ui/react'
import { useBillState } from '../state/useBillState'


export default function FinalSummary() {
const { state, computePairwise } = useBillState()


const lines = useMemo(() => computePairwise(), [computePairwise])
const text = `PayNow to ${state.contributors[0].name} <phone-number>
${lines.map(l => `- ${l}\n`).join('')}`

useEffect(() => {
  console.log('bills changed:', state.bills);
}, [state.bills]);


const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {}
}

return (
    <Box className="max-w-3xl mx-auto" p={6}>
        <Heading size="md" mb={4}>Summary</Heading>
        <VStack align="stretch" gap={3}>
            <Textarea value={text} readOnly rows={10} />
            <Button onClick={copy} alignSelf="flex-end">Copy</Button>
        </VStack>
    </Box>
)}