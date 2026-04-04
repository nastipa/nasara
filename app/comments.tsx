import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

import CommentLikeButton from "../components/CommentLikeButton";
import { supabase } from "../lib/supabase";

type Comment = {
id: string
post_id: string
user_id: string
text: string
parent_id: string | null
created_at: string
}

export default function CommentsPage(){

const router = useRouter()
const { postId } = useLocalSearchParams()

const [comments,setComments] = useState<Comment[]>([])
const [message,setMessage] = useState("")
const [replyTo,setReplyTo] = useState<string | null>(null)

useEffect(()=>{

if(!postId) return

loadComments()

const channel = supabase
.channel("comments-live")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"comments",
filter:`post_id=eq.${postId}`
},
(payload)=>{
const newComment = payload.new as Comment
setComments(prev=>[...prev,newComment])
}
)
.subscribe()

return ()=>{
supabase.removeChannel(channel)
}

},[postId])

async function loadComments(){

const { data,error } = await supabase
.from("comments")
.select("*")
.eq("post_id",postId)
.order("created_at",{ascending:true})

if(!error && data){
setComments(data)
}

}

async function sendComment(){

if(!message.trim()) return

const text = message

setMessage("")
setReplyTo(null)

const { data:userData } = await supabase.auth.getUser()
const userId = userData.user?.id

if(!userId || !postId) return

const { error } = await (supabase as any)
.from("comments")
.insert({
post_id:postId,
user_id:userId,
text:text,
parent_id:replyTo
})

if(error){
console.log("COMMENT ERROR",error)
}

}

async function deleteComment(commentId:string){

const { error } = await supabase
.from("comments")
.delete()
.eq("id",commentId)

if(error){
console.log("DELETE ERROR",error)
return
}

setComments(prev=>prev.filter(c=>c.id !== commentId))

}



const rootComments = comments.filter(c=>!c.parent_id)

const getReplies = (id:string)=>{
return comments.filter(c=>c.parent_id === id)
}

const renderComment = (item:Comment)=>{

const replies = getReplies(item.id)

return(

<View>

<View style={styles.comment}>

<Text style={styles.text}>{item.text}</Text>

<View style={styles.actions}>

<TouchableOpacity onPress={()=>setReplyTo(item.id)}>
<Text style={styles.reply}>Reply</Text>
</TouchableOpacity>

<CommentLikeButton commentId={item.id} />

<TouchableOpacity onPress={()=>deleteComment(item.id)}>
<Text style={styles.delete}>Delete</Text>
</TouchableOpacity>

</View>

</View>

{replies.map(reply=>(

<View key={reply.id} style={styles.replyBox}>
<Text style={styles.text}>{reply.text}</Text>
</View>

))}

</View>

)

}

return(

<TouchableWithoutFeedback onPress={()=>router.back()}>

<View style={styles.overlay}>

<TouchableWithoutFeedback>

<KeyboardAvoidingView
behavior={Platform.OS==="ios"?"padding":undefined}
style={styles.sheet}
>

<Text style={styles.title}>Comments</Text>

<FlatList
data={rootComments}
keyExtractor={(item)=>item.id}
renderItem={({item})=>renderComment(item)}
ListEmptyComponent={
<Text style={styles.empty}>No comments yet</Text>
}
style={{flex:1}}
/>

{replyTo && (
<Text style={styles.replying}>Replying to comment</Text>
)}

<View style={styles.inputRow}>

<TextInput
placeholder="Add a comment..."
value={message}
onChangeText={setMessage}
style={styles.input}
/>

<TouchableOpacity
onPress={sendComment}
style={styles.sendButton}
>

<Text style={styles.sendText}>Send</Text>

</TouchableOpacity>

</View>

</KeyboardAvoidingView>

</TouchableWithoutFeedback>

</View>

</TouchableWithoutFeedback>

)

}

const styles = StyleSheet.create({

overlay:{
flex:1,
backgroundColor:"rgba(0,0,0,0.4)",
justifyContent:"flex-end"
},

sheet:{
height:"80%",
backgroundColor:"#fff",
borderTopLeftRadius:20,
borderTopRightRadius:20,
padding:16
},

title:{
fontSize:16,
fontWeight:"600",
marginBottom:10,
textAlign:"center"
},

comment:{
padding:10,
backgroundColor:"#f2f2f2",
borderRadius:8,
marginBottom:6
},

replyBox:{
marginLeft:20,
padding:8,
backgroundColor:"#e8e8e8",
borderRadius:6,
marginBottom:6
},

text:{
fontSize:14
},

actions:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:5
},

reply:{
color:"#007AFF"
},

delete:{
color:"red"
},

replying:{
color:"#888",
marginBottom:5
},

empty:{
textAlign:"center",
marginTop:40,
color:"#888"
},

inputRow:{
flexDirection:"row",
alignItems:"center",
paddingVertical:6,
borderTopWidth:1,
borderColor:"#ddd"
},

input:{
flex:1,
height:36,
backgroundColor:"#f2f2f2",
borderRadius:18,
paddingHorizontal:12
},

sendButton:{
marginLeft:8,
paddingHorizontal:10
},

sendText:{
color:"#007AFF",
fontWeight:"600"
}

})