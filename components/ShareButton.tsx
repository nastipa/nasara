import { Ionicons } from "@expo/vector-icons"
import { Share, StyleSheet, Text, TouchableOpacity } from "react-native"

export default function ShareButton({ url }: { url:string }){

  async function shareVideo(){

    await Share.share({
      message:url
    })

  }

  return(

    <TouchableOpacity onPress={shareVideo} style={styles.container}>

      <Ionicons name="arrow-redo-outline" size={30} color="white"/>

      <Text style={styles.text}>Share</Text>

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