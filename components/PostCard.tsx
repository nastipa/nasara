import { Image, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function PostCard({ post }: any) {

  async function likePost() {
    const user = (await supabase.auth.getUser()).data.user;

    await (supabase as any).from("post_likes").insert({
      user_id: user?.id,
      post_id: post.id
    });
  }

  return (
    <View style={{ margin: 10 }}>

      {post.media_type === "image" && (
        <Image
          source={{ uri: post.media_url }}
          style={{ width: "100%", height: 300 }}
        />
      )}

      <Text>{post.caption}</Text>

      <TouchableOpacity onPress={likePost}>
        <Text>❤️ Like</Text>
      </TouchableOpacity>

    </View>
  );
}