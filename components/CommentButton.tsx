import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity } from "react-native"

type Props = {
  postId: string
}

export default function CommentButton({ postId }: Props) {

  const router = useRouter()

  function openComments() {

    if (!postId) return

    router.push({
      pathname: "/comments",
      params: { postId: String(postId) }
    })

  }

  return (
    <TouchableOpacity onPress={openComments} style={styles.container}>
      <Ionicons name="chatbubble-outline" size={30} color="white" />
      <Text style={styles.text}>Comment</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container:{
    alignItems:"center"
  },
  text:{
    color:"white",
    fontSize:12
  }
})