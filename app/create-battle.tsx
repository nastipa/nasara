import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function CreateBattle() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [compare, setCompare] = useState("");
  const [category, setCategory] = useState("");

  /* ================= BATTLE TYPE ================= */
  const [battleType, setBattleType] =
    useState<"public" | "institution">(
      "public"
    );

  const [institutionName, setInstitutionName] =
    useState("");

  const [institutionType, setInstitutionType] =
    useState("");

  const [allowedVoters, setAllowedVoters] =
    useState("");

  const [requireApproval, setRequireApproval] =
    useState(true);

  const [isPrivate, setIsPrivate] =
    useState(false);

  /* ================= DURATION ================= */
  const [durationValue, setDurationValue] =
    useState("");

  const [durationType, setDurationType] =
    useState("minutes");

  /* ================= PAYMENT ================= */
  const [paymentVisible, setPaymentVisible] =
    useState(false);

  const [paymentInfo, setPaymentInfo] =
    useState<any>(null);

  /* ================= LOADING ================= */
  const [loading, setLoading] =
    useState(false);

  /* ================= MOMO ================= */
  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  /* ================= CATEGORIES ================= */
  const categories = [
    "Music",
    "Auto & Vehicles",
    "Sports",
    "Food & Grocery",
    "Fashion",
    "Politics",
    "Electronics",
    "Education & Health",
  ];

  /* ================= DURATION ================= */
  function getDurationMs() {
    const value = Number(durationValue);

    if (isNaN(value) || value <= 0) {
      return null;
    }

    if (durationType === "minutes") {
      return value * 60000;
    }

    if (durationType === "hours") {
      return value * 3600000;
    }

    if (durationType === "days") {
      return value * 86400000;
    }

    return null;
  }

  /* ================= CREATE ================= */
