import { IconButton, VStack, Spinner } from '@chakra-ui/react'
import { Plus, ArrowRight, HomeIcon } from 'lucide-react'

export default function Fab({ onAdd, onNext, isLoading, navigateToHome }) {
  const icon = isLoading
    ? <Spinner size="sm" />
    : navigateToHome
      ? <HomeIcon size={18} />
      : <ArrowRight size={18} />;

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
        aria-label={isLoading ? 'loading' : navigateToHome ? 'home' : 'next'}
        icon={icon}
        onClick={onNext}
        rounded="full"
        isDisabled={isLoading} 
      />
    </VStack>
  )
}
