import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

/* ===== ACTION TILE ===== */
const ActionTile = ({
  label,
  onPress,
  bg,
  disabled,
}: {
  label: string;
  onPress: () => void;
  bg: string;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    disabled={disabled}
    onPress={onPress}
    style={{
      flex: 1,
      backgroundColor: disabled ? "#9ca3af" : bg,
      paddingVertical: 18,
      margin: 6,
      borderRadius: 12,
      alignItems: "center",
    }}
  >
    <Text style={{ color: "white", fontWeight: "600" }}>{label}</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useLocalSearchParams();

  const [session, setSession] = useState<Session | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  /* ===== MOMO ===== */
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [showMomoModal, setShowMomoModal] = useState(false);

  /* ===== VERIFICATION STATUS ===== */
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected"
  >("none");

  /* ===== WHATSAPP ===== */
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  /* ===== ACTION MENU MODAL ===== */
  const [showActionsModal, setShowActionsModal] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<number | null>(null);

  /* 🔴 VIDEO LIVE STREAM ID */
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  // ===== BATTLE SYSTEM =====
const [xp, setXp] = useState(0);
const [level, setLevel] = useState(1);
const [streak, setStreak] = useState(0);
const [earnings, setEarnings] = useState(0);

  /* ================= LOAD SESSION ================= */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {

  setSession(data.session);

  if (data.session) {

    const profileId = user ? String(user) : data.session.user.id;

    loadProfile(profileId);
    checkAdmin(profileId);
    loadLiveSession(profileId);
    loadLiveStream(profileId);
    loadStats(profileId);
    loadEarnings(profileId);

  }

});
  }, []);

  /* ================= LOAD PROFILE ================= */
  const loadProfile = async (userId: string) => {
    const { data: profile, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
  console.log("Profile load error:", error.message);

  if (error?.message?.includes("JWT expired")) {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
    return;
  }

  return;
}
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setLocation(profile.location || "");
      setAvatarUrl(profile.avatar_url || null);
      setWhatsappNumber(profile.whatsapp_number || "");
      setMomoName(profile.momo_name || "");
      setMomoNumber(profile.momo_number || "");
      setMomoNetwork(profile.momo_network || "");

      /* PHONE VERIFICATION */
     /* VERIFICATION STATUS (FIXED) */
setVerificationStatus(
  profile?.verification_status || "none"
);
    }
  };

 /* ================= ADMIN CHECK ================= */
const checkAdmin = async (userId: string) => {
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
if (error) {
  console.log("Admin check error:", error.message);

  if (error?.message?.includes("JWT expired")) {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
    return;
  }

  return;
}
  if (data?.is_admin === true) {
    setIsAdmin(true);
    setVerificationStatus("approved");
  } else {
    setIsAdmin(false);
  }
};
  /* ================= LIVE SESSION ================= */
  const loadLiveSession = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("live_sessions")
      .select("id")
      .eq("seller_id", userId)
      .eq("is_live", true)
      .single();

    setLiveSessionId(data?.id ?? null);
  };

  /* ================= LIVE STREAM ================= */
  const loadLiveStream = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("live_streams")
      .select("id")
      .eq("seller_id", userId)
      .eq("status", "live")
      .maybeSingle();

    setLiveStreamId(data?.id ?? null);
  };
  // ===== LOAD USER STATS =====
const loadStats = async (userId: string) => {
  const { data } = await (supabase as any)
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    setXp(data.xp || 0);
    setLevel(data.level || 1);
    setStreak(data.streak_count || 0);
  }
};