const createBattle = async () => {
  if (loading) return;

  if (
    !title ||
    !compare ||
    !category ||
    !durationValue
  ) {
    Alert.alert(
      "Missing Fields",
      "Please fill all fields"
    );

    return;
  }

  if (
    battleType === "institution" &&
    !institutionName
  ) {
    Alert.alert(
      "Institution Required",
      "Enter institution name"
    );

    return;
  }

 let names = compare
  .split(/vs|VS|Vs|vS|,/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  names = [...new Set(names)];

  names = names.map(
    (n) =>
      n.charAt(0).toUpperCase() +
      n.slice(1).toLowerCase()
  );

  if (names.length < 2) {
  Alert.alert(
    "Invalid Battle",
    "Use format like:\nA vs B"
  );

  return;
}

/* ================= MAX 12 ================= */
if (names.length > 12) {
  Alert.alert(
    "Limit Reached",
    "Maximum 12 participants allowed"
  );

  return;
}
  const durationMs = getDurationMs();

  if (!durationMs) {
    Alert.alert(
      "Invalid Duration"
    );

    return;
  }

  const amount =
    battleType === "public"
      ? 500
      : 1000;

  try {
    setLoading(true);

    const { data: authData } =
      await supabase.auth.getUser();

    const user = authData?.user;

    if (!user) {
      Alert.alert(
        "Login Required"
      );

      setLoading(false);

      return;
    }

    const endTime = new Date(
      Date.now() + durationMs
    );

   /* ================= CLEAN NUMBERS ================= */

const cleanedNumbers =
  battleType === "institution"
    ? allowedVoters
        .split(/,|\n/)
        .map((v) =>
          v
            .replace(/\s/g, "")
            .trim()
        )
        .filter(
          (v) => v.length >= 8
        )
    : [];

    /* ================= CREATE BATTLE ================= */
    const { data, error } =
      await (supabase as any)
        .from("battles")
        .insert({
          title,

          compare_text: compare,

          category,

          end_time:
            endTime.toISOString(),

          creator_id: user.id,

          user_id: user.id,

          status: "pending",

          payment_status:
            "pending",

          approval_status:
            "pending",

          battle_type:
            battleType,

          institution_name:
            institutionName,

          institution_type:
            institutionType,

          allowed_voters:
            cleanedNumbers,

          require_voter_approval:
            requireApproval,

          is_private:
            isPrivate,

          total_votes: 0,

          is_boosted: false,
        })

        .select()

        .single();

    if (error || !data) {
      console.log(error);

      Alert.alert(
        "Error Creating Battle"
      );

      setLoading(false);

      return;
    }

    /* ================= INSERT INSTITUTION VOTERS ================= */

if (
  battleType === "institution" &&
  cleanedNumbers.length > 0
) {

  const voterPayload =
    cleanedNumbers.map(
      (phone) => ({
        battle_id: data.id,
        phone: phone,
        approved: true,
        has_voted: false,
      })
    );

  const {
    error: voterError,
  } = await (supabase as any)
    .from(
      "institution_voters"
    )
    .insert(voterPayload);

  if (voterError) {

    console.log(
      "Institution voter insert error:",
      voterError
    );

  } else {

    console.log(
      "Institution voters inserted successfully"
    );
  }
}

    /* ================= PAYMENT ================= */
    const paymentCode =
      "CREATE-" + Date.now();

    const {
      error: paymentError,
    } = await (supabase as any)
      .from(
        "battle_creation_payments"
      )
      .insert({
        battle_id: data.id,

        user_id: user.id,

        amount,

        momo_name: momoName,

        momo_number:
          momoNumber,

        network: momoNetwork,

        payment_code:
          paymentCode,

        status: "pending",
      });

    if (paymentError) {
      Alert.alert(
        "Payment Error",
        paymentError.message
      );

      setLoading(false);

      return;
    }

    /* ================= CANDIDATES ================= */
    const payload = names.map(
      (name) => ({
        battle_id: data.id,
        name,
        votes: 0,
      })
    );

    const {
      error: candidateError,
    } = await (supabase as any)
      .from("candidates")
      .insert(payload);

    if (candidateError) {
      Alert.alert(
        "Candidate Error",
        candidateError.message
      );

      setLoading(false);

      return;
    }

    setPaymentInfo({
      amount,
      paymentCode,
    });

    setPaymentVisible(true);

    setTitle("");

    setCompare("");

    setCategory("");

    setInstitutionName("");

    setInstitutionType("");

    setAllowedVoters("");

    setRequireApproval(true);

    setDurationValue("");

    setBattleType("public");

    setIsPrivate(false);

  } catch (err: any) {
    console.log(err);

    Alert.alert(
      "Error",
      err?.message ||
        "Something went wrong"
    );
  }

  setLoading(false);
};

  /* ================= UI ================= */
  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <View style={styles.box}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
          }}
        >
          ⚔️ Create Battle
        </Text>

        {/* ================= BATTLE TYPE ================= */}
        <Text
          style={{
            marginTop: 15,
            fontWeight: "bold",
          }}
        >
          Choose Battle Type
        </Text>

        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              setBattleType(
                "public"
              )
            }
            style={[
              styles.typeBtn,
              {
                backgroundColor:
                  battleType ===
                  "public"
                    ? "#16a34a"
                    : "#000",
              },
            ]}
          >
            <Text
              style={
                styles.typeText
              }
            >
              🌍 Public
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              setBattleType(
                "institution"
              )
            }
            style={[
              styles.typeBtn,
              {
                backgroundColor:
                  battleType ===
                  "institution"
                    ? "#2563eb"
                    : "#000",
              },
            ]}
          >
            <Text
              style={
                styles.typeText
              }
            >
              🏫 Institution
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= INSTITUTION ================= */}
        {battleType ===
          "institution" && (
          <>
            <TextInput
              placeholder="Institution Name"
              value={
                institutionName
              }
              onChangeText={
                setInstitutionName
              }
              style={styles.input}
            />

            <TextInput
              placeholder="Institution Type"
              value={
                institutionType
              }
              onChangeText={
                setInstitutionType
              }
              style={styles.input}
            />

            <Text
              style={{
                marginTop: 10,
                fontWeight:
                  "bold",
              }}
            >
              Allowed Voters
            </Text>

            <Text
              style={{
                color: "gray",
                marginTop: 5,
              }}
            >
             Enter one phone number per line.
Any country format allowed.
            </Text>

            <TextInput
              placeholder="0240000000
0551111111
0531111111
0201234567
+2348012345678"
              value={
                allowedVoters
              }
              onChangeText={
                setAllowedVoters
              }
              multiline
              style={[
                styles.input,
                {
                  height: 120,
                  textAlignVertical:
                    "top",
                },
              ]}
            />

            <View
              style={{
                flexDirection:
                  "row",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                Require Approval
              </Text>

              <Switch
                value={
                  requireApproval
                }
                onValueChange={
                  setRequireApproval
                }
              />
            </View>

            <View
              style={{
                backgroundColor:
                  "#f3f4f6",
                padding: 12,
                borderRadius: 10,
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  fontWeight:
                    "bold",
                }}
              >
                🛡️ Secure Institution
                Voting
              </Text>

              <Text
                style={{
                  marginTop: 5,
                }}
              >
                • Only approved
                phone numbers can
                vote
              </Text>

              <Text>
                • One phone = one
                vote
              </Text>

              <Text>
                • Outsiders blocked
              </Text>

              <Text>
                • No invite code
                sharing
              </Text>
            </View>
          </>
        )}

        {/* ================= PRIVATE ================= */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginTop: 10,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
            }}
          >
            🔒 Private Battle
          </Text>

          <Switch
            value={isPrivate}
            onValueChange={
              setIsPrivate
            }
          />
        </View>

        {/* ================= TITLE ================= */}
        <TextInput
          placeholder="Battle Title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        {/* ================= COMPARE ================= */}
        <TextInput
          placeholder="A vs B vs C..."
          value={compare}
          onChangeText={setCompare}
          style={styles.input}
          multiline
        />

        {/* ================= CATEGORY ================= */}
        <Text
          style={{
            fontWeight: "bold",
            marginTop: 10,
          }}
        >
          Select Category
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() =>
                setCategory(c)
              }
            >
              <Text
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      category === c
                        ? "#16a34a"
                        : "#000",
                  },
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= DURATION ================= */}
        <Text
          style={{
            marginTop: 15,
            fontWeight: "bold",
          }}
        >
          Duration
        </Text>

        <TextInput
          placeholder="Enter duration"
          value={durationValue}
          onChangeText={
            setDurationValue
          }
          keyboardType="numeric"
          style={styles.input}
        />

        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
          }}
        >
          {[
            "minutes",
            "hours",
            "days",
          ].map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() =>
                setDurationType(type)
              }
            >
              <Text
                style={[
                  styles.btn,
                  {
                    backgroundColor:
                      durationType ===
                      type
                        ? "orange"
                        : "#000",
                  },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ================= PRICE ================= */}
        <View
          style={{
            marginTop: 20,
            backgroundColor:
              "#f3f4f6",
            padding: 15,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            💳 Battle Creation Fee
          </Text>

          <Text
            style={{
              marginTop: 8,
            }}
          >
            {battleType === "public"
  ? "Public Battle: GH₵ 500"
  : "Institution Battle: GH₵ 1000"}
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: "gray",
            }}
          >
            Battle will appear
            after admin approval
            and payment
            verification.
          </Text>
        </View>

        {/* ================= CREATE ================= */}
        <TouchableOpacity
          disabled={loading}
          onPress={createBattle}
        >
          <Text
            style={[
              styles.createBtn,
              {
                backgroundColor:
                  loading
                    ? "gray"
                    : "#16a34a",
              },
            ]}
          >
            {loading
              ? "Creating..."
              : "🚀 Create Battle"}
          </Text>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator
            size="large"
            style={{
              marginTop: 10,
            }}
          />
        )}
      </View>

      {/* ================= PAYMENT MODAL ================= */}
      <Modal
        visible={paymentVisible}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              "#0007",
            justifyContent:
              "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor:
                "#fff",
              padding: 20,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              Complete Payment
            </Text>

            <Text
              style={{
                marginTop: 15,
              }}
            >
              Amount:
            </Text>

            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              GH₵{" "}
              {paymentInfo?.amount}
            </Text>

            <Text
              style={{
                marginTop: 15,
              }}
            >
              Pay To:
            </Text>

            <Text
              style={{
                fontWeight: "bold",
              }}
            >
              {momoName}
            </Text>

            <Text>
              {momoNumber} (
              {momoNetwork})
            </Text>

            <Text
              style={{
                marginTop: 15,
              }}
            >
              Payment Code:
            </Text>

            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              {
                paymentInfo?.paymentCode
              }
            </Text>

            <Text
              style={{
                marginTop: 15,
                color: "gray",
              }}
            >
              Your battle will
              appear after admin
              approval.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setPaymentVisible(
                  false
                );

                Alert.alert(
                  "Battle Created ✅",
                  "Pending admin approval after payment verification"
                );

                router.replace(
                  "/my-battle"
                );
              }}
              style={{
                backgroundColor:
                  "#16a34a",
                padding: 14,
                borderRadius: 8,
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  textAlign:
                    "center",
                  fontWeight:
                    "bold",
                }}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 30,
    alignItems: "center",
  },

  box: {
    width: "90%",
    gap: 10,
  },

  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },

  btn: {
    backgroundColor: "#000",
    color: "#fff",
    padding: 10,
    margin: 5,
    textAlign: "center",
    borderRadius: 8,
    overflow: "hidden",
  },

  typeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    marginRight: 5,
  },

  typeText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },

  createBtn: {
    color: "#fff",
    padding: 15,
    marginTop: 20,
    textAlign: "center",
    borderRadius: 10,
    fontWeight: "bold",
    fontSize: 16,
    overflow: "hidden",
  },
});