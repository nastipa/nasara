import { useEffect, useState } from "react"
import { StyleSheet, Text, TouchableOpacity } from "react-native"
import { supabase } from "../lib/supabase"

export default function FollowButton({ userId }: { userId: string }) {

const [following,setFollowing] = useState(false)
const [myId,setMyId] = useState<string | null>(null)

useEffect(()=>{
loadUser()
},[])

useEffect(()=>{
if(myId && userId){
checkFollow()
}
},[userId,myId])

async function loadUser(){

const { data } = await supabase.auth.getUser()
setMyId(data.user?.id ?? null)

}

async function checkFollow(){

if(!myId) return

const { data } = await supabase
.from("follows")
.select("id")
.eq("follower_id",myId)
.eq("following_id",userId)
.maybeSingle()

setFollowing(!!data)

}

async function toggleFollow(){

if(!myId) return

if(following){

await supabase
.from("follows")
.delete()
.eq("follower_id",myId)
.eq("following_id",userId)

setFollowing(false)

}else{

await (supabase as any)
.from("follows")
.insert({
follower_id:myId,
following_id:userId
})

setFollowing(true)

}

}

return(

<TouchableOpacity
onPress={toggleFollow}
style={[styles.button, following && styles.following]}
>

<Text style={styles.text}>
{following ? "Following" : "Follow"}
</Text>

</TouchableOpacity>

)

}

const styles = StyleSheet.create({

button:{
backgroundColor:"#ff2d55",
paddingHorizontal:12,
paddingVertical:6,
borderRadius:20
},

following:{
backgroundColor:"#555"
},

text:{
color:"white",
fontWeight:"bold"
}

})