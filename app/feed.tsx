import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "../lib/supabase";

const { height } = Dimensions.get("window");

export default function Feed(){

const router = useRouter();

const [posts,setPosts] = useState<any[]>([]);
const [activeIndex,setActiveIndex] = useState(0);

const players = useRef<any[]>([]);

useEffect(()=>{
loadFeed();
},[]);

async function loadFeed(){

const { data } = await supabase
.from("posts")
.select("*")
.eq("media_type","video")
.order("created_at",{ascending:false});

if(data) setPosts(data);

}

const viewConfig = useRef({
itemVisiblePercentThreshold:80
});

const onViewRef = useRef(({viewableItems}:any)=>{

if(viewableItems.length>0){

const index = viewableItems[0].index;

setActiveIndex(index);

players.current.forEach((player,i)=>{

if(player){

if(i===index){
player.play();
}else{
player.pause();
}

}

});

}

});

function VideoItem({item,index}:any){

const player = useVideoPlayer(item.media_url);

useEffect(()=>{
players.current[index] = player;
},[player]);

return(

<View style={{height}}>

<VideoView
player={player}
style={styles.video}
contentFit="cover"
nativeControls={false}
/>

<View style={styles.actions}>

<TouchableOpacity
onPress={()=>router.push(`/profile?user=${item.user_id}`)}
style={styles.button}
> 
<Text style={styles.icon}>👤</Text>
</TouchableOpacity>

<TouchableOpacity
onPress={()=>router.push(`/item/${item.product_id}`)}
style={styles.button}
> 
<Text style={styles.icon}>🛒</Text>
</TouchableOpacity>

</View>

</View>

);

}

return(

<View style={{flex:1,backgroundColor:"black"}}>

<FlatList
data={posts}
pagingEnabled
snapToInterval={height}
decelerationRate="fast"
keyExtractor={(item)=>item.id.toString()}
showsVerticalScrollIndicator={false}
onViewableItemsChanged={onViewRef.current}
viewabilityConfig={viewConfig.current}

renderItem={({item,index})=>(
<VideoItem item={item} index={index} />
)}
/>

</View>

);

}

const styles = StyleSheet.create({

video:{
width:"100%",
height:"100%"
},

actions:{
position:"absolute",
right:20,
bottom:140
},

button:{
marginBottom:25
},

icon:{
fontSize:32,
color:"white"
}

});