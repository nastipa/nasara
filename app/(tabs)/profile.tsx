/* =========================================================
   🟢 NASARA PREMIUM PROFILE
   🔵 Modern Social Marketplace Profile Interface
   🟣 Navy, Gold and White Design
   ========================================================= */

import { useFocusEffect } from "@react-navigation/native";
import { Session } from "@supabase/supabase-js";
import * as LocalAuthentication from "expo-local-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Image,
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

import EnableBrowserNotifications from "../../components/EnableBrowserNotifications";
import { supabase } from "../../lib/supabase";

/* =========================================================
   🟢 COLOUR SYSTEM
   ========================================================= */

const COLORS = {
  navy: "#101B35",
  navyLight: "#1C2B4A",
  gold: "#D6A83F",
  goldLight: "#F9F1DC",
  white: "#FFFFFF",
  background: "#F4F6FA",
  text: "#18233B",
  muted: "#788196",
  border: "#E5E9F0",
  green: "#16A36A",
  blue: "#2875D9",
  red: "#DC4545",
};

/* =========================================================
   🔵 ACTION TILE
   ========================================================= */

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
    activeOpacity={0.8}
    onPress={onPress}
    style={[
      styles.actionTile,
      {
        backgroundColor: disabled ? "#9CA3AF" : bg,
      },
    ]}
  >
    <Text style={styles.actionTileText}>{label}</Text>
  </TouchableOpacity>
);

/* =========================================================
   🟣 STAT CARD
   ========================================================= */

