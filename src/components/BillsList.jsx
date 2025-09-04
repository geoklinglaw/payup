import { Box, Button, Card, CardBody, Heading, Stack, Text } from '@chakra-ui/react';
import { useBillState } from '../state/useBillState';


export default function BillsList() {
const { state, dispatch } = useBillState();


return (
    <Box className="max-w-4xl mx-auto" p={6}>
        <Heading size="md" mb={4}>Bills</Heading>
        <Stack>
            {state.bills.map(b => (
            <Card key={b.id}><CardBody>
                <Heading size="sm">{b.name}</Heading>
                {b.items.map(it => <Text key={it.id}>• {it.label} — ${it.price}</Text>)}
                </CardBody>
            </Card>
            ))}
        </Stack>
        <Button mt={4} onClick={() => dispatch({ type: 'GOTO', step: 1 })}>Add Another Bill</Button>
        <Button mt={2} colorScheme="blue" onClick={() => dispatch({ type: 'GOTO', step: 4 })}>View Final Split</Button>
    </Box>
);
}