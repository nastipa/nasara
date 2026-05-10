import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { Image } from "react-native";
import { supabase } from "../lib/supabase";

export default function BattleRoom() {

  const { id, phone } =
    useLocalSearchParams();

  const [battle, setBattle] =
    useState<any>(null);

  const [candidates, setCandidates] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [voting, setVoting] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState(
      typeof phone === "string"
        ? phone
        : ""
    );

  const [otpCode, setOtpCode] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [showVotePurchase, setShowVotePurchase] =
    useState(false);

  const [purchaseCandidateId, setPurchaseCandidateId] =
    useState("");

  const [votesToBuy, setVotesToBuy] =
    useState("");

  /* ================= DEVICE ================= */

  async function getDeviceFingerprint() {

    const saved =
      await AsyncStorage.getItem(
        "device_install_id"
      );

    if (saved) {
      return saved;
    }

    const generated =
      `${Device.brand}_${Device.modelName}_${Device.osName}_${Date.now()}`;

    await AsyncStorage.setItem(
      "device_install_id",
      generated
    );

    return generated;
  }

  /* ================= LOAD BATTLE ================= */

  async function loadBattle() {

    if (!id) return;

    const { data } =
      await (supabase as any)
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

    if (data) {
      setBattle(data);
    }
  }

  /* ================= LOAD CANDIDATES ================= */

  async function loadCandidates() {

    if (!id) return;

    const { data } =
      await (supabase as any)
        .from("candidates")
        .select("*")
        .eq("battle_id", id)
        .order("votes", {
          ascending: false,
        });

    setCandidates(data || []);
  }

  /* ================= LOAD ================= */

  async function load() {

    try {

      setLoading(true);

      await Promise.all([
        loadBattle(),
        loadCandidates(),
      ]);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);
    }
  }

  /* ================= INITIAL ================= */

  useEffect(() => {
    load();
  }, [id]);

  /* ================= REALTIME ================= */

  useEffect(() => {

    if (!id) return;

    const channel =
      (supabase as any)
        .channel(`battle-room-${id}`)

        .on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "candidates",
    filter: `battle_id=eq.${id}`,
  },
  (payload: any) => {

    const updated = payload.new;

    setCandidates((prev) => {

      const next = prev.map((c) =>
        c.id === updated.id
          ? updated
          : c
      );

      next.sort(
        (a, b) =>
          (b.votes || 0) -
          (a.votes || 0)
      );

      return [...next];
    });
  }
)

        .subscribe();

    return () => {
      (supabase as any)
        .removeChannel(channel);
    };

  }, [id]);

  

  /* ================= TIMER ================= */

  useEffect(() => {

    if (!battle?.end_time)
      return;

    const interval =
      setInterval(() => {

        const diff =
          new Date(
            battle.end_time
          ).getTime() -
          Date.now();

        if (diff <= 0) {

          setTimeLeft("⛔ Ended");

          clearInterval(interval);

          return;
        }

        const days =
          Math.floor(
            diff / 86400000
          );

        const hours =
          Math.floor(
            (diff %
              86400000) /
              3600000
          );

        const mins =
          Math.floor(
            (diff %
              3600000) /
              60000
          );

        const secs =
          Math.floor(
            (diff %
              60000) / 1000
          );

        if (days > 0) {

          setTimeLeft(
            `${days}d ${hours}h ${mins}m`
          );

        } else if (
          hours > 0
        ) {

          setTimeLeft(
            `${hours}h ${mins}m ${secs}s`
          );

        } else {

          setTimeLeft(
            `${mins}m ${secs}s`
          );
        }

      }, 1000);

    return () =>
      clearInterval(interval);

  }, [battle]);

  /* ================= HELPERS ================= */

  function cleanPhoneValue(
    value: string
  ) {

    return value
      .replace(/\s/g, "")
      .replace(/\-/g, "")
      .trim();
  }

  const totalVotes =
    useMemo(() => {

      return candidates.reduce(
        (sum, c) =>
          sum +
          Number(c.votes || 0),
        0
      );

    }, [candidates]);

  const percent = (
    votes: number
  ) => {

    if (!totalVotes)
      return 0;

    return Math.round(
      (votes / totalVotes) * 100
    );
  };

  function isEnded() {

    if (!battle?.end_time)
      return false;

    return (
      Date.now() >
      new Date(
        battle.end_time
      ).getTime()
    );
  }

  /* ================= SEND OTP ================= */

  async function sendOtp() {

    if (!phoneNumber) {

      Alert.alert(
        "Phone Required",
        "Enter your verified Nasara phone number"
      );

      return;
    }

    const cleanPhone =
      cleanPhoneValue(
        phoneNumber
      );

    /* ================= CURRENT USER ================= */

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !authData?.user
    ) {

      Alert.alert(
        "Login Required",
        "Please login first"
      );

      return;
    }

    const currentUser =
      authData.user;

    /* ================= PROFILE ================= */

    const {
      data: profile,
      error: profileError,
    } =
      await (supabase as any)
        .from("profiles")
        .select("phone")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (
      profileError ||
      !profile
    ) {

      Alert.alert(
        "Profile Error",
        "Could not load your profile"
      );

      return;
    }

    const profilePhone =
      cleanPhoneValue(
        profile.phone || ""
      );

    /* ================= SECURITY CHECK ================= */

    if (
      profilePhone !== cleanPhone
    ) {

      Alert.alert(
        "Phone Mismatch",
        "This phone number does not match the one on your Nasara profile."
      );

      return;
    }

    /* ================= APPROVED VOTER ================= */

    const {
      data: voter,
      error: voterError,
    } =
      await (supabase as any)
        .from(
          "institution_voters"
        )
        .select("*")
        .eq("battle_id", id)
        .eq("phone", cleanPhone)
        .maybeSingle();

    if (
      voterError ||
      !voter
    ) {

      Alert.alert(
        "Access Denied",
        "This number is not approved for this institution voting."
      );

      return;
    }

    /* ================= ALREADY VOTED ================= */

   if (voter.has_voted === true) {

  setOtpSent(false);

  setOtpCode("");

  setPhoneNumber("");

  await (supabase as any)
    .from("institution_otps")
    .delete()
    .eq("battle_id", id)
    .eq("phone", cleanPhone);

  Alert.alert(
    "Already Voted",
    "You already used your vote in this battle."
  );

  return;
}
    /* ================= CREATE OTP ================= */

    const otp =
      Math.floor(
        100000 +
        Math.random() * 900000
      ).toString();

    /* ================= DELETE OLD OTP ================= */

    await (supabase as any)
      .from("institution_otps")
      .delete()
      .eq("battle_id", id)
      .eq("phone", cleanPhone);

    /* ================= SAVE OTP ================= */

    const {
      error: otpError,
    } =
      await (supabase as any)
        .from("institution_otps")
        .insert({
          battle_id: id,
          phone: cleanPhone,
          otp,
          expires_at:
            new Date(
              Date.now() + 300000
            ).toISOString(),
          used: false,
        });

    if (otpError) {

      Alert.alert(
        "OTP Error",
        otpError.message
      );

      return;
    }

    setOtpSent(true);
     /* ================= SHOW OTP ON SCREEN ================= */

