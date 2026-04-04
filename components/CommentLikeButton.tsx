import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { supabase } from "../lib/supabase"

export default function CommentLikeButton({ commentId }: { commentId:string }) {

const [liked,setLiked] = useState(false)
const [count,setCount] = useState(0)

useEffect(()=>{
loadLikes()
},[commentId])

async function loadLikes(){

const { data:{ user } } = await supabase.auth.getUser()

const { count } = await supabase
.from("comment_likes")
.select("*",{count:"exact",head:true})
.eq("comment_id",commentId)

setCount(count ?? 0)

if(user){

const { data } = await supabase
.from("comment_likes")
.select("id")
.eq("comment_id",commentId)
.eq("user_id",user.id)
.maybeSingle()

setLiked(!!data)

}

}

async function toggleLike(){

const { data:{ user } } = await supabase.auth.getUser()

if(!user) return

if(liked){

await supabase
.from("comment_likes")
.delete()
.eq("comment_id",commentId)
.eq("user_id",user.id)

}else{

await (supabase as any)
.from("comment_likes")
.insert({
comment_id:commentId,
user_id:user.id
})

}

await loadLikes()

}

return(

<TouchableOpacity onPress={toggleLike}>

<View style={{flexDirection:"row",alignItems:"center",gap:4}}>

<Ionicons
name={liked ? "heart" : "heart-outline"}
size={18}
color={liked ? "red" : "gray"}
/>

<Text style={{color:"white"}}>
{count}
</Text>

</View>

</TouchableOpacity>

)

}