// ===== LOAD EARNINGS =====
const loadEarnings = async (userId: string) => {
  const { data } = await (supabase as any)
    .from("battle_payments")
    .select("amount")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (data) {
    const total = data.reduce(
  (sum: number, p: { amount: number }) => sum + Number(p.amount),
  0
);
    setEarnings(total);
  }
};

  /* ================= REFRESH ON FOCUS ================= */
 useFocusEffect(
  useCallback(() => {

    if (session) {

      const profileId = user ? String(user) : session.user.id;

      loadProfile(profileId);
      checkAdmin(profileId);
      loadLiveSession(profileId);
      loadLiveStream(profileId);
      loadStats(profileId);
      loadEarnings(profileId);
    }

  }, [session, user])
);

  /* ================= LOGOUT ================= */
  const followUser = async () => {

const { data:sessionData } = await supabase.auth.getSession();

const currentUser = sessionData.session?.user;

if(!currentUser || !user) return;

await (supabase as any)
.from("follows")
.insert({
follower_id:currentUser.id,
following_id:String(user)
});

Alert.alert("Followed");

};
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/browse");
        },
      },
    ]);
  };

  /* ===== SAVE WHATSAPP ===== */
  const saveWhatsappNumber = async () => {
    if (!session) return;

    if (!whatsappNumber.trim()) {
      Alert.alert("Error", "Enter WhatsApp number");
      return;
    }

    const clean = whatsappNumber.replace(/\s+/g, "").replace("+", "");

    const { error } = await (supabase as any)
      .from("profiles")
      .update({ whatsapp_number: clean })
      .eq("id", session.user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setShowWhatsappModal(false);
    await loadProfile(session.user.id);
  };

  /* ===== SAVE MOMO ===== */
  const saveMomoAccount = async () => {
    if (!session) return;

    if (!momoName || !momoNumber || !momoNetwork) {
      Alert.alert("Error", "Please fill all MoMo fields");
      return;
    }

    const cleanNumber = momoNumber.replace(/\s+/g, "");

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        momo_name: momoName,
        momo_number: cleanNumber,
        momo_network: momoNetwork,
      })
      .eq("id", session.user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setShowMomoModal(false);
    await loadProfile(session.user.id);
  };

  /* ===== OPEN WHATSAPP ===== */
  const openWhatsApp = async () => {
    if (!whatsappNumber) return;
    await Linking.openURL("https://wa.me/" + whatsappNumber);
  };

  if (!session) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.push("/profile/edit")}>
        <Image
          source={{
            uri:
              avatarUrl ??
              "https://ui-avatars.com/api/?background=ccc&size=200",
          }}
          style={styles.avatar}
        />
        <Text style={styles.editText}>Edit Profile</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{fullName || "Profile"}</Text>
      <Text style={styles.email}>{session.user.email}</Text>
     
      {session && user && user !== session.user.id && (

<TouchableOpacity
style={{
backgroundColor:"#2563eb",
padding:12,
borderRadius:8,
marginBottom:12,
alignItems:"center"
}}
onPress={followUser}
>

<Text style={{color:"white",fontWeight:"bold"}}>
Follow
</Text>

</TouchableOpacity>

)}

      {/* ===== VERIFICATION STATUS ===== */}
      <View style={styles.statusBox}>
        <Text style={{ fontWeight: "700" }}>Verification Status:</Text>

        <Text
          style={{
            marginTop: 4,
            fontWeight: "700",
            color:
              verificationStatus === "approved"
                ? "green"
                : verificationStatus === "pending"
                ? "orange"
                : verificationStatus === "rejected"
                ? "red"
                : "#555",
          }}
        >
          {verificationStatus.toUpperCase()}
        </Text>

        {verificationStatus === "none" && !isAdmin && (
          <TouchableOpacity
            style={{
              marginTop: 8,
              backgroundColor: "#2563eb",
              padding: 10,
              borderRadius: 8,
            }}
            onPress={() => router.push("/verify-phone")}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              Verify Phone
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput value={phone} editable={false} style={styles.input} />
      <TextInput value={location} editable={false} style={styles.input} />

      {/* ===== ACTION BUTTON ===== */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowActionsModal(true)}
      >
        <Text style={styles.actionButtonText}>⚡ Open Profile Actions</Text>
      </TouchableOpacity>

   {/* ================= ACTIONS MODAL ================= */}
<Modal visible={showActionsModal} transparent animationType="slide">
  <View style={styles.modalWrap}>
    <View style={styles.modal}>
      <Text style={styles.modalTitle}>Profile Actions</Text>

      {/* ===== ACCOUNT ===== */}
      <Text style={styles.sectionTitle}>👤 Account</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <ActionTile
          label="WhatsApp"
          bg="#22c55e"
          onPress={() => {
            setShowActionsModal(false);
            setShowWhatsappModal(true);
          }}
        />

        <ActionTile
          label="MoMo 💳"
          bg="#0ea5e9"
          onPress={() => {
            setShowActionsModal(false);
            setTimeout(() => setShowMomoModal(true), 200);
          }}
        />
        <ActionTile
          label="Battle ⚔️"
          bg="#f59e0b"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/battle"); // app/auction/index
          }}
        />
      </View>

      {/* ===== ACTIVITY ===== */}
      <Text style={styles.sectionTitle}>📊 Activity</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <ActionTile
          label="My Page"
          bg="#22c55e"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/my-page");
          }}
        />
        

        <ActionTile
          label="Favorites ❤️"
          bg="#0ea5e9"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/favorite");
          }}
        />

        <ActionTile
          label="Offers 💌"
          bg="#f59e0b"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/offers"); // app/offers/index
          }}
        />
      </View>

      {/* ===== WATCH & AUCTIONS ===== */}
      <Text style={styles.sectionTitle}>🎥 Watch & Auctions</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <ActionTile
          label="Watch Live"
          bg="#22c55e"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/live");
          }}
        />

        <ActionTile
          label="Watch Video 📺"
         bg="#0ea5e9"
          onPress={() => {
            setShowActionsModal(false);
            if (liveStreamId) {
              router.push(`/watch-video/${liveStreamId}`);
            }
          }}
        />

        <ActionTile
          label="My Auctions 🔥"
          bg="#f59e0b"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/auctions"); // app/auction/index
          }}
        />
 
      </View>

      {/* ===== ADMIN ===== */}
      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>🛠 Admin</Text>
          <View style={{ flexDirection: "row" }}>
            <ActionTile
              label="Admin Panel"
              bg="#111827"
              onPress={() => {
                setShowActionsModal(false);
                router.push("/(admin)");
              }}
            />
          </View>
        </>
      )}

      <View style={{ marginTop: 12 }} />
      <Button
        title="Close"
        color="#6b7280"
        onPress={() => setShowActionsModal(false)}
      />
    </View>
  </View>
