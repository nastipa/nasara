import {
  useAudioPlayer
} from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import {
  VideoView,
  useVideoPlayer,
} from "expo-video";

import {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

export default function StatusView() {
  const { id } =
    useLocalSearchParams();

  const [statuses, setStatuses] =
    useState<any[]>([]);

  const [index, setIndex] =
    useState(0);

  const [viewers, setViewers] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [userId, setUserId] =
    useState<string | null>(
      null
    );

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [editText, setEditText] =
    useState("");

  const current =
    statuses[index];

  /* ================= VIDEO PLAYER ================= */

  const player =
    useVideoPlayer(
      current?.type === "video"
        ? current.media_url
        : null,

      (p) => {
        if (
          current?.type ===
          "video"
        ) {
          p.loop = false;

          p.muted = false;

          p.play();
        }
      }
    );
    /* ================= AUDIO PLAYER ================= */

const audioPlayer =
  useAudioPlayer(
    current?.type === "audio"
      ? current.media_url
      : null
  );
  /* ================= LOAD ================= */

  useEffect(() => {
    loadStatuses();
  }, [id]);

  async function loadStatuses() {
    try {
      setLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      setUserId(
        user?.id ?? null
      );

      /* ================= FIRST STATUS ================= */

      const {
        data: first,
        error,
      } =
        await (
          supabase as any
        )
          .from("statuses")
          .select("*")
          .eq("id", id)
          .single();

      if (
        error ||
        !first
      ) {
        console.log(error);

        setStatuses([]);

        setLoading(false);

        return;
      }

      /* ================= FOLLOWERS ONLY ================= */

      if (
        first.visibility ===
          "followers" &&
        user?.id &&
        user.id !==
          first.user_id
      ) {
        const {
          data: followData,
        } =
          await (
            supabase as any
          )
            .from("follows")
            .select("id")
            .eq(
              "follower_id",
              user.id
            )
            .eq(
              "following_id",
              first.user_id
            )
            .maybeSingle();

        if (!followData) {
          setStatuses([
            {
              id: "private",

              type: "text",

              text:
                "🔒 Followers only status",

              background:
                "#111827",

              user_id:
                first.user_id,
            },
          ]);

          setLoading(false);

          return;
        }
      }

      /* ================= LOAD USER STATUSES ================= */

      const {
        data,
        error: loadError,
      } =
        await (
          supabase as any
        )
          .from("statuses")
          .select("*")
          .eq(
            "user_id",
            first.user_id
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          );

      if (loadError) {
        console.log(
          loadError
        );

        setStatuses([]);

        setLoading(false);

        return;
      }

      /* ================= REMOVE EXPIRED ================= */

      const now =
        new Date().getTime();

      const validStatuses: any[] =
        [];

      const expiredIds: any[] =
        [];

      for (const status of data || []) {
        const created =
          new Date(
            status.created_at
          ).getTime();

        const diff =
          now - created;

        const isExpired =
          diff >=
          24 *
            60 *
            60 *
            1000;

        if (isExpired) {
          expiredIds.push(
            status.id
          );
        } else {
          validStatuses.push(
            status
          );
        }
      }

      /* DELETE EXPIRED */

      if (
        expiredIds.length > 0
      ) {
        await (
          supabase as any
        )
          .from("statuses")
          .delete()
          .in(
            "id",
            expiredIds
          );
      }

      /* EMPTY FIX */

      if (
        validStatuses.length ===
        0
      ) {
        setStatuses([]);

        setLoading(false);

        return;
      }

      /* UPDATE INDEX */

      const currentIndex =
        validStatuses.findIndex(
          (s) =>
            String(s.id) ===
            String(id)
        );

      setStatuses(
        validStatuses
      );

      if (
        currentIndex >= 0
      ) {
        setIndex(
          currentIndex
        );
      } else {
        setIndex(0);
      }

      setLoading(false);

    } catch (e) {
      console.log(e);

      setLoading(false);
    }
  }

  /* ================= AUTO NEXT ================= */

  useEffect(() => {
    if (!current) return;

    saveViewAndLoad();

    if (
  current.type !== "video" &&
  current.type !== "audio"
) {
      const t =
        setTimeout(() => {
          nextStatus();
        }, 5000);

      return () =>
        clearTimeout(t);
    }

    const sub =
      player?.addListener(
        "playToEnd",
        () => {
          nextStatus();
        }
      );
      const audioSub =
  audioPlayer?.addListener(
    "playbackStatusUpdate",
    (status: any) => {
      if (
        status?.didJustFinish
      ) {
        nextStatus();
      }
    }
  );

   return () => {
  sub?.remove();
  audioSub?.remove();
};

  }, [current?.id]);
  /* ================= AUTO PLAY AUDIO ================= */

useEffect(() => {
  if (
    current?.type === "audio" &&
    audioPlayer
  ) {
    audioPlayer.play();
  }
}, [current?.id]);

  /* ================= SAVE VIEW ================= */

  async function saveViewAndLoad() {
    if (!current) return;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (user) {
      const { error } =
        await (
          supabase as any
        )
          .from(
            "status_views"
          )
          .upsert(
            {
              status_id:
                current.id,

              viewer_id:
                user.id,
            },

            {
              onConflict:
                "status_id,viewer_id",
            }
          );

      if (error) {
        console.log(
          "save view error",
          error
        );
      }
    }

    await loadViewers(
      current.id
    );
  }

  /* ================= LOAD VIEWERS ================= */

  async function loadViewers(
    statusId: string
  ) {
    const {
      data,
      error,
    } =
      await (
        supabase as any
      )
        .from(
          "status_views"
        )
        .select("*")
        .eq(
          "status_id",
          statusId
        );

    if (error) {
      console.log(error);

      return;
    }

    if (!data?.length) {
      setViewers([]);

      return;
    }

    const ids =
      data.map(
        (v: any) =>
          v.viewer_id
      );

    const {
      data: profiles,
    } =
      await (
        supabase as any
      )
        .from("profiles")
        .select(
          "id, full_name"
        )
        .in("id", ids);

    const merged =
      data.map(
        (v: any) => ({
          ...v,

          profiles:
            profiles?.find(
              (p: any) =>
                p.id ===
                v.viewer_id
            ),
        })
      );

    setViewers(merged);
  }

  /* ================= NEXT ================= */

  function nextStatus() {
    if (
      index <
      statuses.length - 1
    ) {
      setIndex(
        (v) => v + 1
      );
    }
  }

  /* ================= PREVIOUS ================= */

  function previousStatus() {
    if (index > 0) {
      setIndex(
        (v) => v - 1
      );

    } else {
      setIndex(
        statuses.length - 1
      );
    }
  }

  /* ================= EDIT STATUS ================= */

  async function editStatus() {
    if (!current) return;

    if (
      current.type !==
      "text"
    ) {
      Alert.alert(
        "Info",
        "Only text statuses can be edited"
      );

      return;
    }

    /* WEB */

    if (
      Platform.OS === "web"
    ) {
      const newText =
        window.prompt(
          "Edit your status",
          current.text || ""
        );

      if (
        !newText ||
        newText.trim() === ""
      ) {
        return;
      }

      const { error } =
        await (
          supabase as any
        )
          .from("statuses")
          .update({
            text: newText,
          })
          .eq(
            "id",
            current.id
          );

      if (error) {
        window.alert(
          "Failed to edit status"
        );

        return;
      }

      const updated =
        statuses.map((s) =>
          s.id === current.id
            ? {
                ...s,
                text:
                  newText,
              }
            : s
        );

      setStatuses(updated);

      setMenuOpen(false);

      return;
    }

    /* MOBILE */

    setEditText(
      current.text || ""
    );

    setEditOpen(true);

    setMenuOpen(false);
  }

  /* ================= SAVE EDIT ================= */

  async function saveEditedStatus() {
    if (
      !editText ||
      editText.trim() ===
        ""
    ) {
      return;
    }

    const trimmed =
      editText.trim();

    const {
  data: updatedData,
  error,
} =
  await (
    supabase as any
  )
    .from("statuses")
    .update({
      text: trimmed,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      current.id
    )
    .select()
    .single();

    if (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Failed to edit status"
      );

      return;
    }

   const updatedStatuses =
  statuses.map((s) =>
    s.id === current.id
      ? {
          ...s,
          ...updatedData,
        }
      : s
  );

    setStatuses(
      updatedStatuses
    );

    const newIndex =
      updatedStatuses.findIndex(
        (s) =>
          s.id === current.id
      );

    if (newIndex !== -1) {
      setIndex(newIndex);
    }

    setEditOpen(false);

    setEditText("");

    
    Alert.alert(
      "Success",
      "Status updated"
    );
  }

  /* ================= DELETE STATUS ================= */

  async function deleteStatus() {
    if (!current) return;

    /* WEB */

    if (
      Platform.OS === "web"
    ) {
      const confirmed =
        window.confirm(
          "Delete this status?"
        );

      if (!confirmed)
        return;

      const { error } =
        await supabase
          .from("statuses")
          .delete()
          .eq(
            "id",
            current.id
          );

      if (error) {
        window.alert(
          "Failed to delete status"
        );

        return;
      }

      const updated =
        statuses.filter(
          (s) =>
            s.id !==
            current.id
        );

      setStatuses(updated);

      if (
        updated.length ===
        0
      ) {
        setStatuses([]);
      }

      if (
        index >=
        updated.length
      ) {
        setIndex(
          Math.max(
            0,
            updated.length - 1
          )
        );
      }

      setMenuOpen(false);

      return;
    }

    /* MOBILE */

    Alert.alert(
      "Delete Status",
      "Are you sure you want to delete this status?",
      [
        {
          text: "Cancel",
          style:
            "cancel",
        },

        {
          text: "Delete",

          style:
            "destructive",

          onPress:
            async () => {
              const {
                error,
              } =
                await supabase
                  .from(
                    "statuses"
                  )
                  .delete()
                  .eq(
                    "id",
                    current.id
                  );

              if (error) {
                console.log(
                  error
                );

                Alert.alert(
                  "Error",
                  "Failed to delete status"
                );

                return;
              }

              const updated =
                statuses.filter(
                  (s) =>
                    s.id !==
                    current.id
                );

              setStatuses(
                updated
              );

              if (
                updated.length ===
                0
              ) {
                setStatuses(
                  []
                );
              }

              if (
                index >=
                updated.length
              ) {
                setIndex(
                  Math.max(
                    0,
                    updated.length -
                      1
                  )
                );
              }

              setMenuOpen(
                false
              );
            },
        },
      ]
    );
  }

  /* ================= LOADING ================= */

  if (
    loading ||
    !current ||
    statuses.length === 0
  ) {
    return (
      <View
        style={{
          flex: 1,

          justifyContent:
            "center",

          alignItems:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />

        <Text>
          Loading status...
        </Text>
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor:
          "black",
      }}
    >
      {/* PROGRESS */}

      <View
        style={{
          flexDirection:
            "row",

          paddingTop: 50,

          paddingHorizontal: 8,
        }}
      >
        {statuses.map(
          (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,

                height: 3,

                backgroundColor:
                  i <= index
                    ? "white"
                    : "#555",

                marginHorizontal: 2,

                borderRadius: 2,
              }}
            />
          )
        )}
      </View>

      {/* TOP ACTIONS */}

      {current.user_id ===
        userId && (
        <View
          style={{
            position:
              "absolute",

            top: 55,

            right: 15,

            zIndex: 999,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              setMenuOpen(
                !menuOpen
              )
            }
            style={{
              padding: 8,
            }}
          >
            <Text
              style={{
                color:
                  "white",

                fontSize: 24,

                fontWeight:
                  "bold",
              }}
            >
              ⋮
            </Text>
          </TouchableOpacity>

          {menuOpen && (
            <View
              style={{
                backgroundColor:
                  "#111827",

                borderRadius: 10,

                paddingVertical: 8,

                width: 140,
              }}
            >
              <TouchableOpacity
                onPress={
                  editStatus
                }
                style={{
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color:
                      "white",
                  }}
                >
                  Edit Status
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={
                  deleteStatus
                }
                style={{
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color:
                      "red",
                  }}
                >
                  Delete Status
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* STATUS CONTENT */}

      {current.type ===
      "text" ? (
        <View
          style={{
            flex: 1,

            backgroundColor:
              current.background ||
              "#111827",

            justifyContent:
              "center",

            alignItems:
              "center",

            padding: 20,
          }}
        >
          <Text
            style={{
              color:
                "white",

              fontSize: 28,

              textAlign:
                "center",
            }}
          >
            {current.text}
          </Text>
        </View>

      ) : current.type ===
        "image" ? (
        <Image
          source={{
            uri:
              current.media_url,
          }}
          style={{
            flex: 1,
          }}
          resizeMode="contain"
        />

      ) : current.type ===
  "audio" ? (

  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
    }}
  >
    <View
      style={{
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "#2563eb",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 70,
          color: "white",
        }}
      >
        🎤
      </Text>
    </View>

    <Text
      style={{
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 30,
      }}
    >
      Voice Status
    </Text>

    <TouchableOpacity
      onPress={() =>
        audioPlayer.play()
      }
      style={{
        marginTop: 25,
        backgroundColor: "#22c55e",
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 14,
      }}
    >
      <Text
        style={{
          color: "white",
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        ▶️ Play Voice
      </Text>
    </TouchableOpacity>
  </View>

) : (

  <VideoView
    player={player}
          style={{
            width: "100%",
            height: "100%",
          }}
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture={
            false
          }
          nativeControls={true}
        />
      )}

      {/* LEFT TAP */}

      <TouchableOpacity
        onPress={
          previousStatus
        }
        style={{
          position:
            "absolute",

          top: 0,

          left: 0,

          width: "50%",

          height: "100%",

          zIndex: 20,
        }}
      />

      {/* RIGHT TAP */}

      <TouchableOpacity
        onPress={nextStatus}
        style={{
          position:
            "absolute",

          top: 0,

          right: 0,

          width: "50%",

          height: "100%",

          zIndex: 20,
        }}
      />

      {/* VIEWERS */}

      {current.user_id ===
        userId && (
        <View
          style={{
            position:
              "absolute",

            bottom: 30,

            left: 20,

            right: 20,

            backgroundColor:
              "rgba(0,0,0,0.5)",

            padding: 10,

            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color:
                "white",

              fontWeight:
                "bold",
            }}
          >
            👁️{" "}
            {
              viewers.length
            }{" "}
            views
          </Text>

          {viewers
            .slice(0, 10)
            .map((v, i) => (
              <Text
                key={i}
                style={{
                  color:
                    "white",
                }}
              >
                {v.profiles
                  ?.full_name ||
                  "User"}
              </Text>
            ))}
        </View>
      )}

      {/* EDIT MODAL */}

      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
      >
        <View
          style={{
            flex: 1,

            justifyContent:
              "center",

            alignItems:
              "center",

            backgroundColor:
              "rgba(0,0,0,0.7)",

            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",

              backgroundColor:
                "#111827",

              borderRadius: 12,

              padding: 20,
            }}
          >
            <Text
              style={{
                color:
                  "white",

                fontSize: 18,

                fontWeight:
                  "bold",

                marginBottom: 15,
              }}
            >
              Edit Status
            </Text>

            <TextInput
              value={editText}
              onChangeText={
                setEditText
              }
              placeholder="Edit status..."
              placeholderTextColor="#9ca3af"
              multiline
              style={{
                color:
                  "white",

                borderWidth: 1,

                borderColor:
                  "#374151",

                borderRadius: 10,

                padding: 12,

                minHeight: 100,

                textAlignVertical:
                  "top",
              }}
            />

            <View
              style={{
                flexDirection:
                  "row",

                marginTop: 20,

                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setEditOpen(
                    false
                  )
                }
                style={{
                  flex: 1,

                  backgroundColor:
                    "#374151",

                  padding: 14,

                  borderRadius: 10,

                  alignItems:
                    "center",
                }}
              >
                <Text
                  style={{
                    color:
                      "white",

                    fontWeight:
                      "bold",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={
                  saveEditedStatus
                }
                style={{
                  flex: 1,

                  backgroundColor:
                    "#2563eb",

                  padding: 14,

                  borderRadius: 10,

                  alignItems:
                    "center",
                }}
              >
                <Text
                  style={{
                    color:
                      "white",

                    fontWeight:
                      "bold",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}