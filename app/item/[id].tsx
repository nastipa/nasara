import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function ItemPage(){

const { id } = useLocalSearchParams<{ id:string }>();

return(

<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>

<Text>Item Page</Text>

<Text>Item ID: {id}</Text>

</View>

);

}