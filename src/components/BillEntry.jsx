import { useEffect, useMemo, useState } from 'react'
import {
  Box, Card, CardBody, Heading, HStack, Input, NumberInput, NumberInputField, Select,
  SimpleGrid, Stack, Text, Checkbox, IconButton, Flex, Divider, Wrap, WrapItem, Badge, Tooltip,
  Alert, AlertIcon,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon } from '@chakra-ui/icons'
import { useBillState } from '../state/useBillState'

function emptyItem() {
  return { id: crypto.randomUUID(), label: '', price: 0, quantity: 1, assignees: [] }
}

export default function BillEntry() {
  const { state, dispatch, setSaveHandler } = useBillState()

  const [name, setName] = useState(state.receiptMeta.merchant || 'Restaurant X')
  const [hostId, setHostId] = useState(state.contributors[0]?.id || '')

  const [taxRate, setTaxRate] = useState(() => {
    const { subtotal, total } = state.receiptMeta || {}
    if (Number.isFinite(subtotal) && subtotal > 0 && Number.isFinite(total) && total > 0) {
      return Math.max(0, +(((total / subtotal) - 1) * 100).toFixed(2))
    }
    return 19
  })

  const [items, setItems] = useState(
    state.receiptItems.length > 0
      ? state.receiptItems.map(it => ({
          id: crypto.randomUUID(),
          label: it.description || '',
          price: Number.isFinite(it.unit_price)
            ? it.unit_price
            : Number.isFinite(it.amount) && Number.isFinite(it.quantity) && it.quantity > 0
              ? it.amount / it.quantity
              : Number(it.amount ?? 0),
          quantity: Number.isFinite(it.quantity) && it.quantity > 0 ? it.quantity : 1,
          assignees: []
        }))
      : [emptyItem()]
  )

  const contributors = state.contributors

  // track items with no assignees
  const [assigneeErrors, setAssigneeErrors] = useState([])  // array of item IDs
  const [hostError, setHostError] = useState(false)

  const markErrorsForEmptyAssignees = (list) => setAssigneeErrors(list)
  const clearItemError = (id) =>
    setAssigneeErrors(prev => (prev.length ? prev.filter(x => x !== id) : prev))

  const saveBill = () => {
    setHostError(false)
    setAssigneeErrors([])

    if (!contributors.length) {
      setHostError(true)
      return false
    }
    if (!hostId) {
      setHostError(true)
      return false
    }

    // validate: any item with positive line total must have ≥1 assignee
    const missing = items
      .filter(it => (Number(it.price) * Number(it.quantity)) > 0 && it.assignees.length === 0)
      .map(it => it.id)

    if (missing.length > 0) {
      markErrorsForEmptyAssignees(missing)
      return false
    }
    const bill = { id: crypto.randomUUID(), name, hostId, taxRate, items }
    dispatch({ type: 'ADD_BILL', bill })
    dispatch({ type: 'GOTO', step: 3 })
    return true
  }

  useEffect(() => {
    setSaveHandler(saveBill)
  }, [setSaveHandler, name, hostId, taxRate, items])

  const addRow = () => setItems(prev => [...prev, emptyItem()])
  const removeRow = (id) => {
    setItems(prev => prev.filter(it => it.id !== id))
    clearItemError(id)
  }

  const update = (id, patch) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)))
  }

  const toggleAssignee = (id, who) => {
    setItems(prev =>
      prev.map(it =>
        it.id === id
          ? {
              ...it,
              assignees: it.assignees.includes(who)
                ? it.assignees.filter(x => x !== who)
                : [...it.assignees, who],
            }
          : it
      )
    )
    // if they added at least one assignee, clear the error for this row
    setTimeout(() => {
      const item = items.find(i => i.id === id)
      const nextLen = item ? (item.assignees.includes(who) ? item.assignees.length - 1 : item.assignees.length + 1) : 0
      if (nextLen > 0) clearItemError(id)
    }, 0)
  }

  const rowAllChecked = (it) =>
    contributors.length > 0 && it.assignees.length === contributors.length

  const toggleRowAll = (id, check) => {
    setItems(prev =>
      prev.map(it =>
        it.id === id
          ? { ...it, assignees: check ? contributors.map(c => c.id) : [] }
          : it
      )
    )
    if (check) clearItemError(id)
  }

  const total = useMemo(() => {
    console.log("TOTAL: ",  state.receiptMeta.total)
    return state.receiptMeta.total
  }, [items, taxRate])

  return (
    <Box className="max-w-5xl mx-auto" p={6}>
      <Heading size="md" mb={4}>Edit Bill</Heading>

      {hostError && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          Please add at least one contributor and select a host before saving.
        </Alert>
      )}
      {assigneeErrors.length > 0 && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          {assigneeErrors.length} item{assigneeErrors.length > 1 ? 's' : ''} have no contributors selected. Please select at least one contributor for each.
        </Alert>
      )}

      {/* Bill meta */}
      <Card mb={4}>
        <CardBody>
          <SimpleGrid columns={[1, 3]} gap={4}>
            <Stack>
              <Text fontSize="sm" color="gray.600">Name</Text>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </Stack>

            <Stack>
              <Text fontSize="sm" color="gray.600">Host</Text>
              <Select value={hostId} onChange={e => setHostId(e.target.value)}>
                {contributors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Stack>

            <Stack>
              <Text fontSize="sm" color="gray.600">Surcharge (%)</Text>
              <NumberInput
                value={taxRate}
                min={0}
                precision={2}
                step={0.25}
                onChange={(_, v) => setTaxRate(Number.isFinite(v) ? v : 0)}
              >
                <NumberInputField />
              </NumberInput>
            </Stack>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Items */}
      <Card>
        <CardBody>
          <HStack justify="space-between" mb={3}>
            <Text fontWeight="semibold">Items</Text>
            <IconButton
              aria-label="Add item"
              icon={<AddIcon />}
              variant="outline"
              onClick={addRow}
              size="sm"
            />
          </HStack>

          <Box>
            <Stack spacing={4}>
              {items.map((it, idx) => {
                const hasError = assigneeErrors.includes(it.id)
                return (
                  <Card
                    key={it.id}
                    id={it.id}
                    variant="outline"
                    borderColor={hasError ? 'red.400' : undefined}
                    borderWidth={hasError ? '2px' : undefined}
                  >
                    <CardBody>
                      <Flex align="center" justify="space-between" mb={3} gap={3}>
                        <Box flex="1">
                          <Text fontSize="xs" color="gray.500" mb={1}>Item</Text>
                          <Input
                            size="sm"
                            value={it.label}
                            onChange={e => update(it.id, { label: e.target.value })}
                            placeholder={`Food item ${idx + 1}`}
                          />
                        </Box>
                        <IconButton
                          aria-label="Remove item"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRow(it.id)}
                        />
                      </Flex>

                      <SimpleGrid columns={2} gap={3} mb={3}>
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>UnitPrice</Text>
                          <NumberInput
                            size="sm"
                            value={Number.isFinite(it.price) ? it.price : 0}
                            min={0}
                            precision={2}
                            step={0.5}
                            onChange={(_, v) => update(it.id, { price: Number.isFinite(v) ? v : 0 })}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>Quantity</Text>
                          <NumberInput
                            size="sm"
                            value={Number.isFinite(it.quantity) ? it.quantity : 1}
                            min={1}
                            step={1}
                            onChange={(_, v) => update(it.id, { quantity: Number.isFinite(v) ? v : 1 })}
                          >
                            <NumberInputField />
                          </NumberInput>
                        </Box>
                      </SimpleGrid>

                      <Divider mb={3} />

                      <Text fontSize="xs" color="gray.500" mb={2}>Contributors</Text>
                      <Wrap spacing={3}>
                        <WrapItem>
                          <Checkbox
                            isChecked={rowAllChecked(it)}
                            isIndeterminate={
                              it.assignees.length > 0 && it.assignees.length < contributors.length
                            }
                            onChange={(e) => toggleRowAll(it.id, e.target.checked)}
                          >
                            <Badge variant="subtle" px={2} py={1} rounded="md">All</Badge>
                          </Checkbox>
                        </WrapItem>

                        {contributors.map(c => (
                          <WrapItem key={c.id}>
                            <Checkbox
                              isChecked={it.assignees.includes(c.id)}
                              onChange={() => toggleAssignee(it.id, c.id)}
                            >
                              <Tooltip label={c.name} hasArrow>
                                <Badge
                                  variant="subtle"
                                  px={2}
                                  py={1}
                                  rounded="md"
                                  maxW="28ch"
                                  noOfLines={1}
                                >
                                  {c.name}
                                </Badge>
                              </Tooltip>
                            </Checkbox>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </CardBody>
                  </Card>
                )
              })}
            </Stack>
          </Box>

          <HStack justify="space-between" mt={6}>
            <Text fontWeight="semibold">
              Estimated Total (incl. tax): ${total.toFixed(2)}
            </Text>
          </HStack>
        </CardBody>
      </Card>

    </Box>
  )
}
