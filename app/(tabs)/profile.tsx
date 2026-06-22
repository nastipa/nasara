import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import * as LocalAuthentication from "expo-local-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  registerForPushNotificationsAsync,
} from "../../lib/sendPush";

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
  const [inviteCode, setInviteCode] = useState("");
  const [coins, setCoins] = useState(0);
  const [boostCredits, setBoostCredits] = useState(0);
  const [invitesCount, setInvitesCount] = useState(0);
  const [verified, setVerified] = useState(false);
  /* ===== FOLLOW SYSTEM ===== */
const [followersCount, setFollowersCount] = useState(0);
const [followingCount, setFollowingCount] = useState(0);
const [isFollowing, setIsFollowing] = useState(false);
  const [mentorBadge, setMentorBadge] =
  useState(false);

const [menteeBadge, setMenteeBadge] =
  useState(false);
  const [showAdminModal, setShowAdminModal] =
  useState(false);

const [adminPassword, setAdminPassword] =
  useState("");

const [checkingAdmin, setCheckingAdmin] =
  useState(false);
  
  /* ================= ADMIN SECURITY ================= */

const adminSecurity = async () => {
  try {
    const compatible =
      await LocalAuthentication.hasHardwareAsync();

    const enrolled =
      await LocalAuthentication.isEnrolledAsync();

    // ✅ Face ID / Fingerprint
    if (compatible && enrolled) {
      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage:
            "Authenticate to open Admin Panel",
          fallbackLabel:
            "Use Password",
          disableDeviceFallback: false,
        });

      if (result.success) {
        router.push("/(admin)");
        return;
      }
    }

    // 🔐 fallback to password modal
    setShowAdminModal(true);

  } catch (e) {
    console.log(e);

    setShowAdminModal(true);
  }
};

const verifyAdminPassword = async () => {
  try {
    if (!adminPassword.trim()) {
      Alert.alert(
        "Enter admin password"
      );
      return;
    }

    setCheckingAdmin(true);

    const { data } =
      await supabase.auth.getUser();

    const email =
      data.user?.email;

    if (!email) {
      Alert.alert("Session expired");
      return;
    }

    // ✅ Re-login verification
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password: adminPassword,
      });

    if (error) {
      Alert.alert(
        "Wrong password"
      );
      return;
    }

    setShowAdminModal(false);
    setAdminPassword("");

    router.push("/(admin)");

  } catch (e) {
    console.log(e);

    Alert.alert(
      "Verification failed"
    );

  } finally {
    setCheckingAdmin(false);
  }
};


  /* ===== MOMO ===== */
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [showMomoModal, setShowMomoModal] = useState(false);

  /* ===== VERIFICATION STATUS ===== */
  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected" | "expired"
  >("none");

  /* ===== WHATSAPP ===== */
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  /* ===== ACTION MENU MODAL ===== */
  const [showActionsModal, setShowActionsModal] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isUtilityAdmin, setIsUtilityAdmin] =
  useState(false);
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
    checkUtilityAdmin(profileId);
    loadLiveSession(profileId);
    loadLiveStream(profileId);
    loadStats(profileId);
    loadEarnings(profileId);
    loadFollowStats(profileId);

  }

});

  }, []);
  
