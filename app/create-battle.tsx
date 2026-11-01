// ==========================================
// 📦 IMPORTS
// ==========================================

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

// ==========================================
// 🎨 NASARA PREMIUM THEME
// ==========================================

const COLORS = {
  navy: "#14213D",
  navyLight: "#203354",
  gold: "#D6A84F",
  goldLight: "#F8EFD9",
  background: "#F5F6FA",
  white: "#FFFFFF",
  text: "#172238",
  muted: "#7C8799",
  border: "#E5E9F0",
  green: "#16865A",
  red: "#D94848",
};

// ==========================================
// ☁️ CANDIDATE IMAGE UPLOAD
// ==========================================

const uploadCandidateImage = async (
  uri: string
): Promise<string> => {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();

    const file = new File(
      [blob],
      "candidate.jpg",
      { type: blob.type || "image/jpeg" }
    );

    formData.append("file", file);
  } else {
    formData.append(
      "file",
      {
        uri,
        name: "candidate.jpg",
        type: "image/jpeg",
      } as any
    );
  }

  const response = await fetch(
    "https://nasara-upload-server.onrender.com/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Candidate image upload failed.");
  }

  const data = await response.json();

  if (!data?.url) {
    throw new Error("Invalid image upload response.");
  }

  return data.url;
};

// ==========================================
// 🔔 ALERT HELPER
// ==========================================

