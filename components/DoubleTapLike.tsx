import { ReactNode, useRef } from "react"
import { TouchableWithoutFeedback } from "react-native"

type Props = {
  children: ReactNode
  onDoubleTap: () => void
}

export default function DoubleTapLike({ children, onDoubleTap }: Props){

  const lastTap = useRef(0)

  function handleTap(){

    const now = Date.now()

    if(now - lastTap.current < 300){
      onDoubleTap()
    }

    lastTap.current = now
  }

  return(
    <TouchableWithoutFeedback onPress={handleTap}>
      {children}
    </TouchableWithoutFeedback>
  )

}