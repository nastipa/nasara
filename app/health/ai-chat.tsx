import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "difficulty breathing",
  "stroke",
  "seizure",
  "passed out",
  "unconscious",
  "heavy bleeding",
  "heart attack",
];

const KNOWLEDGE = [
  {
    keywords: [
      "fever",
      "temperature",
      "hot body",
    ],
    reply:
      "A fever is often caused by an infection. Drink plenty of fluids, rest, and monitor your temperature. If the fever is very high, lasts more than two days, or is accompanied by severe symptoms, visit a hospital.",
  },

  {
    keywords: [
      "headache",
      "migraine",
    ],
    reply:
      "Headaches can result from stress, dehydration, poor sleep, or illness. Drink water, rest in a quiet place, and consider an appropriate over-the-counter pain reliever if suitable. Seek medical attention if the headache is sudden, severe, or follows a head injury.",
  },

  {
    keywords: [
      "cough",
      "cold",
      "flu",
    ],
    reply:
      "A cough is commonly associated with viral infections, allergies, or irritation. Stay hydrated and monitor your symptoms. If you develop difficulty breathing, chest pain, or a persistent high fever, seek medical care.",
  },

  {
    keywords: [
      "stomach",
      "abdominal",
      "diarrhea",
      "vomiting",
    ],
    reply:
      "Drink plenty of fluids to prevent dehydration and eat light foods if you can tolerate them. If vomiting or diarrhea is severe, contains blood, or continues for an extended period, visit a hospital.",
  },

  {
    keywords: [
      "pregnant",
      "pregnancy",
    ],
    reply:
      "During pregnancy, regular antenatal care is important. If you experience severe abdominal pain, heavy bleeding, severe headache, reduced baby movement, or fluid leaking, seek emergency medical care immediately.",
  },
  {
  keywords: [
    "weak",
    "tired",
    "fatigue",
    "dizzy",
    "dizziness",
  ],
  reply:
    "Feeling weak or dizzy can happen due to dehydration, lack of sleep, low blood sugar, infection, or other conditions. Drink enough fluids and rest. If dizziness is severe, you faint, have chest pain, or difficulty breathing, seek medical care.",
},

{
  keywords: [
    "body pain",
    "body ache",
    "joint pain",
    "back pain",
    "waist pain",
  ],
  reply:
    "Body or muscle pain can come from infections, stress, physical activity, or other causes. Rest, drink fluids, and monitor your symptoms. If the pain is severe, persistent, or comes with fever or weakness, visit a healthcare professional.",
},

{
  keywords: [
    "sore throat",
    "throat pain",
  ],
  reply:
    "A sore throat can be caused by infections or irritation. Drink warm fluids and rest your voice. If you have difficulty swallowing, breathing problems, or a high fever, seek medical attention.",
},

{
  keywords: [
    "child",
    "baby",
    "infant",
    "kid",
  ],
  reply:
    "Children can become sick quickly. Please provide the child's age, symptoms, how long it has lasted, and whether they are eating and drinking normally. Seek urgent care if the child has breathing difficulty, seizures, extreme weakness, or dehydration.",
},
];

