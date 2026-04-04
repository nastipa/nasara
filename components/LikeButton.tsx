import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { supabase } from "../lib/supabase"

export default function LikeButton({ postId }: { postId: string }) {

const [liked,setLiked] = useState(false)
const [count,setCount] = useState(0)

useEffect(()=>{
loadLikes()
},[])

async function loadLikes(){

const { data:userData } = await supabase.auth.getUser()
const userId = userData.user?.id

const { count } = await supabase
.from("likes")
.select("*",{count:"exact",head:true})
.eq("post_id",postId)

setCount(count || 0)

if(userId){

const { data } = await supabase
.from("likes")
.select("id")
.eq("post_id",postId)
.eq("user_id",userId)
.maybeSingle()

if(data){
setLiked(true)
}

}

}

async function toggleLike(){

const { data:userData } = await supabase.auth.getUser()
const userId = userData.user?.id

if(!userId) return

if(liked){

await supabase
.from("likes")
.delete()
.eq("post_id",postId)
.eq("user_id",userId)

setLiked(false)
setCount(c=>c-1)

}else{

await (supabase as any)
.from("likes")
.insert({
post_id:postId,
user_id:userId
})

setLiked(true)
setCount(c=>c+1)

}

}

return(

<Pressable onPress={toggleLike}>

<View style={{alignItems:"center"}}>

<Ionicons
name={liked ? "heart" : "heart-outline"}
size={28}
color={liked ? "red" : "white"}
/>

<Text style={{color:"white",fontSize:12}}>
{count}
</Text>

</View>

</Pressable>

)

}