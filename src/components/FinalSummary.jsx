import { useMemo } from 'react'
import { Box, Button, Heading, Textarea, VStack } from '@chakra-ui/react'
import { useBillState } from '../state/useBillState'


export default function FinalSummary() {
const { computePairwise } = useBillState()


const lines = useMemo(() => computePairwise(), [computePairwise])
const text = `Final Split
${lines.map(l => `- ${l}`).join('')}`
console.log("print split")
console.log(lines)


const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch {}
}


return (
    <Box className="max-w-3xl mx-auto" p={6}>
        <Heading size="md" mb={4}>Final transaction</Heading>
        <VStack align="stretch" gap={3}>
            <Textarea value={text} readOnly rows={10} />
            <Button onClick={copy} alignSelf="flex-end">Copy</Button>
        </VStack>
    </Box>
)}