type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  emergency?: boolean;
};
export default function AIChatScreen() {
  const router = useRouter();

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
  useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text:
        "👋 Welcome to Nasara AI Health Assistant.\n\nDescribe your symptoms in detail. I'll provide general health guidance and tell you when you should visit a hospital.",
    },
  ]);

  const quickQuestions = useMemo(
    () => [
      "I have a fever",
      "I have a headache",
      "I have chest pain",
      "I am coughing",
      "I am pregnant",
      "I have stomach pain",
    ],
    []
  );
  const getAIResponse = (
    question: string
  ) => {
    const text =
      question.toLowerCase().trim();

    const emergency =
      EMERGENCY_KEYWORDS.some(word =>
        text.includes(word)
      );

    if (emergency) {
      return {
        emergency: true,
        reply:
          "🚨 Your symptoms may indicate a medical emergency.\n\nPlease go to the nearest hospital or emergency department immediately.\n\nDo not rely only on this chat if your symptoms are severe.",
      };
    }

    for (const item of KNOWLEDGE) {
      const found =
        item.keywords.some(keyword =>
          text.includes(keyword)
        );

      if (found) {
        return {
          emergency: false,
          reply: item.reply,
        };
      }
    }
    const getFollowUpQuestion = (
  question: string
) => {

  const text =
    question.toLowerCase();

  if (
    text.includes("fever") ||
    text.includes("temperature")
  ) {
    return [
      "How many days have you had the fever?",
      "Do you have body pain, cough, headache, or chills?",
      "Have you checked your temperature?",
    ];
  }


  if (
    text.includes("stomach") ||
    text.includes("abdominal")
  ) {
    return [
      "Where exactly is the stomach pain?",
      "Do you have vomiting or diarrhea?",
      "Is the pain mild, moderate, or severe?",
    ];
  }


  if (
    text.includes("pregnant") ||
    text.includes("pregnancy")
  ) {
    return [
      "How many weeks pregnant are you?",
      "Have you started antenatal care?",
      "Do you have bleeding or severe pain?",
    ];
  }


  return [];
};

    return {
  emergency: false,
  reply:
    "I would like to understand your symptoms better so I can guide you.\n\nPlease provide more details.",
};
  };
  const getFollowUpQuestion = (text: string): string[] => {
  const msg = text.toLowerCase();

  if (msg.includes("fever")) {
    return [
      "How high is your fever and how long have you had it?",
      "Do you have headache, body pain, or chills?",
    ];
  }

  if (
    msg.includes("pain") ||
    msg.includes("stomach") ||
    msg.includes("chest")
  ) {
    return [
      "Where is the pain located?",
      "Is the pain mild, moderate, or severe?",
    ];
  }

  if (msg.includes("cough")) {
    return [
      "Do you have a dry cough or cough with mucus?",
      "How many days has the cough lasted?",
    ];
  }

  if (msg.includes("pregnant") || msg.includes("pregnancy")) {
    return [
      "How many weeks pregnant are you?",
      "Are you experiencing bleeding or severe pain?",
    ];
  }

  return [
    "Please describe your symptoms.",
    "When did they start?",
    "How old are you?",
  ];
};

  const sendMessage = async (
    text?: string
  ) => {

    const question =
      text ?? input;

    if (!question.trim()) return;

    const userMessage: ChatMessage = {
  id: Date.now().toString(),
  sender: "user",
  text: question,
};

    setMessages(prev => [
      ...prev,
      userMessage,
    ]);

    setInput("");

    setLoading(true);

    await new Promise(resolve =>
      setTimeout(resolve, 800)
    );

    const result =
  getAIResponse(question);

const followUps =
  getFollowUpQuestion(question);


let finalReply = result.reply;


if (followUps.length > 0) {
  finalReply +=
    "\n\nTo help me understand better:\n\n" +
    followUps
      .map(
        (item: any, index: any) =>
          `${index + 1}. ${item}`
      )
      .join("\n");
}
    const aiMessage: ChatMessage = {
  id: (Date.now() + 1).toString(),
  sender: "ai",
  text: finalReply,
  emergency: result.emergency,
};

setMessages(prev => [
  ...prev,
  aiMessage,
]);

    setLoading(false);
  };
  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.sender === "user"
                ? styles.userBubble
                : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.sender === "user"
                  ? styles.userText
                  : styles.aiText,
              ]}
            >
              {item.text}
            </Text>

            {item.sender === "ai" &&
              item.emergency && (
                <TouchableOpacity
                  style={styles.hospitalButton}
                  onPress={() =>
                    router.push(
                      "/health/hospitals"
                    )
                  }
                >
                  <Ionicons
                    name="medical"
                    size={18}
                    color="#fff"
                  />

                  <Text
                    style={styles.hospitalButtonText}
                  >
                    Book Hospital Queue
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        )}
      />

      {loading && (
        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator />

          <Text
            style={styles.loadingText}
          >
            AI is thinking...
          </Text>
        </View>
      )}

      <View style={styles.quickContainer}>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={quickQuestions}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() =>
                sendMessage(item)
              }
            >
              <Text
                style={styles.quickButtonText}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

      </View>

      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.inputRow}>

          <TextInput
            style={styles.input}
            placeholder="Describe your symptoms..."
            multiline
            value={input}
            onChangeText={setInput}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={() =>
              sendMessage()
            }
          >
            <Ionicons
              name="send"
              size={22}
              color="#fff"
            />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },

  messageBubble: {
    maxWidth: "85%",
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },

  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },

  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
  },

  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },

  userText: {
    color: "#FFFFFF",
  },

  aiText: {
    color: "#111827",
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },

  loadingText: {
    marginLeft: 10,
    color: "#6B7280",
    fontSize: 15,
  },

  quickContainer: {
    paddingVertical: 10,
    paddingLeft: 12,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  quickButton: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },

  quickButtonText: {
    color: "#2563EB",
    fontWeight: "600",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },

  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  hospitalButton: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 12,
  },

  hospitalButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 8,
  },
});