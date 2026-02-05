import { Session } from "@supabase/supabase-js";
import { useFocusEffect, useRouter } from "expo-router";
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

  const [session, setSession] = useState<Session | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  /* ===== WHATSAPP ===== */
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  /* ===== MOMO ===== */
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [showMomoModal, setShowMomoModal] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);

      if (data.session) {
        const userId = data.session.user.id;
        loadProfile(userId);
        checkAdmin(userId);
        loadLiveSession(userId);
      }
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setLocation(data.location || "");
      setAvatarUrl(data.avatar_url || null);
      setMomoName(data.momo_name || "");
      setMomoNumber(data.momo_number || "");
      setWhatsappNumber(data.whatsapp_number || "");
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

  /* ===== OPEN WHATSAPP ===== */
  const openWhatsApp = async () => {
    if (!whatsappNumber) return;
    await Linking.openURL("https://wa.me/" + whatsappNumber);
  };

  /* ===== SAVE MOMO ===== */
  const saveMomoAccount = async () => {
    if (!session) return;

    if (!momoName.trim() || !momoNumber.trim()) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        momo_name: momoName.trim(),
        momo_number: momoNumber.trim(),
      })
      .eq("id", session.user.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setShowMomoModal(false);
    await loadProfile(session.user.id);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId);

    setIsAdmin(!!data?.length);
  };

  const loadLiveSession = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("live_sessions")
      .select("id")
      .eq("seller_id", userId)
      .eq("is_live", true)
      .single();

    setLiveSessionId(data?.id ?? null);
  };

  useFocusEffect(
    useCallback(() => {
      if (session) {
        const userId = session.user.id;
        loadProfile(userId);
        checkAdmin(userId);
        loadLiveSession(userId);
      }
    }, [session])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{session.user.email}</Text>

      <TextInput value={fullName} editable={false} style={styles.input} />
      <TextInput value={phone} editable={false} style={styles.input} />
      <TextInput value={location} editable={false} style={styles.input} />

      {/* ===== ACTIONS ===== */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row" }}>
          <ActionTile
            label={whatsappNumber ? "WhatsApp" : "Add WhatsApp"}
            bg="#22c55e"
            onPress={() => setShowWhatsappModal(true)}
          />
          <ActionTile
            label="Favorites"
            bg="#f43f5e"
            onPress={() => router.push("/favorite")}
          />
        </View>

        <View style={{ flexDirection: "row" }}>
          <ActionTile
            label="MoMo Account"
            bg="#f59e0b"
            onPress={() => setShowMomoModal(true)}
          />
          <ActionTile
            label="Post Ad"
            bg="#0ea5e9"
            onPress={() => router.push("/ads/create")}
          />

          {/* ✅_toggle ADDED ONLY */}
          <ActionTile
            label="Post Banner"
            bg="#10b981"
            onPress={() => router.push("/banner/create")}
          />

          {isAdmin && (
            <ActionTile
              label="Admin"
              bg="#111827"
              onPress={() => router.push("/(admin)")}
            />
          )}
        </View>
      </View>

      {/* ===== GO LIVE / VIEW LIVE ===== */}
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <ActionTile
          label="Go Live"
          bg="#16a34a"
          disabled={!!liveSessionId}
          onPress={() => router.push("/go-live")}
        />
        <ActionTile
          label="View Live"
          bg="#9333ea"
          onPress={() =>
            liveSessionId
              ? router.push("/seller/live/" + liveSessionId)
              : router.push("/live")
          }
        />
      </View>

      <View style={{ marginTop: 20 }} />
      <Button title="Logout" color="#dc2626" onPress={handleLogout} />

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

            {whatsappNumber ? (
              <>
                <View style={{ height: 8 }} />
                <Button
                  title="Open WhatsApp"
                  color="#22c55e"
                  onPress={openWhatsApp}
                />
              </>
            ) : null}

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
            <Text style={styles.modalTitle}>MoMo Account</Text>

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
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  email: { marginBottom: 12 },
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
  },
});