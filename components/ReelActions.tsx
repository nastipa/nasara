import { StyleSheet, View } from "react-native"
import CommentButton from "./CommentButton"
import FollowButton from "./FollowButton"
import LikeButton from "./LikeButton"
import ShareButton from "./ShareButton"

type Post = {
  id: string
  media_url: string
  user_id: string
}

type Props = {
  post: Post
}

export default function ReelActions({ post }: Props){

  return(

    <View style={styles.container}>

      <LikeButton postId={post.id} />

      <CommentButton postId={post.id} />

      <ShareButton url={post.media_url} />

      <FollowButton userId={post.user_id} />

    </View>

  )

}

const styles = StyleSheet.create({

  container:{
    position:"absolute",
    right:10,
    bottom:120,
    alignItems:"center",
    gap:20
  }

})