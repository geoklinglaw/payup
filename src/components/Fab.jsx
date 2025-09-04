import { IconButton, VStack, Spinner } from '@chakra-ui/react'
import { Plus, ArrowRight } from 'lucide-react'

export default function Fab({ onAdd, onNext, isLoading }) {
  return (
    <VStack position="fixed" right={6} bottom={6} spacing={3}>
      {/* <IconButton
        bg="button.600"
        aria-label="add"
        icon={<Plus size={18} />}
        onClick={onAdd}
        rounded="full"
      /> */}
      <IconButton
        bg="button.600"
        aria-label="next"
        icon={isLoading ? <Spinner size="sm"/> : <ArrowRight size={18} />}
        onClick={onNext}
        rounded="full"
        isDisabled={isLoading} 
      />
    </VStack>
  )
}