setOtpCode(otp);

setOtpSent(true);

setTimeout(() => {

  Alert.alert(
    "OTP Sent Successfully",
    `Your OTP Code is:\n\n${otp}\n\nThis code expires in 5 minutes.`
  );

}, 300);


    /* ================= WEB FALLBACK ================= */

    if (Platform.OS === "web") {

      Alert.alert(
        "OTP Code",
        `Your OTP is ${otp}`
      );

    } else {

      Alert.alert(
        "OTP Sent",
        "OTP sent successfully."
      );
    }
  }
 
  /* ================= PAYMENT ================= */

  async function createExtraVotePayment() {

    try {

      const totalVotesToBuy =
        Number(votesToBuy);

      if (
        isNaN(totalVotesToBuy) ||
        totalVotesToBuy <= 0
      ) {

        Alert.alert(
          "Invalid Votes"
        );

        return;
      }

      const amount =
        totalVotesToBuy * 5;

      const reference =
        `PAY-${Date.now()}`;

      const {
        data: authData,
      } =
        await supabase.auth.getUser();

      const user =
        authData?.user;

      const { error } =
        await (supabase as any)
          .from("battle_payments")
          .insert({
            user_id:
              user?.id || null,
            battle_id: id,
            candidate_id:
              purchaseCandidateId,
            amount,
            votes:
              totalVotesToBuy,
            remaining_votes:
              totalVotesToBuy,
            status: "pending",
            reference,
            momo_name:
              "NASARA MARKET",
            momo_number:
              "0539703374",
            network: "MTN",
            code: reference,
          });

      if (error) {

        Alert.alert(
          "Payment Error",
          error.message
        );

        return;
      }

      setShowVotePurchase(false);

      setVotesToBuy("");

      if (Platform.OS === "web") {

  window.alert(
    `PAYMENT REQUIRED

Amount: GH₵${amount}

NASARA MARKET
0539703374 (MTN)

Reference:
${reference}

After admin approval your extra votes will activate automatically.`
  );

} else {

  Alert.alert(
    "Payment Required",
    `Pay GH₵${amount}

NASARA MARKET
0539703374 (MTN)

Reference:
${reference}

After admin approval your extra votes will activate automatically.`
  );
}

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Payment Error",
        err?.message
      );
    }
  }

  /* ================= VOTE ================= */

  async function vote(
    candidateId: string
  ) {

    if (voting) return;

    try {

      setVoting(true);

      if (isEnded()) {

        Alert.alert(
          "Battle Ended"
        );

        setVoting(false);

        return;
      }

      const fingerprint =
        await getDeviceFingerprint();

      let cleanPhone = "";

      /* ===================================================== */
      /* ================= INSTITUTION ======================= */
      /* ===================================================== */

      if (
        battle?.battle_type ===
        "institution"
      ) {

        if (!phoneNumber) {

          Alert.alert(
            "Phone Required"
          );

          setVoting(false);

          return;
        }

        if (!otpCode) {

          Alert.alert(
            "OTP Required"
          );

          setVoting(false);

          return;
        }

        cleanPhone =
          cleanPhoneValue(
            phoneNumber
          );

        const {
          data: voter,
        } =
          await (supabase as any)
            .from(
              "institution_voters"
            )
            .select("*")
            .eq(
              "battle_id",
              id
            )
            .eq(
              "phone",
              cleanPhone
            )
            .maybeSingle();
       

        if (!voter) {

          Alert.alert(
            "Access Denied",
            "Phone number not approved"
          );

          setVoting(false);

          return;
        }

       if (voter.has_voted) {

  setOtpSent(false);

  setOtpCode("");

  Alert.alert(
    "Already Voted",
    "You have already voted in this battle."
  );

  return;
}

        const {
          data: otpData,
        } =
          await (supabase as any)
            .from(
              "institution_otps"
            )
            .select("*")
            .eq(
              "battle_id",
              id
            )
            .eq(
              "phone",
              cleanPhone
            )
            .eq(
              "otp",
              otpCode
            )
            .eq(
              "used",
              false
            )
            .gt(
              "expires_at",
              new Date().toISOString()
            )
            .maybeSingle();

        if (!otpData) {

          Alert.alert(
            "Invalid OTP"
          );

          setVoting(false);

          return;
        }

        await (supabase as any)
          .from("institution_otps")
          .update({
            used: true,
          })
          .eq("id", otpData.id);
      }

      /* ===================================================== */
      /* ================= PUBLIC ============================ */
      /* ===================================================== */

      if (
        battle?.battle_type ===
        "public"
      ) {

        const publicVoteKey =
          `public_vote_${id}`;

        const alreadyVoted =
          await AsyncStorage.getItem(
            publicVoteKey
          );

        if (!alreadyVoted) {

          await AsyncStorage.setItem(
            publicVoteKey,
            "true"
          );

        } else {

          const {
            data: authData,
          } =
            await supabase.auth.getUser();

          const user =
            authData?.user;

          const {
            data: approvedPayment,
          } =
            await (supabase as any)
              .from(
                "battle_payments"
              )
              .select("*")
              .eq(
                "battle_id",
                id
              )
              .eq(
                "user_id",
                user?.id
              )
              .eq(
                "status",
                "approved"
              )
              .gt(
                "remaining_votes",
                0
              )
              .order(
                "created_at",
                {
                  ascending: true,
                }
              )
              .maybeSingle();

          if (!approvedPayment) {

            setPurchaseCandidateId(
              candidateId
            );

            setShowVotePurchase(
              true
            );

            setVoting(false);

            return;
          }

          await (supabase as any)
            .from(
              "battle_payments"
            )
            .update({
              remaining_votes:
                Number(
                  approvedPayment.remaining_votes
                ) - 1,
            })
            .eq(
              "id",
              approvedPayment.id
            );
        }
      }

      /* ===================================================== */
      /* ================= SAVE VOTE ========================= */
      /* ===================================================== */

      const {
        error: voteError,
      } =
        await (supabase as any)
          .from("votes")
          .insert({
            battle_id: id,
            candidate_id:
              candidateId,
            phone:
              cleanPhone ||
              fingerprint,
            vote_count: 1,
            status:
              "approved",
          });

      if (voteError) {

        Alert.alert(
          "Vote Error",
          voteError.message
        );

        setVoting(false);

        return;
      }

      /* ===================================================== */
      /* ================= INCREMENT ========================= */
      /* ===================================================== */

      const {
        error: incrementError,
      } =
        await (supabase as any)
          .rpc(
            "increment_vote",
            {
              candidate_id_input:
                candidateId,
              amount: 1,
            }
          );

      if (incrementError) {

        Alert.alert(
          "Vote Error",
          incrementError.message
        );

        setVoting(false);

        return;
      }

      /* ===================================================== */
      /* ================= UPDATE INSTITUTION ================ */
      /* ===================================================== */

      if (
        battle?.battle_type ===
        "institution"
      ) {

       await (supabase as any)
  .from(
    "institution_voters"
  )
  .update({
    has_voted: true,
    voted_at:
      new Date().toISOString(),
    device_id:
      fingerprint,
  })
  .eq(
    "battle_id",
    id
  )
  .eq(
    "phone",
    cleanPhone);

/* ================= DELETE OTP ================= */

await (supabase as any)
  .from(
    "institution_otps"
  )
  .delete()
  .eq(
    "battle_id",
    id
  )
  .eq(
    "phone",
    cleanPhone);

/* ================= FORCE UI LOCK ================= */

setOtpSent(false);

setOtpCode("");

setPhoneNumber("VOTED");

/* ================= FORCE REFRESH ================= */

await load();

/* ================= SUCCESS ================= */

Alert.alert(
  "Vote Submitted",
  "You already used your vote."
);

setVoting(false);

return;
      }

      await loadCandidates();

      if (
        battle?.battle_type !==
        "institution"
      ) {

        Alert.alert(
          "Success",
          "Vote submitted successfully"
        );
      }

    } catch (err: any) {

      console.log(err);

      Alert.alert(
        "Error",
        err?.message ||
          "Something went wrong"
      );
    }

    setVoting(false);
  }

  /* ================= LOADING ================= */

  if (loading) {

    return (
      <ActivityIndicator
        style={{
          flex: 1,
        }}
        size="large"
      />
    );
  }

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >

      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
        }}
      >
        {battle?.title}
      </Text>

      <Text
        style={{
          marginTop: 8,
        }}
      >
        {battle?.compare_text}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontWeight: "bold",
          color: "#ea580c",
        }}
      >
        ⏱️ {timeLeft}
      </Text>

      <Text
        style={{
          marginTop: 15,
          fontWeight: "bold",
        }}
      >
        Total Votes:
        {" "}
        {Number(
          totalVotes || 0
        ).toLocaleString()}
      </Text>

      {battle?.battle_type ===
  "institution" &&
  !isEnded() && (

        <>

          <TextInput
            placeholder="Enter approved phone number"
            value={phoneNumber}
            onChangeText={
              setPhoneNumber
            }
            keyboardType="phone-pad"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 10,
              marginTop: 15,
            }}
          />
{otpSent && (

  <>

    <View
      style={{
        backgroundColor: "#eff6ff",
        borderWidth: 1,
        borderColor: "#2563eb",
        padding: 14,
        borderRadius: 10,
        marginTop: 10,
      }}
    >

      <Text
        style={{
          color: "#1d4ed8",
          fontWeight: "bold",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        OTP CODE: {otpCode}
      </Text>

      <Text
        style={{
          color: "#1e40af",
          textAlign: "center",
          marginTop: 5,
          fontSize: 12,
        }}
      >
        This OTP expires in 5 minutes
      </Text>

    </View>

    <TextInput
      placeholder="Enter OTP"
      value={otpCode}
      onChangeText={
        setOtpCode
      }
      keyboardType="numeric"
      style={{
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 12,
        borderRadius: 10,
        marginTop: 10,
      }}
    />

  </>
)}

          {!otpSent &&
 phoneNumber !== "VOTED" && (

            <TouchableOpacity
              onPress={sendOtp}
              style={{
                backgroundColor:
                  "#2563eb",
                padding: 12,
                borderRadius: 8,
                marginTop: 10,
              }}
            >

              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                Send OTP
              </Text>

            </TouchableOpacity>
          )}
        
        </>
      )}

      <FlatList
        data={candidates}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
          />
        }
        contentContainerStyle={{
          paddingTop: 15,
          paddingBottom: 120,
        }}
        renderItem={({
          item,
          index,
        }) => (

          <View
            style={{
              marginBottom: 20,
              padding: 15,
              borderWidth: 1,
              borderRadius: 12,
              borderColor:
                index === 0
                  ? "#facc15"
                  : "#ddd",
              backgroundColor:
                index === 0
                  ? "#fffbeb"
                  : "#fff",
            }}
          >
{item.image_url ? (

  <Image
    source={{
      uri: item.image_url,
    }}
    style={{
      width: 70,
      height: 70,
      borderRadius: 35,
      alignSelf: "center",
      marginBottom: 10,
    }}
  />

) : null}
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              {index === 0
                ? "👑 "
                : ""}
              {item.name}
            </Text>

            <Text
              style={{
                marginTop: 5,
              }}
            >
              {Number(
                item.votes || 0
              ).toLocaleString()}
              {" "}
              votes (
              {percent(
                item.votes || 0
              )}
              %)
            </Text>

            <TouchableOpacity
              disabled={
  voting ||
  isEnded() ||
  phoneNumber === "VOTED"
}
              onPress={() =>
                vote(item.id)
              }
              style={{
                backgroundColor:
                  voting ||
                  isEnded()
                    ? "gray"
                    : "#000",
                padding: 12,
                marginTop: 12,
                borderRadius: 8,
              }}
            >

              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {isEnded()
                  ? "Battle Ended"
                  : voting
                  ? "Voting..."
                  : "Vote"}
              </Text>

            </TouchableOpacity>

          </View>
        )}
      />

      {showVotePurchase && (

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 20,
          }}
        >

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
            }}
          >

            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Buy Extra Votes
            </Text>

            <TextInput
              placeholder="Enter votes"
              keyboardType="numeric"
              value={votesToBuy}
              onChangeText={
                setVotesToBuy
              }
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 8,
                padding: 12,
                marginTop: 15,
              }}
            />

            <TouchableOpacity
              onPress={
                createExtraVotePayment
              }
              style={{
                backgroundColor:
                  "#16a34a",
                padding: 14,
                borderRadius: 8,
                marginTop: 15,
              }}
            >

              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                Continue Payment
              </Text>

            </TouchableOpacity>

          </View>

        </View>
      )}

    </View>
  );
}