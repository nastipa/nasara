import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native"
import { supabase } from "../lib/supabase"

export default function SellerItems(){

const { userId } = useLocalSearchParams()

const [items,setItems] = useState<any[]>([])

useEffect(()=>{
loadItems()
},[])

async function loadItems(){

const { data,error } = await supabase
.from("items_live")
.select("id,title,price,image_url")
.eq("user_id",userId)

if(error){
console.log(error)
return
}

if(data){
setItems(data)
}

}

return(

<View style={styles.container}>

<Text style={styles.title}>
Seller Shop
</Text>

<FlatList
data={items}
keyExtractor={(item)=>item.id}
renderItem={({item})=>(

<Pressable style={styles.card}>

<Image
source={{ uri:item.image_url }}
style={styles.image}
/>

<View style={styles.info}>

<Text style={styles.name}>
{item.title}
</Text>

<Text style={styles.price}>
GH₵{item.price}
</Text>

</View>

</Pressable>

)}
/>

</View>

)

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#fff",
padding:15
},

title:{
fontSize:20,
fontWeight:"bold",
marginBottom:15
},

card:{
flexDirection:"row",
marginBottom:15,
backgroundColor:"#f8f8f8",
borderRadius:10,
overflow:"hidden"
},

image:{
width:90,
height:90
},

info:{
flex:1,
padding:10,
justifyContent:"center"
},

name:{
fontSize:16,
fontWeight:"600"
},

price:{
marginTop:5,
fontSize:15,
color:"#ff2d55",
fontWeight:"bold"
}

})