</Modal>
<TouchableOpacity
  onPress={() =>
    Linking.openURL("https://nasara-six.vercel.app/privacy")
  }
>
  <Text style={{ color: "blue", marginTop: 10 }}>
    Privacy Policy
  </Text>
</TouchableOpacity>
      {/* ===== WHATSAPP MODAL ===== */}
      <Modal visible={showWhatsappModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>WhatsApp Number</Text>

            <TextInput
              placeholder="WhatsApp Number"
              keyboardType="phone-pad"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              style={styles.input}
            />

            <Button title="Save" onPress={saveWhatsappNumber} />

            <View style={{ height: 8 }} />

            <Button
              title="Cancel"
              color="#6b7280"
              onPress={() => setShowWhatsappModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MOMO MODAL ===== */}
      <Modal visible={showMomoModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>MoMo Account Details</Text>

            <TextInput
              placeholder="MoMo Account Name"
              value={momoName}
              onChangeText={setMomoName}
              style={styles.input}
            />

            <TextInput
              placeholder="MoMo Number"
              keyboardType="phone-pad"
              value={momoNumber}
              onChangeText={setMomoNumber}
              style={styles.input}
            />

            <TextInput
              placeholder="Network (MTN / Vodafone / Telecel)"
              value={momoNetwork}
              onChangeText={setMomoNetwork}
              style={styles.input}
            />

            <Button title="Save" onPress={saveMomoAccount} />

            <View style={{ height: 8 }} />

            <Button
              title="Cancel"
              color="#6b7280"
              onPress={() => setShowMomoModal(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ===== STYLES ===== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  title: { fontSize: 22, fontWeight: "600", marginBottom: 6 },
  email: { marginBottom: 12, color: "#555" },

  statusBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 6,
  },

  editText: {
    textAlign: "center",
    color: "#2563eb",
    marginBottom: 12,
  },

  actionButton: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },

  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
    },
    sectionTitle: {
  fontWeight: "700",
  marginTop: 12,
  marginBottom: 6,
  fontSize: 14,
  color: "#374151",
  },
  iconBox: {
  width: "25%", // 4 per row
  alignItems: "center",
  marginBottom: 20,
},
iconText: {
  fontSize: 28,

  },
});