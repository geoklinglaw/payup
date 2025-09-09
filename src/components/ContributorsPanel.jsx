import { useState } from 'react'
import {
  Box, Button, Heading, HStack, Input,
  Tag, TagLabel, TagCloseButton,
  Alert, AlertIcon, Wrap, WrapItem
} from '@chakra-ui/react'
import { useBillState } from '../state/useBillState'

export default function ContributorsPanel() {
  const { state, dispatch } = useBillState()
  const [name, setName] = useState('')

  const contributors = state.contributors
  const tooFew = contributors.length < 2
  const remaining = Math.max(0, 2 - contributors.length)

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    dispatch({ type: 'ADD_CONTRIB', name: trimmed })
    setName('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') add()
  }

  return (
    <Box className="max-w-4xl mx-auto" p={6}>
      <Heading size="md" mb={4}>Contributors</Heading>

      {tooFew && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          Add at least two contributors to continue
          {remaining > 0 ? ` (${remaining} more needed)` : ''}.
        </Alert>
      )}

      <HStack mb={4}>
        <Input
          placeholder="Enter name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button onClick={add} bg="button.500" color="white">Add</Button>
      </HStack>

      <Wrap mb={4} spacing={3}>
        {contributors.map(c => (
          <WrapItem key={c.id}>
            <Tag size="lg" variant="subtle" bg="selection.500">
              <TagLabel>{c.name}</TagLabel>
              <TagCloseButton onClick={() => dispatch({ type: 'REMOVE_CONTRIB', id: c.id })} />
            </Tag>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  )
}