const StatCard = ({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>

    <Text style={styles.statValue}>
      {Number(value || 0).toLocaleString()}
    </Text>

    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* =========================================================
   🟢 PROFILE SCREEN
   ========================================================= */

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useLocalSearchParams();

  /* =======================================================
     🔵 SESSION
     ======================================================= */

  const [session, setSession] = useState<Session | null>(null);

  /* =======================================================
     🟣 PROFILE INFORMATION
     ======================================================= */

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState("");

  const [coins, setCoins] = useState(0);
  const [boostCredits, setBoostCredits] = useState(0);
  const [invitesCount, setInvitesCount] = useState(0);

  const [verified, setVerified] = useState(false);

  /* =======================================================
     🟢 FOLLOW SYSTEM
     ======================================================= */

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  /* =======================================================
     🔵 MENTOR BADGES
     ======================================================= */

  const [mentorBadge, setMentorBadge] = useState(false);
  const [menteeBadge, setMenteeBadge] = useState(false);

  /* =======================================================
     🟣 ADMIN SECURITY
     ======================================================= */

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isHospitalAdmin, setIsHospitalAdmin] = useState(false);

  /* =======================================================
     🟢 RESTAURANT OWNER
     ======================================================= */

  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantOwnerLoading, setRestaurantOwnerLoading] = useState(false);

  /* =======================================================
     🔵 MOMO
     ======================================================= */

  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [showMomoModal, setShowMomoModal] = useState(false);

  /* =======================================================
     🟣 VERIFICATION STATUS
     ======================================================= */

  const [verificationStatus, setVerificationStatus] = useState<
    "none" | "pending" | "approved" | "rejected" | "expired"
  >("none");

  /* =======================================================
     🟢 ACTION MENU
     ======================================================= */

  const [showActionsModal, setShowActionsModal] = useState(false);

  /* =======================================================
     🔵 LIVE INFORMATION
     ======================================================= */

  const [liveSessionId, setLiveSessionId] = useState<number | null>(null);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);

  /* =======================================================
     🟣 BATTLE STATISTICS
     ======================================================= */

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [earnings, setEarnings] = useState(0);

  /* =======================================================
     🔵 ADMIN SECURITY
     ======================================================= */

  const adminSecurity = async () => {
    try {
      const compatible =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      if (compatible && enrolled) {
        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to open Admin Panel",
            fallbackLabel: "Use Password",
            disableDeviceFallback: false,
          });

        if (result.success) {
          router.push("/(admin)");
          return;
        }
      }

      setShowAdminModal(true);
    } catch (e) {
      console.log(e);
      setShowAdminModal(true);
    }
  };

  /* =======================================================
     🟣 VERIFY ADMIN PASSWORD
     ======================================================= */

  const verifyAdminPassword = async () => {
    try {
      if (!adminPassword.trim()) {
        Alert.alert("Enter admin password");
        return;
      }

      setCheckingAdmin(true);

      const { data } = await supabase.auth.getUser();

      const email = data.user?.email;

      if (!email) {
        Alert.alert("Session expired");
        return;
      }

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password: adminPassword,
        });

      if (error) {
        Alert.alert("Wrong password");
        return;
      }

      setShowAdminModal(false);
      setAdminPassword("");

      router.push("/(admin)");
    } catch (e) {
      console.log(e);
      Alert.alert("Verification failed");
    } finally {
      setCheckingAdmin(false);
    }
  };

  /* =======================================================
     🟢 LOAD SESSION
     ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (data.session) {
        const profileId = user
          ? String(user)
          : data.session.user.id;

        loadProfile(profileId);
        checkAdmin(profileId);
        checkHospitalAdmin(profileId);
        checkRestaurantOwner(profileId);
        loadLiveSession(profileId);
        loadLiveStream(profileId);
        loadStats(profileId);
        loadEarnings(profileId);
        loadFollowStats(profileId);
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     🔵 PUSH NOTIFICATIONS
     ======================================================= */

  useEffect(() => {
    const saveToken = async () => {
      const token =
        await registerForPushNotificationsAsync();

      if (!token) return;

      const { data } = await supabase.auth.getUser();

      const currentUser = data?.user;

      if (!currentUser) return;

      await (supabase as any)
        .from("profiles")
        .update({
          push_token: token,
        })
        .eq("id", currentUser.id);
    };

    saveToken();
  }, []);

  /* =======================================================
     🟣 LOAD PROFILE
     ======================================================= */

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

      setMomoName(profile.momo_name || "");
      setMomoNumber(profile.momo_number || "");
      setMomoNetwork(profile.momo_network || "");

      setInviteCode(profile.invite_code || "");

      /* ===============================================
         🟢 VERIFICATION
         =============================================== */

      let status = profile?.verification_status || "none";
      let isVerified = profile?.verified === true;

      if (profile?.verification_expires_at) {
        const now = new Date();
        const expiry = new Date(profile.verification_expires_at);

        if (now > expiry) {
          console.log("Verification expired");

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

      setMentorBadge(profile.mentor_badge || false);
      setMenteeBadge(profile.mentee_badge || false);
    }
  };

  /* =======================================================
     🔵 ADMIN CHECK
     ======================================================= */

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

    setIsAdmin(data?.is_admin === true);
  };

  /* =======================================================
     🟣 HOSPITAL ADMIN CHECK
     ======================================================= */

  const checkHospitalAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from("hospital_admins")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.log("Hospital admin check error:", error.message);
    }

    setIsHospitalAdmin(!!data);
  };

  /* =======================================================
     🟢 RESTAURANT OWNER CHECK
     ======================================================= */

  const checkRestaurantOwner = async (userId: string) => {
    try {
      setRestaurantOwnerLoading(true);

      const { data, error } = await (supabase as any)
        .from("restaurant_owners")
        .select("id, restaurant_id, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.log("Restaurant owner check error:", error.message);

        setIsRestaurantOwner(false);
        setRestaurantId(null);

        return;
      }

      if (!data) {
        setIsRestaurantOwner(false);
        setRestaurantId(null);

        return;
      }

      setIsRestaurantOwner(true);
      setRestaurantId(data.restaurant_id || null);
    } catch (e) {
      console.log("Restaurant owner check failed:", e);

      setIsRestaurantOwner(false);
      setRestaurantId(null);
    } finally {
      setRestaurantOwnerLoading(false);
    }
  };

  /* =======================================================
     🔵 LIVE SESSION
     ======================================================= */

  const loadLiveSession = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("live_sessions")
      .select("id")
      .eq("seller_id", userId)
      .eq("is_live", true)
      .single();

    setLiveSessionId(data?.id ?? null);
  };

  /* =======================================================
     🟣 LIVE STREAM
     ======================================================= */

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

    const userStream = data.find(
      (s: any) => s.user_id === userId
    );

    console.log("PROFILE STREAM FOUND:", userStream);

    setLiveStreamId(userStream?.id ?? null);
  };

  /* =======================================================
     🔵 LOAD USER STATS
     ======================================================= */

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

  /* =======================================================
     🟣 LOAD EARNINGS
     ======================================================= */

  const loadEarnings = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("battle_payments")
      .select("amount")
      .eq("user_id", userId)
      .eq("status", "approved");

    if (data) {
      const total = data.reduce(
        (sum: number, p: { amount: number }) =>
          sum + Number(p.amount),
        0
      );

      setEarnings(total);
    }
  };

  /* =======================================================
     🟢 FOLLOW STATS
     ======================================================= */

  const loadFollowStats = async (userId: string) => {
    try {
      const { count: followers } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("following_id", userId);

      const { count: following } = await supabase
        .from("follows")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("follower_id", userId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);

      const { data: sessionData } =
        await supabase.auth.getSession();

      const currentUserId = sessionData.session?.user.id;

      if (
        currentUserId &&
        userId &&
        currentUserId !== userId
      ) {
        const { data } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUserId)
          .eq("following_id", userId)
          .maybeSingle();

        setIsFollowing(!!data);
      } else {
        setIsFollowing(false);
      }
    } catch (e) {
      console.log("Follow stats error:", e);
    }
  };

  /* =======================================================
     🔵 REFRESH ON FOCUS
     ======================================================= */

  useFocusEffect(
    useCallback(() => {
      if (session) {
        const profileId = user
          ? String(user)
          : session.user.id;

        loadProfile(profileId);
        checkAdmin(profileId);
        checkHospitalAdmin(profileId);
        checkRestaurantOwner(profileId);
        loadLiveSession(profileId);
        loadLiveStream(profileId);
        loadStats(profileId);
        loadEarnings(profileId);
        loadFollowStats(profileId);
      }
    }, [session, user])
  );

  /* =======================================================
     🟣 FOLLOW USER
     ======================================================= */

  const followUser = async () => {
    try {
      const { data: sessionData } =
        await supabase.auth.getSession();

      const currentUser = sessionData.session?.user;

      if (!currentUser || !user) return;

      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", String(user));

        setIsFollowing(false);

        setFollowersCount((p) =>
          Math.max(0, p - 1)
        );

        return;
      }

      await (supabase as any)
        .from("follows")
        .insert({
          follower_id: currentUser.id,
          following_id: String(user),
        });

      setIsFollowing(true);
      setFollowersCount((p) => p + 1);
    } catch (e) {
      console.log("Follow error:", e);
    }
  };

  /* =======================================================
     🔵 DELETE ACCOUNT
     ======================================================= */

  const handleDeleteAccount = async () => {
    try {
      const confirm =
        Platform.OS === "web"
          ? window.confirm(
              "Are you sure you want to delete your account?"
            )
          : await new Promise<boolean>((res) => {
              Alert.alert(
                "Delete Account",
                "This action is permanent. Continue?",
                [
                  {
                    text: "Cancel",
                    onPress: () => res(false),
                  },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => res(true),
                  },
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
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Delete failed");
      }

      Alert.alert("Account deleted");

      await supabase.auth.signOut();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Delete failed");
    }
  };

  /* =======================================================
     🟣 SAVE MOMO ACCOUNT
     ======================================================= */

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

  /* =======================================================
     🟢 SESSION GUARD
     ======================================================= */

  if (!session) return null;

  const isOwnProfile =
    !user || String(user) === session.user.id;

  /* =======================================================
     🔵 MAIN PROFILE INTERFACE
     ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ===============================================
            🟢 PROFILE HEADER
            =============================================== */}

        <View style={styles.profileHeader}>

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerEyebrow}>
                NASARA ACCOUNT
              </Text>

              <Text style={styles.headerHeading}>
                My Profile
              </Text>
            </View>

            {isOwnProfile && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowActionsModal(true)}
              >
                <Text style={styles.settingsIcon}>☰</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (isOwnProfile) {
                router.push("/profile/edit");
              }
            }}
            style={styles.avatarWrapper}
          >
            <Image
              source={{
                uri:
                  avatarUrl ||
                  "https://ui-avatars.com/api/?background=ccc&size=200",
              }}
              style={styles.avatar}
            />

            {verified && (
              <View style={styles.verifiedAvatarBadge}>
                <Text style={styles.verifiedAvatarText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.nameRow}>
            <Text style={styles.profileName}>
              {fullName || "Profile"}
            </Text>

            {verified && (
              <Text style={styles.verifiedIcon}>🔵</Text>
            )}
          </View>

          <Text style={styles.profileEmail}>
            {session.user.email}
          </Text>

          {isOwnProfile && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => router.push("/profile/edit")}
            >
              <Text style={styles.editProfileButtonText}>
                ✏️  Edit Profile
              </Text>
            </TouchableOpacity>
          )}

          {/* =============================================
              🟣 PROFILE BADGES
              ============================================= */}

          <View style={styles.badgesRow}>
            {mentorBadge && (
              <View style={styles.mentorBadge}>
                <Text style={styles.badgeText}>
                  🎓 Mentor
                </Text>
              </View>
            )}

            {menteeBadge && (
              <View style={styles.menteeBadge}>
                <Text style={styles.badgeText}>
                  🌱 Mentee
                </Text>
              </View>
            )}
          </View>

        </View>

        {/* ===============================================
            🔵 BROWSER NOTIFICATIONS
            =============================================== */}

        {isOwnProfile && (
          <View style={styles.notificationSection}>
            <EnableBrowserNotifications
              userId={session.user.id}
            />
          </View>
        )}

        {/* ===============================================
            🟢 FOLLOW STATISTICS
            =============================================== */}

        <View style={styles.followCard}>

          <TouchableOpacity
            style={styles.followStat}
            onPress={() =>
              router.push(
                `/followers?id=${
                  user ? String(user) : session.user.id
                }`
              )
            }
          >
            <Text style={styles.followNumber}>
              {followersCount.toLocaleString()}
            </Text>

            <Text style={styles.followLabel}>
              Followers
            </Text>
          </TouchableOpacity>

          <View style={styles.followDivider} />

          <TouchableOpacity
            style={styles.followStat}
            onPress={() =>
              router.push(
                `/following?id=${
                  user ? String(user) : session.user.id
                }`
              )
            }
          >
            <Text style={styles.followNumber}>
              {followingCount.toLocaleString()}
            </Text>

            <Text style={styles.followLabel}>
              Following
            </Text>
          </TouchableOpacity>

        </View>

        {/* ===============================================
            🟣 FOLLOW BUTTON FOR OTHER USERS
            =============================================== */}

        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.followProfileButton}
            onPress={followUser}
          >
            <Text style={styles.followProfileButtonText}>
              {isFollowing ? "✓ Following" : "+ Follow"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ===============================================
            🟢 ACCOUNT BALANCE AND ACTIVITY
            =============================================== */}

        <Text style={styles.sectionHeading}>
          Your Nasara Activity
        </Text>

        <View style={styles.statsGrid}>
          <StatCard
            icon="🪙"
            value={coins}
            label="Coins"
          />

          <StatCard
            icon="⚡"
            value={boostCredits}
            label="Boost Credits"
          />

          <StatCard
            icon="👥"
            value={invitesCount}
            label="Invites"
          />
        </View>

        {/* ===============================================
            🔵 INVITE CODE CARD
            =============================================== */}

        {isOwnProfile && (
          <View style={styles.inviteCard}>

            <View style={styles.inviteTop}>
              <View>
                <Text style={styles.inviteEyebrow}>
                  GROW WITH NASARA
                </Text>

                <Text style={styles.inviteTitle}>
                  Invite Friends
                </Text>
              </View>

              <Text style={styles.inviteIcon}>🎁</Text>
            </View>

            <Text style={styles.inviteDescription}>
              Share your invite code with friends and
              invite them to join Nasara.
            </Text>

            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCodeLabel}>
                YOUR INVITE CODE
              </Text>

              <Text style={styles.inviteCode}>
                {inviteCode || "Not generated"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                Share.share({
                message: `Join Nasara 🚀 using my invite code: ${inviteCode}\nhttps://nasara1.vercel.app`,
                })
              }
              style={styles.shareInviteButton}
            >
              <Text style={styles.shareInviteText}>
                ↗️  Share Invite
              </Text>
            </TouchableOpacity>

          </View>
        )}

        {/* ===============================================
            🟣 VERIFICATION CARD
            =============================================== */}

        <View style={styles.verificationCard}>

          <View style={styles.verificationHeader}>
            <View>
              <Text style={styles.sectionHeading}>
                Account Verification
              </Text>

              <Text style={styles.verificationDescription}>
                Your Nasara verification status
              </Text>
            </View>

            <Text style={styles.verificationIcon}>🛡️</Text>
          </View>

          <View style={styles.verificationStatusRow}>
            <Text style={styles.verificationStatusLabel}>
              Current Status
            </Text>

            <View
              style={[
                styles.statusPill,
                verificationStatus === "approved" &&
                  styles.statusApproved,
                verificationStatus === "pending" &&
                  styles.statusPending,
                verificationStatus === "rejected" &&
                  styles.statusRejected,
                verificationStatus === "expired" &&
                  styles.statusExpired,
              ]}
            >
              <Text style={styles.statusPillText}>
                {verificationStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          {isOwnProfile && (
            <>
              <TouchableOpacity
                style={styles.verificationButton}
                onPress={() => router.push("/get-verified")}
              >
                <Text style={styles.verificationButtonText}>
                  Apply for Verification
                </Text>
              </TouchableOpacity>

              {verificationStatus === "none" && !isAdmin && (
                <TouchableOpacity
                  style={styles.verifyPhoneButton}
                  onPress={() => router.push("/verify-phone")}
                >
                  <Text style={styles.verifyPhoneText}>
                    Verify Phone Number
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

        </View>

        {/* ===============================================
            🔵 PERSONAL INFORMATION
            =============================================== */}

        <Text style={styles.sectionHeading}>
          Personal Information
        </Text>

        <View style={styles.infoCard}>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text>📱</Text>
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>
                Phone Number
              </Text>

              <Text style={styles.infoValue}>
                {phone || "Not provided"}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Text>📍</Text>
            </View>

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>
                Location
              </Text>

              <Text style={styles.infoValue}>
                {location || "Not provided"}
              </Text>
            </View>
          </View>

        </View>

        {/* ===============================================
            🟢 PROFILE ACTIONS
            =============================================== */}

        {isOwnProfile && (
          <TouchableOpacity
            style={styles.mainActionButton}
            onPress={() => setShowActionsModal(true)}
          >
            <Text style={styles.mainActionIcon}>⚡</Text>

            <View style={styles.mainActionTextContainer}>
              <Text style={styles.mainActionTitle}>
                Profile Actions
              </Text>

              <Text style={styles.mainActionDescription}>
                Manage your account, activity and services
              </Text>
            </View>

            <Text style={styles.mainActionArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ===============================================
            🟣 EXTRA ACCOUNT INFORMATION
            =============================================== */}

        {isOwnProfile && (
          <View style={styles.extraStatsCard}>
            <Text style={styles.extraStatsTitle}>
              Your Progress
            </Text>

            <View style={styles.extraStatsRow}>
              <View>
                <Text style={styles.extraStatsValue}>
                  {level}
                </Text>
                <Text style={styles.extraStatsLabel}>
                  Level
                </Text>
              </View>

              <View>
                <Text style={styles.extraStatsValue}>
                  {xp.toLocaleString()}
                </Text>
                <Text style={styles.extraStatsLabel}>
                  XP
                </Text>
              </View>

              <View>
                <Text style={styles.extraStatsValue}>
                  {streak}
                </Text>
                <Text style={styles.extraStatsLabel}>
                  Streak
                </Text>
              </View>

              <View>
                <Text style={styles.extraStatsValue}>
                  GH₵{earnings.toFixed(2)}
                </Text>
                <Text style={styles.extraStatsLabel}>
                  Earnings
                </Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.footerText}>
          NASARA • CONNECT • DISCOVER • GROW
        </Text>

      </ScrollView>

      {/* =================================================
          🟢 PROFILE ACTIONS MODAL
          ================================================= */}

      <Modal
        visible={showActionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionsModal(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.actionsModal}>

            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  NASARA ACCOUNT
                </Text>

                <Text style={styles.modalTitle}>
                  Profile Actions
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowActionsModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.actionsScroll}
            >

              {/* =======================================
                  🟢 ACCOUNT
                  ======================================= */}

              <Text style={styles.sectionTitle}>
                👤  Account
              </Text>

              <View style={styles.actionGrid}>
                <ActionTile
                  label="Favorites ❤️"
                  bg="#0EA5E9"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/favorite");
                  }}
                />

                <ActionTile
                  label="MoMo 💳"
                  bg="#0EA5E9"
                  onPress={() => {
                    setShowActionsModal(false);
                    setTimeout(() => setShowMomoModal(true), 200);
                  }}
                />

                <ActionTile
                  label="Offers 💌"
                  bg="#D99A23"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/offers");
                  }}
                />
              </View>

              {/* =======================================
                  🔵 ACTIVITY
                  ======================================= */}

              <Text style={styles.sectionTitle}>
                📊  Activity
              </Text>

              <View style={styles.actionGrid}>
                <ActionTile
                  label="My Page"
                  bg="#22C55E"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/my-page");
                  }}
                />

                <ActionTile
                  label="My Mentors"
                  bg="#2563EB"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/mentor/my-mentor");
                  }}
                />

                <ActionTile
                  label="My Mentees"
                  bg="#16A34A"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/mentor/my-mentees");
                  }}
                />
              </View>

              {/* =======================================
                  🟣 WATCH AND AUCTIONS
                  ======================================= */}

              <Text style={styles.sectionTitle}>
                🎥  Watch & Auctions
              </Text>

              <View style={styles.actionGrid}>
                <ActionTile
                  label="Watch Live"
                  bg="#22C55E"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/live");
                  }}
                />

                <ActionTile
                  label="My Auctions 🔥"
                  bg="#D99A23"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/auctions");
                  }}
                />

                <ActionTile
                  label="Battle ⚔️"
                  bg="#D99A23"
                  onPress={() => {
                    setShowActionsModal(false);
                    router.push("/battle");
                  }}
                />
              </View>

              {/* =======================================
                  🔵 ADMIN
                  ======================================= */}

              {isAdmin && (
                <>
                  <Text style={styles.sectionTitle}>
                    🛠️  Administration
                  </Text>

                  <View style={styles.actionGrid}>
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

              {/* =======================================
                  🟢 HOSPITAL ADMIN
                  ======================================= */}

              {isHospitalAdmin && (
                <>
                  <Text style={styles.sectionTitle}>
                    🏥  Hospital
                  </Text>

                  <View style={styles.actionGrid}>
                    <ActionTile
                      label="Hospital Admin"
                      bg="#0B6E4F"
                      onPress={() => {
                        setShowActionsModal(false);

                        router.push(
                          "/(hospital-admin)/dashboard"
                        );
                      }}
                    />
                  </View>
                </>
              )}

              {/* =======================================
                  🟣 RESTAURANT OWNER
                  ======================================= */}

              {isRestaurantOwner && (
                <>
                  <Text style={styles.sectionTitle}>
                    🍽️  Restaurant
                  </Text>

                  <View style={styles.actionGrid}>
                    <ActionTile
                      label="Restaurant Admin"
                      bg="#DC2626"
                      disabled={restaurantOwnerLoading}
                      onPress={() => {
                        setShowActionsModal(false);

                        router.push(
                          "/(restaurant-owner)/dashboard"
                        );
                      }}
                    />
                  </View>
                </>
              )}

              {/* =======================================
                  🔵 CLOSE
                  ======================================= */}

              <TouchableOpacity
                style={styles.closeActionsButton}
                onPress={() => setShowActionsModal(false)}
              >
                <Text style={styles.closeActionsText}>
                  Close
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =================================================
          🟢 ADMIN SECURITY MODAL
          ================================================= */}

      <Modal
        visible={showAdminModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.smallModal}>

            <Text style={styles.modalTitle}>
              Admin Verification
            </Text>

            <Text style={styles.modalDescription}>
              Enter your admin password to continue.
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
              disabled={checkingAdmin}
              style={styles.adminVerifyButton}
            >
              <Text style={styles.adminVerifyText}>
                {checkingAdmin ? "Checking..." : "Verify"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAdminModal(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* =================================================
          🔵 MOMO MODAL
          ================================================= */}

      <Modal
        visible={showMomoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMomoModal(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.smallModal}>

            <Text style={styles.modalTitle}>
              MoMo Account Details
            </Text>

            <Text style={styles.modalDescription}>
              Manage your Mobile Money payment details.
            </Text>

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

            <TouchableOpacity
              style={styles.adminVerifyButton}
              onPress={saveMomoAccount}
            >
              <Text style={styles.adminVerifyText}>
                Save Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMomoModal(false)}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* =========================================================
   🟢 PREMIUM NASARA PROFILE STYLES
   ========================================================= */

const styles = StyleSheet.create({

  /* ===============================================
     🔵 MAIN LAYOUT
     =============================================== */

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },

  /* ===============================================
     🟣 PROFILE HEADER
     =============================================== */

  profileHeader: {
    backgroundColor: COLORS.navy,
    borderRadius: 25,
    padding: 22,
    alignItems: "center",
    marginBottom: 18,
    overflow: "hidden",
  },

  headerTop: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerEyebrow: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  headerHeading: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 4,
  },

  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsIcon: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "bold",
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: COLORS.gold,
    backgroundColor: "#D1D5DB",
  },

  verifiedAvatarBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    borderWidth: 3,
    borderColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },

  verifiedAvatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  profileName: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },

  verifiedIcon: {
    marginLeft: 7,
    fontSize: 17,
  },

  profileEmail: {
    color: "#B9C2D4",
    fontSize: 12,
    marginTop: 6,
  },

  editProfileButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 17,
  },

  editProfileButtonText: {
    color: COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },

  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  mentorBadge: {
    backgroundColor: "#2369A8",
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },

  menteeBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
  },

  /* ===============================================
     🟢 NOTIFICATIONS
     =============================================== */

  notificationSection: {
    marginBottom: 16,
  },

  /* ===============================================
     🔵 FOLLOW STATISTICS
     =============================================== */

  followCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    paddingVertical: 20,
    paddingHorizontal: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  followStat: {
    flex: 1,
    alignItems: "center",
  },

  followNumber: {
    color: COLORS.navy,
    fontSize: 23,
    fontWeight: "900",
  },

  followLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  followDivider: {
    width: 1,
    height: 38,
    backgroundColor: COLORS.border,
  },

  followProfileButton: {
    backgroundColor: COLORS.navy,
    padding: 15,
    borderRadius: 13,
    alignItems: "center",
    marginBottom: 20,
  },

  followProfileButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  /* ===============================================
     🟣 SECTION HEADINGS
     =============================================== */

  sectionHeading: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 4,
  },

  /* ===============================================
     🟢 STATISTICS CARDS
     =============================================== */

  statsGrid: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 22,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 17,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statIcon: {
    fontSize: 25,
    marginBottom: 8,
  },

  statValue: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: "900",
  },

  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },

  /* ===============================================
     🔵 INVITE CARD
     =============================================== */

  inviteCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 21,
    padding: 19,
    marginBottom: 22,
  },

  inviteTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inviteEyebrow: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
  },

  inviteTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 5,
  },

  inviteIcon: {
    fontSize: 32,
  },

  inviteDescription: {
    color: "#CBD2DF",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },

  inviteCodeBox: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 13,
    padding: 13,
    marginTop: 16,
  },

  inviteCodeLabel: {
    color: "#B9C2D4",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  inviteCode: {
    color: COLORS.gold,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 6,
  },

  shareInviteButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 13,
  },

  shareInviteText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 13,
  },

  /* ===============================================
     🟣 VERIFICATION CARD
     =============================================== */

  verificationCard: {
    backgroundColor: COLORS.white,
    padding: 17,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 22,
  },

  verificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  verificationDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: -6,
    marginBottom: 13,
  },

  verificationIcon: {
    fontSize: 28,
  },

  verificationStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  verificationStatusLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },

  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },

  statusApproved: {
    backgroundColor: "#D9F6E8",
  },

  statusPending: {
    backgroundColor: "#FFF1CC",
  },

  statusRejected: {
    backgroundColor: "#FDE2E2",
  },

  statusExpired: {
    backgroundColor: "#E5E7EB",
  },

  statusPillText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: "900",
  },

  verificationButton: {
    backgroundColor: COLORS.navy,
    padding: 13,
    borderRadius: 11,
    alignItems: "center",
    marginTop: 13,
  },

  verificationButtonText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 12,
  },

  verifyPhoneButton: {
    backgroundColor: COLORS.goldLight,
    padding: 12,
    borderRadius: 11,
    alignItems: "center",
    marginTop: 9,
  },

  verifyPhoneText: {
    color: COLORS.navy,
    fontWeight: "800",
    fontSize: 12,
  },

  /* ===============================================
     🔵 PERSONAL INFORMATION
     =============================================== */

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 13,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  infoIconBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#F0F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },

  infoValue: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },

  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  /* ===============================================
     🟢 PROFILE ACTION BUTTON
     =============================================== */

  mainActionButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 17,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  mainActionIcon: {
    fontSize: 28,
    marginRight: 13,
  },

  mainActionTextContainer: {
    flex: 1,
  },

  mainActionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "900",
  },

  mainActionDescription: {
    color: "#B9C2D4",
    fontSize: 10,
    marginTop: 4,
  },

  mainActionArrow: {
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: "300",
  },

  /* ===============================================
     🔵 EXTRA STATISTICS
     =============================================== */

  extraStatsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },

  extraStatsTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 17,
  },

  extraStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
  },

  extraStatsValue: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  extraStatsLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 20,
  },

  /* ===============================================
     🟣 MODALS
     =============================================== */

  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(4,10,25,0.75)",
    justifyContent: "center",
    padding: 16,
  },

  actionsModal: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 19,
    maxHeight: "88%",
  },

  smallModal: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 21,
  },

  modalHandle: {
    width: 43,
    height: 5,
    backgroundColor: "#D0D5DF",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  modalEyebrow: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  modalTitle: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 10,
  },

  modalDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 17,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8EBF1",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  actionsScroll: {
    flexGrow: 0,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 15,
    marginBottom: 9,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },

  actionTile: {
    flex: 1,
    minWidth: "28%",
    paddingVertical: 16,
    paddingHorizontal: 5,
    margin: 5,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTileText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 11,
    textAlign: "center",
  },

  closeActionsButton: {
    backgroundColor: COLORS.navy,
    padding: 15,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 22,
    marginBottom: 12,
  },

  closeActionsText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 13,
  },

  /* ===============================================
     🟢 MODAL INPUTS
     =============================================== */

  input: {
    backgroundColor: "#F6F7FA",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    color: COLORS.text,
    fontSize: 14,
  },

  adminVerifyButton: {
    backgroundColor: COLORS.navy,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },

  adminVerifyText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 13,
  },

  cancelButton: {
    backgroundColor: "#E9ECF2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  cancelButtonText: {
    color: COLORS.navy,
    fontWeight: "800",
    fontSize: 13,
  },

});