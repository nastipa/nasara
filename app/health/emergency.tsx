import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function EmergencyAssessment() {

  const [result, setResult] = useState("");

  const questions = [
    {
      title: "Are you having difficulty breathing?",
      emergency: true,
    },
    {
      title: "Are you having severe chest pain?",
      emergency: true,
    },
    {
      title: "Have you lost consciousness or fainted?",
      emergency: true,
    },
    {
      title: "Are you having severe bleeding?",
      emergency: true,
    },
    {
      title: "Are you confused, unable to speak, or having weakness on one side?",
      emergency: true,
    },
    {
      title: "Is the pain very severe or getting worse quickly?",
      emergency: true,
    },
    {
      title: "Is this an emergency involving a child, baby, or pregnant woman?",
      emergency: true,
    },
  ];


  const checkEmergency = (
    answers: boolean[]
  ) => {

    const danger =
      answers.some(
        item => item === true
      );


    if (danger) {
      setResult(
        "⚠️ This may require urgent medical attention.\n\nPlease visit the nearest hospital or call emergency services if available."
      );

      Alert.alert(
        "Emergency Warning",
        "Please seek urgent medical help."
      );

    } else {

      setResult(
        "✅ No immediate emergency signs detected.\n\nContinue monitoring your symptoms. If your condition gets worse, visit a healthcare professional."
      );

    }
  };
  const [answers, setAnswers] = useState<boolean[]>(
    Array(questions.length).fill(false)
  );


  const updateAnswer = (
    index: number,
    value: boolean
  ) => {

    const updated = [...answers];

    updated[index] = value;

    setAnswers(updated);

  };


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: 40,
      }}
    >

      <Text style={styles.title}>
        Emergency Assessment
      </Text>


      <Text style={styles.subtitle}>
        Answer these questions to check for warning signs.
      </Text>


      {questions.map(
        (item, index) => (

        <View
          key={index}
          style={styles.card}
        >

          <Text style={styles.question}>
            {item.title}
          </Text>


          <View style={styles.row}>

            <TouchableOpacity
              style={[
                styles.button,
                answers[index] === true &&
                styles.selectedYes
              ]}
              onPress={() =>
                updateAnswer(
                  index,
                  true
                )
              }
            >

              <Text style={styles.buttonText}>
                Yes
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={[
                styles.button,
                answers[index] === false &&
                styles.selectedNo
              ]}
              onPress={() =>
                updateAnswer(
                  index,
                  false
                )
              }
            >

              <Text style={styles.buttonText}>
                No
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      ))}


      <TouchableOpacity
        style={styles.checkButton}
        onPress={() =>
          checkEmergency(
            answers
          )
        }
      >

        <Text style={styles.checkText}>
          Check Assessment
        </Text>

      </TouchableOpacity>


      {result !== "" && (

        <View style={styles.resultCard}>

          <Text style={styles.resultText}>
            {result}
          </Text>

        </View>

      )}

    </ScrollView>
  );
}
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 20,
  },


  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },


  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
  },


  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },


  question: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 15,
  },


  row: {
    flexDirection: "row",
    gap: 12,
  },


  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
  },


  selectedYes: {
    backgroundColor: "#DC2626",
  },


  selectedNo: {
    backgroundColor: "#16A34A",
  },


  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },


  checkButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },


  checkText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },


  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
  },


  resultText: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
  },

});