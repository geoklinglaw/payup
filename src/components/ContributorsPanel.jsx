import { useState } from 'react'
import { Box, Button, Heading, HStack, Input, Tag, TagLabel, TagCloseButton } from '@chakra-ui/react'
import { useBillState } from '../state/useBillState'


export default function ContributorsPanel() {
const { state, dispatch } = useBillState()
const [name, setName] = useState('')


const add = () => {
    if (!name.trim()) return
    dispatch({ type: 'ADD_CONTRIB', name: name.trim() })
    setName('')
}


return (
    <Box className="max-w-4xl mx-auto" p={6}>
    <Heading size="md" mb={4}>Contributors</Heading>
    <HStack mb={4}>
        <Input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} />
        <Button onClick={add} bg="button.500" color="white">Add</Button>
    </HStack>
    <HStack mb={4} gap={3} wrap="wrap">
        {state.contributors.map(c => (
            <Tag key={c.id} size="lg" variant="subtle" bg="selection.500" className="mb-2">
            <TagLabel>{c.name}</TagLabel>
            <TagCloseButton onClick={() => dispatch({ type: 'REMOVE_CONTRIB', id: c.id })} />
            </Tag>
        ))}
    </HStack>

    </Box>
)}