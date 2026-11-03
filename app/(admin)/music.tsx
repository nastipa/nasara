// ============================================================
// 🎵 NASARA REELS — MUSIC MANAGEMENT
// File: app/(admin)/music.tsx
// ============================================================

import { useCallback, useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect } from "expo-router";

import { useAdminGuard } from "../../hooks/useAdminGuard";
import { supabase } from "../../lib/supabase";

// ============================================================
// 🎵 TYPES
// ============================================================

type ReelMusic = {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  duration: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

type SelectedAudio = {
  uri: string;
  name: string;
  mimeType: string;
  file?: File;
};

// ============================================================
// 🌐 BACKEND
// ============================================================

const API_URL =
  "https://nasara-upload-server.onrender.com/upload-reel-music";

// ============================================================
// 🎵 MAIN SCREEN
// ============================================================

export default function MusicManagement() {
  const { loading: adminLoading } = useAdminGuard();

  const audioPlayer = useAudioPlayer(null);

  // ==========================================================
  // 📦 STATES
  // ==========================================================

  const [music, setMusic] = useState<ReelMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedAudio, setSelectedAudio] =
    useState<SelectedAudio | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState("");

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  // ==========================================================
  // 📥 LOAD MUSIC LIBRARY
  // ==========================================================

  const loadMusic = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("reel_music")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setMusic(data || []);
    } catch (error: any) {
      console.error("MUSIC LOAD ERROR:", error);

      Alert.alert(
        "Music Library",
        error?.message || "Could not load music library."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!adminLoading) {
        loadMusic();
      }
    }, [adminLoading, loadMusic])
  );

  // ==========================================================
  // 🎧 STOP PREVIEW WHEN SCREEN CLOSES
  // ==========================================================

  useEffect(() => {
    return () => {
      try {
        audioPlayer.pause();
      } catch (error) {
        console.log("Audio cleanup:", error);
      }
    };
  }, [audioPlayer]);

  // ==========================================================
  // 📂 SELECT AUDIO FILE
  // ==========================================================

  const selectAudio = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "audio/*",
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      const mimeType =
        asset.mimeType || "application/octet-stream";

      const allowedTypes = [
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
      ];

      if (!allowedTypes.includes(mimeType)) {
        Alert.alert(
          "Unsupported Audio",
          "Please select an MP3, M4A, AAC, WAV or OGG audio file."
        );
        return;
      }

      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert(
          "File Too Large",
          "The maximum upload size is 50 MB."
        );
        return;
      }

      setSelectedAudio({
        uri: asset.uri,
        name: asset.name,
        mimeType,
        file: asset.file,
      });

    } catch (error: any) {
      console.error("AUDIO PICKER ERROR:", error);

      Alert.alert(
        "File Selection",
        error?.message || "Could not select audio file."
      );
    }
  };

  // ==========================================================
  // ☁️ UPLOAD MUSIC TO RENDER / CLOUDFLARE R2
  // ==========================================================

  const uploadMusic = async () => {
    if (!selectedAudio) {
      Alert.alert("Missing Audio", "Select an audio file first.");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Missing Title", "Enter the music title.");
      return;
    }

    try {
      setUploading(true);

      // ==============================================
      // 🔐 GET SUPABASE SESSION
      // ==============================================

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const token = sessionData.session.access_token;

      // ==============================================
      // 📦 BUILD MULTIPART FORM
      // ==============================================

      const formData = new FormData();

      formData.append("title", title.trim());
      formData.append("artist", artist.trim());
      formData.append("category", category.trim());

      if (Platform.OS === "web" && selectedAudio.file) {
        formData.append(
          "file",
          selectedAudio.file,
          selectedAudio.name
        );
      } else {
        formData.append(
          "file",
          {
            uri: selectedAudio.uri,
            name: selectedAudio.name,
            type: selectedAudio.mimeType,
          } as any
        );
      }

      // ==============================================
      // 🚀 SEND TO BACKEND
      // ==============================================

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Music upload failed."
        );
      }

      // ==============================================
      // ✅ RESET FORM
      // ==============================================

      setTitle("");
      setArtist("");
      setCategory("");
      setSelectedAudio(null);

      // Stop any previous preview.
      audioPlayer.pause();
      setPlayingId(null);

      await loadMusic();

      Alert.alert(
        "Upload Successful",
        "Your music has been added to the Nasara Reel music library."
      );

    } catch (error: any) {
      console.error("MUSIC UPLOAD ERROR:", error);

      Alert.alert(
        "Upload Failed",
        error?.message || "Could not upload music."
      );

    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // ▶️ PREVIEW MUSIC
  // ==========================================================

  const previewMusic = async (item: ReelMusic) => {
    try {
      if (playingId === item.id) {
        audioPlayer.pause();
        setPlayingId(null);
        return;
      }

      audioPlayer.pause();
      audioPlayer.replace(item.audio_url);

      audioPlayer.volume = 1;
      audioPlayer.play();

      setPlayingId(item.id);

    } catch (error: any) {
      console.error("MUSIC PREVIEW ERROR:", error);

      setPlayingId(null);

      Alert.alert(
        "Preview Error",
        "Could not play this music file."
      );
    }
  };

  // ==========================================================
  // 🔄 ACTIVATE / DEACTIVATE MUSIC
  // ==========================================================

  const toggleMusicStatus = async (item: ReelMusic) => {
    try {
      const newStatus = !item.is_active;

      const {
        error,
      } = await (supabase as any)
        .from("reel_music")
        .update({
          is_active: newStatus,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }

      setMusic((previous) =>
        previous.map((song) =>
          song.id === item.id
            ? { ...song, is_active: newStatus }
            : song
        )
      );

      Alert.alert(
        "Music Updated",
        newStatus
          ? "Music is now available for Reel creators."
          : "Music is no longer available for new Reel selections."
      );

    } catch (error: any) {
      console.error("MUSIC STATUS ERROR:", error);

      Alert.alert(
        "Update Failed",
        error?.message || "Could not update music status."
      );
    }
  };

  // ==========================================================
  // 🗑️ REMOVE MUSIC FROM LIBRARY
  // ==========================================================

  const removeMusic = (item: ReelMusic) => {
    Alert.alert(
      "Remove Music",
      `Remove "${item.title}" from the Nasara music library?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                error,
              } = await supabase
                .from("reel_music")
                .delete()
                .eq("id", item.id);

              if (error) {
                throw error;
              }

              if (playingId === item.id) {
                audioPlayer.pause();
                setPlayingId(null);
              }

              setMusic((previous) =>
                previous.filter((song) => song.id !== item.id)
              );

              Alert.alert(
                "Removed",
                "Music has been removed from the library."
              );

            } catch (error: any) {
              console.error("MUSIC DELETE ERROR:", error);

              Alert.alert(
                "Remove Failed",
                error?.message || "Could not remove music."
              );
            }
          },
        },
      ]
    );
  };

  // ==========================================================
  // 🔎 FILTER MUSIC
  // ==========================================================

  const filteredMusic = music.filter((item) => {
    if (filter === "active") return item.is_active;
    if (filter === "inactive") return !item.is_active;

    return true;
  });

  // ==========================================================
  // ⏳ LOADING
  // ==========================================================

  if (adminLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>
          Loading music library...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // 🎵 MUSIC CARD
  // ==========================================================

  const renderMusic = ({ item }: { item: ReelMusic }) => (
    <View style={styles.musicCard}>

      <View style={styles.musicInfo}>
        <Text style={styles.musicTitle}>
          {item.title}
        </Text>

        <Text style={styles.musicArtist}>
          {item.artist || "Unknown Artist"}
        </Text>

        <Text style={styles.musicCategory}>
          {item.category || "Uncategorized"}
        </Text>

        <Text
          style={[
            styles.status,
            item.is_active
              ? styles.activeStatus
              : styles.inactiveStatus,
          ]}
        >
          {item.is_active ? "● ACTIVE" : "● INACTIVE"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.previewButton}
        onPress={() => previewMusic(item)}
      >
        <Text style={styles.buttonText}>
          {playingId === item.id ? "⏸️ Pause" : "▶️ Preview"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.statusButton,
          item.is_active
            ? styles.deactivateButton
            : styles.activateButton,
        ]}
        onPress={() => toggleMusicStatus(item)}
      >
        <Text style={styles.buttonText}>
          {item.is_active ? "Deactivate" : "Activate"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => removeMusic(item)}
      >
        <Text style={styles.buttonText}>
          Remove
        </Text>
      </TouchableOpacity>

    </View>
  );

  // ==========================================================
  // 🖥️ SCREEN
  // ==========================================================

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredMusic}
      keyExtractor={(item) => item.id}
      renderItem={renderMusic}
      ListHeaderComponent={
        <View>

          <Text style={styles.heading}>
            🎵 Music Management
          </Text>

          <Text style={styles.description}>
            Manage background music available to Nasara Reel creators.
          </Text>

          {/* ==========================================
              📊 MUSIC STATISTICS
          ========================================== */}

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {music.length}
              </Text>
              <Text style={styles.statLabel}>
                Total Music
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {music.filter((item) => item.is_active).length}
              </Text>
              <Text style={styles.statLabel}>
                Active
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {music.filter((item) => !item.is_active).length}
              </Text>
              <Text style={styles.statLabel}>
                Inactive
              </Text>
            </View>
          </View>

          {/* ==========================================
              📤 UPLOAD MUSIC
          ========================================== */}

          <Text style={styles.sectionHeading}>
            Upload New Music
          </Text>

          <TouchableOpacity
            style={styles.selectButton}
            onPress={selectAudio}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>
              📂 Select Audio File
            </Text>
          </TouchableOpacity>

          {selectedAudio && (
            <View style={styles.selectedFile}>
              <Text style={styles.selectedFileText}>
                Selected: {selectedAudio.name}
              </Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Music title"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.input}
            placeholder="Artist name (optional)"
            placeholderTextColor="#9ca3af"
            value={artist}
            onChangeText={setArtist}
          />

          <TextInput
            style={styles.input}
            placeholder="Category (e.g. Afrobeats, Gospel)"
            placeholderTextColor="#9ca3af"
            value={category}
            onChangeText={setCategory}
          />

          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.disabledButton,
            ]}
            onPress={uploadMusic}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                ☁️ Upload Music
              </Text>
            )}
          </TouchableOpacity>

          {/* ==========================================
              🎧 MUSIC LIBRARY
          ========================================== */}

          <Text style={styles.sectionHeading}>
            Music Library
          </Text>

          <View style={styles.filterContainer}>
            {(["all", "active", "inactive"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.filterButton,
                  filter === value && styles.selectedFilter,
                ]}
                onPress={() => setFilter(value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === value && styles.selectedFilterText,
                  ]}
                >
                  {value.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No music found.
          </Text>
        </View>
      }
      ListFooterComponent={
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadMusic}
        >
          <Text style={styles.buttonText}>
            🔄 Refresh Music Library
          </Text>
        </TouchableOpacity>
      }
    />
  );
}

// ============================================================
// 🎨 STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },

  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  description: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 25,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563eb",
  },

  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },

  sectionHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginTop: 20,
    marginBottom: 12,
  },

  selectButton: {
    backgroundColor: "#374151",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  selectedFile: {
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },

  selectedFileText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
  },

  uploadButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },

  disabledButton: {
    opacity: 0.6,
  },

  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 15,
  },

  filterButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },

  selectedFilter: {
    backgroundColor: "#2563eb",
  },

  filterText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },

  selectedFilterText: {
    color: "#ffffff",
  },

  musicCard: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },

  musicInfo: {
    marginBottom: 5,
  },

  musicTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  musicArtist: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 4,
  },

  musicCategory: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },

  status: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },

  activeStatus: {
    color: "#16a34a",
  },

  inactiveStatus: {
    color: "#dc2626",
  },

  previewButton: {
    backgroundColor: "#374151",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  statusButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  activateButton: {
    backgroundColor: "#16a34a",
  },

  deactivateButton: {
    backgroundColor: "#d97706",
  },

  deleteButton: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },

  emptyContainer: {
    padding: 25,
    alignItems: "center",
  },

  emptyText: {
    color: "#6b7280",
  },

  refreshButton: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
});