const showAlert = (title: string, message?: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

// ==========================================
// ⚔️ CREATE BATTLE SCREEN
// ==========================================

export default function CreateBattle() {
  const router = useRouter();

  // ==========================================
  // 📝 BATTLE DETAILS
  // ==========================================

  const [title, setTitle] = useState("");
  const [compare, setCompare] = useState("");
  const [category, setCategory] = useState("");

  const [candidateImages, setCandidateImages] =
    useState<Record<string, string>>({});

  const [candidatePositions, setCandidatePositions] =
    useState<Record<string, string>>({});

  // ==========================================
  // 🌍 BATTLE TYPE
  // ==========================================

  const [battleType, setBattleType] =
    useState<"public" | "institution">("public");

  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [allowedVoters, setAllowedVoters] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  // ==========================================
  // ⏱️ DURATION
  // ==========================================

  const [durationValue, setDurationValue] = useState("");
  const [durationType, setDurationType] = useState("minutes");

  // ==========================================
  // 💳 PAYMENT
  // ==========================================

  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // ==========================================
  // ⚙️ LOADING
  // ==========================================

  const [loading, setLoading] = useState(false);
  const [uploadingCandidate, setUploadingCandidate] = useState<string | null>(null);

  // ==========================================
  // 🏦 MOMO DETAILS
  // ==========================================

  const momoName = "NASARA MARKET";
  const momoNumber = "0539703374";
  const momoNetwork = "MTN";

  // ==========================================
  // 📂 CATEGORIES
  // ==========================================

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

  // ==========================================
  // 👥 PARSE CANDIDATES
  // ==========================================

  const names = [
    ...new Set(
      compare
        .split(/vs|VS|Vs|vS|,/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map(
          (name) =>
            name.charAt(0).toUpperCase() +
            name.slice(1).toLowerCase()
        )
    ),
  ];

  // ==========================================
  // ⏱️ CALCULATE DURATION
  // ==========================================

  function getDurationMs() {
    const value = Number(durationValue);

    if (!Number.isFinite(value) || value <= 0) {
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

  // ==========================================
  // 📊 IMPORT EXCEL VOTERS
  // ==========================================

  async function pickExcelFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "/",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];

      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const phones = jsonData
        .map((row: any) => {
          const values = Object.values(row);
          return values[0]?.toString()?.trim();
        })
        .filter(Boolean);

      setAllowedVoters(phones.join("\n"));

      showAlert(
        "Excel Imported",
        `${phones.length} phone numbers loaded successfully.`
      );
    } catch (error: any) {
      console.log(error);

      showAlert(
        "Excel Error",
        error?.message || "Could not read Excel file."
      );
    }
  }

  // ==========================================
  // 🖼️ PICK CANDIDATE IMAGE
  // ==========================================

  async function pickCandidateImage(candidateName: string) {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showAlert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      setCandidateImages((previous) => ({
        ...previous,
        [candidateName]: result.assets[0].uri,
      }));
    } catch (error: any) {
      showAlert(
        "Image Error",
        error?.message || "Could not select candidate image."
      );
    }
  }

  // ==========================================
  // ⚔️ CREATE BATTLE
  // ==========================================

  const createBattle = async () => {
    if (loading) return;

    if (
      !title.trim() ||
      !compare.trim() ||
      !category ||
      !durationValue.trim()
    ) {
      showAlert(
        "Missing Information",
        "Please complete the battle title, participants, category and duration."
      );
      return;
    }

    if (
      battleType === "institution" &&
      !institutionName.trim()
    ) {
      showAlert(
        "Institution Required",
        "Please enter the institution name."
      );
      return;
    }

    if (names.length < 2) {
      showAlert(
        "Invalid Battle",
        "Enter at least two participants. Example: A vs B."
      );
      return;
    }

    if (names.length > 12) {
      showAlert(
        "Participant Limit",
        "A maximum of 12 participants is allowed."
      );
      return;
    }

    const durationMs = getDurationMs();

    if (!durationMs) {
      showAlert(
        "Invalid Duration",
        "Please enter a valid battle duration."
      );
      return;
    }

    // Preserve the creation/payment amounts from the supplied code.
    const amount = battleType === "public" ? 1000 : 2000;

    try {
      setLoading(true);

      // 👤 GET USER
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        showAlert("Login Required", "Please login first.");
        router.replace("/(auth)/login");
        return;
      }

      // 📱 CLEAN VOTER NUMBERS
      const cleanedNumbers =
        battleType === "institution"
          ? allowedVoters
              .split(/,|\n/)
              .map((phone) => phone.replace(/\s/g, "").trim())
              .filter((phone) => phone.length >= 8)
          : [];

      // ⏱️ END TIME
      const endTime = new Date(Date.now() + durationMs);

      // ==========================================
      // 💾 INSERT BATTLE
      // ==========================================

      const { data, error } = await (supabase as any)
        .from("battles")
        .insert({
          title: title.trim(),
          compare_text: compare,
          category,
          end_time: endTime.toISOString(),
          creator_id: user.id,
          user_id: user.id,
          status: "pending",
          payment_status: "pending",
          approval_status: "pending",
          battle_type: battleType,
          institution_name: institutionName,
          institution_type: institutionType,
          allowed_voters: cleanedNumbers,
          require_voter_approval: requireApproval,
          is_private: isPrivate,
          total_votes: 0,
          is_boosted: false,
        })
        .select()
        .single();

      if (error || !data) {
        console.log(error);

        showAlert(
          "Battle Creation Failed",
          error?.message || "Could not create battle."
        );
        return;
      }

      // ==========================================
      // 🏫 INSERT INSTITUTION VOTERS
      // ==========================================

      if (
        battleType === "institution" &&
        cleanedNumbers.length > 0
      ) {
        const voterPayload = cleanedNumbers.map((phone) => ({
          battle_id: data.id,
          phone,
          approved: true,
          has_voted: false,
        }));

        const { error: voterError } = await (supabase as any)
          .from("institution_voters")
          .insert(voterPayload);

        if (voterError) {
          console.log(
            "Institution voter insert error:",
            voterError
          );
        }
      }

      // ==========================================
      // 💳 CREATE PAYMENT RECORD
      // ==========================================

      const paymentCode = "CREATE-" + Date.now();

      const { error: paymentError } = await (supabase as any)
        .from("battle_creation_payments")
        .insert({
          battle_id: data.id,
          user_id: user.id,
          amount,
          momo_name: momoName,
          momo_number: momoNumber,
          network: momoNetwork,
          payment_code: paymentCode,
          status: "pending",
        });

      if (paymentError) {
        showAlert(
          "Payment Error",
          paymentError.message
        );
        return;
      }

      // ==========================================
      // 👥 INSERT CANDIDATES
      // ==========================================

      const candidatePayload: any[] = [];

      for (const name of names) {
        let imageUrl = "";

        const localImage = candidateImages[name];

        if (localImage) {
          try {
            setUploadingCandidate(name);

            imageUrl = await uploadCandidateImage(localImage);
          } catch (error) {
            console.log(
              "Candidate image upload error:",
              error
            );
          } finally {
            setUploadingCandidate(null);
          }
        }

        candidatePayload.push({
          battle_id: data.id,
          name,
          position: candidatePositions[name] || "",
          image_url: imageUrl,
          votes: 0,
        });
      }

      const { error: candidateError } = await (supabase as any)
        .from("candidates")
        .insert(candidatePayload);

      if (candidateError) {
        showAlert(
          "Candidate Error",
          candidateError.message
        );
        return;
      }

      // ==========================================
      // 💳 SHOW PAYMENT MODAL
      // ==========================================

      setPaymentInfo({
        amount,
        paymentCode,
      });

      setPaymentVisible(true);

      // 🧹 RESET FORM
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
      setCandidateImages({});
      setCandidatePositions({});
    } catch (error: any) {
      console.log(error);

      showAlert(
        "Error",
        error?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
      setUploadingCandidate(null);
    }
  };

  // ==========================================
  // 🧩 SECTION HEADING
  // ==========================================

  const SectionHeading = ({
    number,
    heading,
    subtitle,
  }: {
    number: string;
    heading: string;
    subtitle: string;
  }) => (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{heading}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );

  // ==========================================
  // 🧩 FORM LABEL
  // ==========================================

  const FieldLabel = ({ children }: { children: string }) => (
    <Text style={styles.label}>{children}</Text>
  );

  // ==========================================
  // 🖥️ SCREEN UI
  // ==========================================

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.navy}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ================================== */}
        {/* 🟦 PREMIUM HEADER */}
        {/* ================================== */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                NASARA BATTLE ARENA
              </Text>
            </View>
          </View>

          <Text style={styles.headerTitle}>
            Create Your Battle
          </Text>

          <Text style={styles.headerDescription}>
            Bring participants together, create a competition or organise an institution election.
          </Text>

          <View style={styles.headerInfo}>
            <View style={styles.headerIcon}>
              <Text style={{ fontSize: 23 }}>⚔️</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.headerInfoTitle}>
                Your competition starts here
              </Text>
              <Text style={styles.headerInfoSubtitle}>
                Set up participants, voting and duration.
              </Text>
            </View>
          </View>
        </View>

        {/* ================================== */}
        {/* 🌍 BATTLE TYPE */}
        {/* ================================== */}

        <View style={styles.card}>
          <SectionHeading
            number="01"
            heading="Choose Battle Type"
            subtitle="Select the type of competition you want to create."
          />

          <View style={styles.typeContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setBattleType("public")}
              style={[
                styles.typeCard,
                battleType === "public" && styles.typeCardActive,
              ]}
            >
              <Text style={styles.typeIcon}>🌍</Text>

              <Text
                style={[
                  styles.typeTitle,
                  battleType === "public" && styles.typeTitleActive,
                ]}
              >
                Public Battle
              </Text>

              <Text style={styles.typeDescription}>
                Open competition for the public.
              </Text>

              {battleType === "public" && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    ✓ SELECTED
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setBattleType("institution")}
              style={[
                styles.typeCard,
                battleType === "institution" && styles.typeCardActive,
              ]}
            >
              <Text style={styles.typeIcon}>🏫</Text>

              <Text
                style={[
                  styles.typeTitle,
                  battleType === "institution" &&
                    styles.typeTitleActive,
                ]}
              >
                Institution
              </Text>

              <Text style={styles.typeDescription}>
                Organised institutional elections.
              </Text>

              {battleType === "institution" && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>
                    ✓ SELECTED
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================== */}
        {/* 🏫 INSTITUTION SETTINGS */}
        {/* ================================== */}

        {battleType === "institution" && (
          <View style={styles.card}>
            <SectionHeading
              number="02"
              heading="Institution Information"
              subtitle="Provide the details of the institution."
            />

            <FieldLabel>Institution Name</FieldLabel>

            <TextInput
              placeholder="Enter institution name"
              placeholderTextColor="#A5ADBA"
              value={institutionName}
              onChangeText={setInstitutionName}
              style={styles.input}
            />

            <FieldLabel>Institution Type</FieldLabel>

            <TextInput
              placeholder="e.g. University, School, Association"
              placeholderTextColor="#A5ADBA"
              value={institutionType}
              onChangeText={setInstitutionType}
              style={styles.input}
            />

            <View style={styles.voterHeading}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Allowed Voters
                </Text>

                <Text style={styles.helperText}>
                  Enter one phone number per line. Any country format is accepted.
                </Text>
              </View>

              <View style={styles.voterCount}>
                <Text style={styles.voterCountText}>
                  {allowedVoters
                    .split(/,|\n/)
                    .filter((phone) => phone.trim().length >= 8).length}
                </Text>
                <Text style={styles.voterCountLabel}>
                  NUMBERS
                </Text>
              </View>
            </View>

            <TextInput
              placeholder={
                "0240000000\n0551111111\n0531111111\n+2348012345678"
              }
              placeholderTextColor="#A5ADBA"
              value={allowedVoters}
              onChangeText={setAllowedVoters}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.voterInput]}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={pickExcelFile}
              style={styles.excelButton}
            >
              <Text style={styles.excelIcon}>📊</Text>
              <Text style={styles.excelButtonText}>
                Upload Excel Voter List
              </Text>
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>
                  Require Voter Approval
                </Text>
                <Text style={styles.switchDescription}>
                  Enable approval before voters participate.
                </Text>
              </View>

              <Switch
                value={requireApproval}
                onValueChange={setRequireApproval}
                trackColor={{
                  false: "#CBD1DA",
                  true: COLORS.gold,
                }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>
                🛡️ Secure Institution Voting
              </Text>

              {[
                "Only approved phone numbers can vote",
                "One phone number per voter",
                "Unauthorised voters are restricted",
                "Voter access is controlled",
              ].map((item, index) => (
                <View key={index} style={styles.securityItem}>
                  <Text style={styles.securityCheck}>✓</Text>
                  <Text style={styles.securityText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================================== */}
        {/* 🔒 PRIVACY SETTINGS */}
        {/* ================================== */}

        <View style={styles.card}>
          <SectionHeading
            number={battleType === "public" ? "02" : "03"}
            heading="Privacy Settings"
            subtitle="Choose whether the election should be private."
          />

          <View style={styles.switchRow}>
            <View style={styles.privacyIcon}>
              <Text style={{ fontSize: 19 }}>🔒</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>
                Private Election
              </Text>

              <Text style={styles.switchDescription}>
                {isPrivate
                  ? "Private election enabled."
                  : "Private election disabled."}
              </Text>
            </View>

            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{
                false: "#CBD1DA",
                true: COLORS.gold,
              }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* ================================== */}
        {/* 📝 BATTLE DETAILS */}
        {/* ================================== */}

        <View style={styles.card}>
          <SectionHeading
            number={battleType === "public" ? "03" : "04"}
            heading="Battle Details"
            subtitle="Give your competition a title and participants."
          />

          <FieldLabel>Battle Title</FieldLabel>

          <TextInput
            placeholder="e.g. Best Musician in Ghana"
            placeholderTextColor="#A5ADBA"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <FieldLabel>Participants</FieldLabel>

          <Text style={styles.helperText}>
            Separate participant names using "vs" or commas.
          </Text>

          <TextInput
            placeholder="Participant A vs Participant B vs Participant C"
            placeholderTextColor="#A5ADBA"
            value={compare}
            onChangeText={setCompare}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.compareInput]}
          />

          <View style={styles.participantSummary}>
            <Text style={styles.participantSummaryText}>
              👥 {names.length} / 12 participants added
            </Text>
          </View>
        </View>

        {/* ================================== */}
        {/* 👥 CANDIDATES */}
        {/* ================================== */}

        {names.length > 0 && (
          <View style={styles.card}>
            <SectionHeading
              number={battleType === "public" ? "04" : "05"}
              heading="Participant Profiles"
              subtitle="Add a position and optional photo for each participant."
            />

            {names.map((candidate, index) => (
              <View key={`${candidate}-${index}`} style={styles.candidateCard}>
                <View style={styles.candidateTop}>
                  <View style={styles.candidateNumber}>
                    <Text style={styles.candidateNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>
                      {candidate}
                    </Text>

                    <Text style={styles.candidateSub}>
                      Participant profile
                    </Text>
                  </View>

                  {candidateImages[candidate] ? (
                    <Image
                      source={{ uri: candidateImages[candidate] }}
                      style={styles.candidateAvatar}
                    />
                  ) : (
                    <View style={styles.candidateAvatarPlaceholder}>
                      <Text style={{ fontSize: 21 }}>👤</Text>
                    </View>
                  )}
                </View>

                <FieldLabel>
                  {battleType === "institution"
                    ? "Election Position"
                    : "Role / Nickname (Optional)"}
                </FieldLabel>

                <TextInput
                  placeholder={
                    battleType === "institution"
                      ? "e.g. President, Treasurer, SRC"
                      : "Enter role or nickname"
                  }
                  placeholderTextColor="#A5ADBA"
                  value={candidatePositions[candidate] || ""}
                  onChangeText={(text) =>
                    setCandidatePositions((previous) => ({
                      ...previous,
                      [candidate]: text,
                    }))
                  }
                  style={styles.input}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => pickCandidateImage(candidate)}
                  style={styles.photoButton}
                >
                  <Text style={styles.photoButtonText}>
                    📷 {candidateImages[candidate]
                      ? "Change Photo"
                      : "Upload Participant Photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {uploadingCandidate && (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color={COLORS.navy} />
                <Text style={styles.uploadingText}>
                  Uploading {uploadingCandidate}'s photo...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================================== */}
        {/* 🏷️ CATEGORY */}
        {/* ================================== */}

        <View style={styles.card}>
          <SectionHeading
            number={battleType === "public" ? "05" : "06"}
            heading="Battle Category"
            subtitle="Choose the category that best describes your battle."
          />

          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const selected = category === item;

              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryButton,
                    selected && styles.categoryButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selected && styles.categoryTextActive,
                    ]}
                  >
                    {selected ? "✓ " : ""}
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================================== */}
        {/* ⏱️ DURATION */}
        {/* ================================== */}

        <View style={styles.card}>
          <SectionHeading
            number={battleType === "public" ? "06" : "07"}
            heading="Battle Duration"
            subtitle="Set how long your battle or election will run."
          />

          <FieldLabel>Enter Duration</FieldLabel>

          <TextInput
            placeholder="Enter duration"
            placeholderTextColor="#A5ADBA"
            value={durationValue}
            onChangeText={setDurationValue}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 17 }]}>
            Select Time Unit
          </Text>

          <View style={styles.durationContainer}>
            {["minutes", "hours", "days"].map((type) => {
              const selected = durationType === type;

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setDurationType(type)}
                  style={[
                    styles.durationButton,
                    selected && styles.durationButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      selected && styles.durationTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================================== */}
        {/* 💰 CREATION FEE */}
        {/* ================================== */}

        <View style={styles.feeCard}>
          <View style={styles.feeHeader}>
            <View style={styles.feeIcon}>
              <Text style={{ fontSize: 22 }}>💳</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.feeHeading}>
                Battle Creation Fee
              </Text>

              <Text style={styles.feeSubtitle}>
                One-time creation payment
              </Text>
            </View>
          </View>

          <View style={styles.feeDivider} />

          <Text style={styles.feeType}>
            {battleType === "public"
              ? "🌍 Public Battle"
              : "🏫 Institution Election"}
          </Text>

          <Text style={styles.feeAmount}>
            GH₵ {battleType === "public" ? "1,000" : "2,000"}
          </Text>

          <View style={styles.feeNotice}>
            <Text style={styles.feeNoticeText}>
              Your battle will remain pending until payment verification and admin approval.
            </Text>
          </View>
        </View>

        {/* ================================== */}
        {/* 🚀 CREATE BATTLE BUTTON */}
        {/* ================================== */}

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={loading}
          onPress={createBattle}
          style={[
            styles.createButton,
            loading && { opacity: 0.65 },
          ]}
        >
          {loading ? (
            <>
              <ActivityIndicator color={COLORS.navy} />

              <Text style={styles.createButtonText}>
                Creating Battle...
              </Text>
            </>
          ) : (
            <Text style={styles.createButtonText}>
              {battleType === "public"
                ? "⚔️ Create Public Battle"
                : "🗳️ Create Institution Election"}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          By creating a battle, you agree to Nasara's battle and voting requirements.
        </Text>
      </ScrollView>

      {/* ================================== */}
      {/* 💳 PAYMENT MODAL */}
      {/* ================================== */}

      <Modal
        visible={paymentVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.paymentIcon}>
              <Text style={{ fontSize: 27 }}>💳</Text>
            </View>

            <Text style={styles.paymentTitle}>
              Complete Payment
            </Text>

            <Text style={styles.paymentSubtitle}>
              Your battle has been created and is awaiting payment verification.
            </Text>

            <View style={styles.paymentDetails}>
              <Text style={styles.paymentLabel}>
                AMOUNT TO PAY
              </Text>

              <Text style={styles.paymentAmount}>
                GH₵ {paymentInfo?.amount}
              </Text>

              <View style={styles.paymentDivider} />

              <Text style={styles.paymentLabel}>
                PAYMENT RECIPIENT
              </Text>

              <Text style={styles.paymentRecipient}>
                {momoName}
              </Text>

              <Text style={styles.paymentNumber}>
                {momoNumber}
              </Text>

              <Text style={styles.paymentNetwork}>
                {momoNetwork} Mobile Money
              </Text>

              <View style={styles.paymentDivider} />

              <Text style={styles.paymentLabel}>
                PAYMENT CODE
              </Text>

              <Text style={styles.paymentCode}>
                {paymentInfo?.paymentCode}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setPaymentVisible(false);

                showAlert(
                  "Battle Created",
                  "Your battle is pending payment verification and admin approval."
                );

                router.replace("/my-battle");
              }}
              style={styles.paymentButton}
            >
              <Text style={styles.paymentButtonText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==========================================
// 🎨 PREMIUM SCREEN STYLES
// ==========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 45,
  },

  // 🟦 HEADER

  header: {
    backgroundColor: COLORS.navy,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 27,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF18",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    color: COLORS.white,
    fontSize: 27,
    marginTop: -3,
  },

  headerBadge: {
    backgroundColor: "#FFFFFF18",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  headerBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 25,
  },

  headerDescription: {
    color: "#D5DCE8",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },

  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF12",
    borderRadius: 16,
    padding: 15,
    marginTop: 22,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerInfoTitle: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 14,
  },

  headerInfoSubtitle: {
    color: "#D5DCE8",
    fontSize: 11,
    marginTop: 4,
  },

  // 📦 CARDS

  card: {
    marginHorizontal: 16,
    marginTop: 17,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  sectionNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionNumberText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 14,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  // 🌍 BATTLE TYPE

  typeContainer: {
    flexDirection: "row",
    gap: 10,
  },

  typeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 13,
    minHeight: 155,
    backgroundColor: "#FAFBFD",
  },

  typeCardActive: {
    borderColor: COLORS.gold,
    backgroundColor: "#FCFAF5",
  },

  typeIcon: {
    fontSize: 26,
    marginBottom: 10,
  },

  typeTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  typeTitleActive: {
    color: COLORS.navy,
  },

  typeDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },

  selectedBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.goldLight,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 10,
  },

  selectedBadgeText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 9,
  },

  // 📝 INPUTS

  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 15,
  },

  input: {
    backgroundColor: "#FAFBFD",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 14,
    marginTop: 7,
  },

  helperText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 5,
  },

  voterHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },

  voterCount: {
    backgroundColor: COLORS.goldLight,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },

  voterCountText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 15,
  },

  voterCountLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "800",
  },

  voterInput: {
    height: 125,
    textAlignVertical: "top",
    lineHeight: 21,
  },

  compareInput: {
    minHeight: 85,
    textAlignVertical: "top",
  },

  // 📊 EXCEL

  excelButton: {
    backgroundColor: "#EAF5EF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  excelIcon: {
    fontSize: 18,
    marginRight: 9,
  },

  excelButtonText: {
    color: COLORS.green,
    fontWeight: "900",
    fontSize: 12,
  },

  // 🔒 SWITCHES

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  switchTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  switchDescription: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 15,
  },

  privacyIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  securityBox: {
    backgroundColor: "#F3F7FC",
    padding: 14,
    borderRadius: 13,
    marginTop: 15,
  },

  securityTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },

  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  securityCheck: {
    color: COLORS.green,
    fontWeight: "900",
    marginRight: 8,
  },

  securityText: {
    color: COLORS.text,
    fontSize: 11,
    flex: 1,
  },

  // 👥 PARTICIPANTS

  participantSummary: {
    backgroundColor: COLORS.goldLight,
    borderRadius: 10,
    padding: 11,
    marginTop: 12,
  },

  participantSummaryText: {
    color: COLORS.navy,
    fontWeight: "800",
    fontSize: 11,
  },

  candidateCard: {
    backgroundColor: "#FAFBFD",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 13,
  },

  candidateTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  candidateNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  candidateNumberText: {
    color: COLORS.navy,
    fontWeight: "900",
  },

  candidateName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },

  candidateSub: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },

  candidateAvatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },

  candidateAvatarPlaceholder: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  photoButton: {
    backgroundColor: COLORS.navy,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  photoButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
  },

  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.goldLight,
    borderRadius: 10,
  },

  uploadingText: {
    color: COLORS.navy,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 9,
  },

  // 🏷️ CATEGORY

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  categoryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFBFD",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  categoryButtonActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  categoryText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },

  categoryTextActive: {
    color: COLORS.gold,
  },

  // ⏱️ DURATION

  durationContainer: {
    flexDirection: "row",
    gap: 9,
    marginTop: 8,
  },

  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#FAFBFD",
  },

  durationButtonActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  durationText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 11,
  },

  durationTextActive: {
    color: COLORS.gold,
  },

  // 💰 CREATION FEE

  feeCard: {
    marginHorizontal: 16,
    marginTop: 17,
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 19,
  },

  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  feeIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#FFFFFF18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  feeHeading: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 15,
  },

  feeSubtitle: {
    color: "#D5DCE8",
    fontSize: 10,
    marginTop: 4,
  },

  feeDivider: {
    height: 1,
    backgroundColor: "#FFFFFF25",
    marginVertical: 17,
  },

  feeType: {
    color: "#D5DCE8",
    fontSize: 12,
    fontWeight: "700",
  },

  feeAmount: {
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },

  feeNotice: {
    backgroundColor: "#FFFFFF12",
    padding: 12,
    borderRadius: 11,
    marginTop: 14,
  },

  feeNoticeText: {
    color: "#D5DCE8",
    fontSize: 10,
    lineHeight: 16,
  },

  // 🚀 CREATE BUTTON

  createButton: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.gold,
    borderRadius: 15,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: 56,
  },

  createButtonText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 9,
  },

  bottomNote: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 13,
    marginHorizontal: 30,
  },

  // 💳 PAYMENT MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000085",
    justifyContent: "center",
    padding: 20,
  },

  paymentModal: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
  },

  paymentIcon: {
    alignSelf: "center",
    width: 57,
    height: 57,
    borderRadius: 18,
    backgroundColor: COLORS.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.navy,
    textAlign: "center",
    marginTop: 15,
  },

  paymentSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 7,
  },

  paymentDetails: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 17,
    marginTop: 19,
  },

  paymentLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
  },

  paymentAmount: {
    color: COLORS.green,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 5,
  },

  paymentDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  paymentRecipient: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 7,
  },

  paymentNumber: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 7,
  },

  paymentNetwork: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  paymentCode: {
    color: COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 7,
  },

  paymentButton: {
    backgroundColor: COLORS.navy,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 19,
  },

  paymentButtonText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 14,
  },
});