import { Dimensions, StyleSheet, View } from "react-native";

const width = Dimensions.get("window").width;

/* 🔥 Fake waveform bars (fast & smooth) */
export default function Waveform({ progress }: { progress:number }){

  const bars = new Array(60).fill(0);

  return (
    <View style={styles.container}>
      {bars.map((_,i)=>{

        const height = Math.random() * 40 + 10;

        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height,
                opacity: i < progress * bars.length ? 1 : 0.3
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flexDirection:"row",
    alignItems:"flex-end",
    justifyContent:"space-between",
    width:"100%",
    height:60
  },
  bar:{
    width:3,
    backgroundColor:"#fff",
    borderRadius:2
  }
});