/* ================= PUSH NOTIFICATION ================= */
useEffect(() => {
  const saveToken = async () => {
    const token =
      await registerForPushNotificationsAsync();

    if (!token) return;

    const { data } =
      await supabase.auth.getUser();

    const user = data?.user;

    if (!user) return;

    await (supabase as any)
      .from("profiles")
      .update({
        push_token: token,
      })
      .eq("id", user.id);
  };

  saveToken();
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
      setCoins(profile.coins || 0);
      setBoostCredits(profile.boost_credits || 0);
      setInvitesCount(profile.invites_count || 0);
      setAvatarUrl(profile.avatar_url || null);
      setWhatsappNumber(profile.whatsapp_number || "");
      setMomoName(profile.momo_name || "");
      setMomoNumber(profile.momo_number || "");
      setMomoNetwork(profile.momo_network || "");
      
  /* ✅ ADD THIS */
  setInviteCode(profile.invite_code || "");

 /* ================= VERIFICATION ================= */

let status = profile?.verification_status || "none";
let isVerified = profile?.verified === true;

// 🔥 STEP 4: AUTO EXPIRY (ADD THIS ONLY)
if (profile?.verification_expires_at) {
  const now = new Date();
  const expiry = new Date(profile.verification_expires_at);

  if (now > expiry) {
    console.log("❌ Verification expired");

    await (supabase as any)
      .from("profiles")
      .update({
        verified: false,
        verification_status: "expired",
      })
      .eq("id", profile.id);

    status = "expired";
    isVerified = false;
  }
}

setVerificationStatus(status);
setVerified(isVerified);
setMentorBadge(
  profile.mentor_badge || false
);

setMenteeBadge(
  profile.mentee_badge || false
);
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
} else {
  setIsAdmin(false);
}
};
/* ================= UTILITY ADMIN CHECK ================= */
const checkUtilityAdmin = async (
  userId: string
) => {
  const { data, error } = await supabase
    .from("utility_admins")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("USER ID:", userId);
  console.log("UTILITY ADMIN:", data);
  console.log("UTILITY ERROR:", error);

  setIsUtilityAdmin(!!data);
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
  const { data, error } = await (supabase as any)
    .from("live_streams")
    .select("id, user_id, status, created_at")
    .eq("status", "live");

  if (error) {
    console.log("Live stream error:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    setLiveStreamId(null);
    return;
  }

  // ✅ Match SAME logic as Browse
  const userStream = data.find(
    (s: any) => s.user_id === userId
  );

  console.log("PROFILE STREAM FOUND:", userStream);

  setLiveStreamId(userStream?.id ?? null);
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
/* ================= FOLLOW STATS ================= */
const loadFollowStats = async (userId: string) => {
  try {
    /* FOLLOWERS */
    const { count: followers } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("following_id", userId);

    /* FOLLOWING */
    const { count: following } = await supabase
      .from("follows")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("follower_id", userId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    /* CHECK IF CURRENT USER FOLLOWS */
    const currentUserId =
      session?.user?.id;

    if (
      currentUserId &&
      userId &&
      currentUserId !== userId
    ) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq(
          "follower_id",
          currentUserId
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();

      setIsFollowing(!!data);
    }
  } catch (e) {
    console.log(
      "Follow stats error:",
      e
    );
  }
};
  /* ================= REFRESH ON FOCUS ================= */
 useFocusEffect(
  useCallback(() => {

    if (session) {

      const profileId = user ? String(user) : session.user.id;

      loadProfile(profileId);
      checkAdmin(profileId);
      checkUtilityAdmin(profileId);
      loadLiveSession(profileId);
      loadLiveStream(profileId);
      loadStats(profileId);
      loadEarnings(profileId);
      loadFollowStats(profileId);
    }

  }, [session, user])
);
 
  /* ================= FOLLOW USER ================= */
const followUser = async () => {
  try {
    const { data: sessionData } =
      await supabase.auth.getSession();

    const currentUser =
      sessionData.session?.user;

    if (!currentUser || !user)
      return;

    /* UNFOLLOW */
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          String(user)
        );

      setIsFollowing(false);
      setFollowersCount((p) =>
        Math.max(0, p - 1)
      );

      return;
    }

    /* FOLLOW */
    await (supabase as any)
      .from("follows")
      .insert({
        follower_id:
          currentUser.id,
        following_id:
          String(user),
      });

    setIsFollowing(true);
    setFollowersCount((p) => p + 1);

  } catch (e) {
    console.log(
      "Follow error:",
      e
    );
  }
};
/* ================= DELETE ACCOUNT ================= */
const handleDeleteAccount = async () => {
  try {
    const confirm =
      Platform.OS === "web"
        ? window.confirm("Are you sure you want to delete your account?")
        : await new Promise<boolean>((res) => {
            Alert.alert(
              "Delete Account",
              "This action is permanent. Continue?",
              [
                { text: "Cancel", onPress: () => res(false) },
                { text: "Delete", style: "destructive", onPress: () => res(true) },
              ]
            );
          });

    if (!confirm) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      Alert.alert("Error", "Not authenticated");
      return;
    }

    const res = await fetch(
      "https://nasara-upload-server.onrender.com/delete-account",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 🔥 SECURE
        },
      }
    );

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || "Delete failed");

    Alert.alert("Account deleted");

    // 🔥 LOG USER OUT
    await supabase.auth.signOut();

  } catch (e: any) {
    Alert.alert("Error", e.message || "Delete failed");
  }
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
  <SafeAreaView style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 140,
      }}
      showsVerticalScrollIndicator={false}
    >
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

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
  <Text style={styles.title}>{fullName || "Profile"}</Text>

  {verified && (
    <Text style={{ marginLeft: 6, fontSize: 18 }}>
      🔵
    </Text>
  )}
</View>
      <Text style={styles.email}>{session.user.email}</Text>
      {/* ===== MENTOR BADGE ===== */}
{mentorBadge && (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      Mentor
    </Text>
  </View>
)}

{/* ===== MENTEE BADGE ===== */}
{menteeBadge && (
  <View style={styles.badge2}>
    <Text style={styles.badgeText}>
      Mentee
    </Text>
  </View>
)}
     {/* ===== FOLLOW STATS ===== */}
<View
  style={{
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    gap: 30,
  }}
>
  {/* FOLLOWERS */}
  <TouchableOpacity
    onPress={() =>
      router.push(
        `/followers?id=${
          user
            ? String(user)
            : session.user.id
        }`
      )
    }
    style={{
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      {followersCount}
    </Text>

    <Text>Followers</Text>
  </TouchableOpacity>

  {/* FOLLOWING */}
  <TouchableOpacity
    onPress={() =>
      router.push(
        `/following?id=${
          user
            ? String(user)
            : session.user.id
        }`
      )
    }
    style={{
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      {followingCount}
    </Text>

    <Text>Following</Text>
  </TouchableOpacity>
</View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 15 }}>
  
  <View style={{ alignItems: "center" }}>
    <Text style={{ fontSize: 20 }}>🪙</Text>
    <Text style={{ fontWeight: "bold" }}>{coins}</Text>
    <Text>Coins</Text>
  </View>

  <View style={{ alignItems: "center" }}>
    <Text style={{ fontSize: 20 }}>⚡</Text>
    <Text style={{ fontWeight: "bold" }}>{boostCredits}</Text>
    <Text>Boost</Text>
  </View>

  <View style={{ alignItems: "center" }}>
    <Text style={{ fontSize: 20 }}>👥</Text>
    <Text style={{ fontWeight: "bold" }}>{invitesCount}</Text>
    <Text>Invites</Text>
  </View>

</View>
      {/* ===== INVITE CODE ===== */}
<View
  style={{
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 14,
  }}
>
  <Text style={{ fontWeight: "700" }}>Your Invite Code</Text>

  <Text
    style={{
      marginTop: 6,
      fontSize: 16,
      color: "#2563eb",
      fontWeight: "bold",
    }}
  >
    {inviteCode || "Not generated"}
  </Text>
</View>
<TouchableOpacity
  onPress={() =>
    Share.share({
      message: `Join Nasara 🚀 using my invite code: ${inviteCode}\nhttps://nasara1.vercel.app`,
    })
  }
  style={{
    marginBottom: 14,
    backgroundColor: "#16a34a",
    padding: 10,
    borderRadius: 8,
  }}
>
  <Text style={{ color: "white", textAlign: "center" }}>
    Share Invite
  </Text>
</TouchableOpacity>
     
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

<Text
  style={{
    color: "white",
    fontWeight: "bold",
  }}
>
  {isFollowing
    ? "Unfollow"
    : "Follow"}
</Text>

</TouchableOpacity>

)}
<TouchableOpacity
  onPress={() => router.push("/get-verified")}
  style={{
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  }}
>
  <Text
    style={{
      color: "#fff",
      textAlign: "center",
      fontWeight: "600",
    }}
  >
    Apply for Verification
  </Text>
</TouchableOpacity>
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
          label="Favorites ❤️"
          bg="#0ea5e9"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/favorite");
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
          label="Offers 💌"
          bg="#f59e0b"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/offers"); // app/offers/index
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
    label="My Mentors"
    bg="#2563eb"
    onPress={() => {
      setShowActionsModal(false);

      router.push("/mentor/my-mentor");
    }}
  />

        <ActionTile
    label="My Mentees"
    bg="#16a34a"
    onPress={() => {
      setShowActionsModal(false);

      router.push(
        "/mentor/my-mentees"
      );
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
          label="My Auctions 🔥"
          bg="#f59e0b"
          onPress={() => {
            setShowActionsModal(false);
            router.push("/auctions"); // app/auction/index
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

    setTimeout(() => {
      adminSecurity();
    }, 300);
  }}
/>
          </View>
        </>
      )}
      {isUtilityAdmin && (
  <>
    <Text style={styles.sectionTitle}>
      ⚡ Utilities
    </Text>

    <View style={{ flexDirection: "row" }}>
      <ActionTile
        label="Utilities Admin"
        bg="#0f172a"
        onPress={() => {
          setShowActionsModal(false);

          router.push(
            "/(utilities-admin)"
          );
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
<View style={{ marginTop: 40, paddingHorizontal: 20 }}>

</View>
  {/* ===== ADMIN SECURITY MODAL ===== */}

<Modal
  visible={showAdminModal}
  transparent
  animationType="slide"
>
  <View style={styles.modalWrap}>
    <View style={styles.modal}>

      <Text style={styles.modalTitle}>
        Admin Verification
      </Text>

      <TextInput
        placeholder="Enter admin password"
        secureTextEntry
        value={adminPassword}
        onChangeText={setAdminPassword}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={verifyAdminPassword}
        style={{
          backgroundColor: "#111827",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          {checkingAdmin
            ? "Checking..."
            : "Verify"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 10 }} />

      <TouchableOpacity
        onPress={() =>
          setShowAdminModal(false)
        }
        style={{
          backgroundColor: "#9ca3af",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "bold",
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>

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
    </ScrollView>
  </SafeAreaView>
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
  linkItem: {
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#222",
},

linkText: {
  color: "white",
  fontSize: 16,
},

deleteBtn: {
  marginTop: 30,
  backgroundColor: "#ff3b30",
  padding: 15,
  alignItems: "center",
  borderRadius: 8,
},

deleteText: {
  color: "white",
  fontWeight: "bold",
},
badge: {
  backgroundColor: "#2563eb",

  paddingHorizontal: 10,

  paddingVertical: 5,

  borderRadius: 20,

  alignSelf: "center",

  marginBottom: 8,
},

badge2: {
  backgroundColor: "#16a34a",

  paddingHorizontal: 10,

  paddingVertical: 5,

  borderRadius: 20,

  alignSelf: "center",

  marginBottom: 8,
},

badgeText: {
  color: "#fff",

  fontWeight: "bold",

  fontSize: 12,
},
  
});