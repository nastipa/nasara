// 🟡 =====================================================
// 🟡 NASARA PREMIUM GROUP CREATION
// 🟡 Navy • Gold • White
// 🟡 Followers • Discover Users • My Contacts
// 🟡 Search • Multi-Select • Preselected Contacts
// 🟡 Group Image Upload • Existing Supabase Tables
// 🟡 =====================================================

import * as ImagePicker from "expo-image-picker";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";

// 🔵 =====================================================
// 🔵 TYPES
// 🔵 =====================================================

type User = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  username?: string | null;
  verified?: boolean;
};

type GroupTab =
  | "followers"
  | "discover"
  | "contacts";

// 🔵 =====================================================
// 🔵 API CONFIGURATION
// 🔵 =====================================================

const API_BASE_URL =
  "https://nasara-upload-server.onrender.com";

// 🔵 =====================================================
// 🔵 MAIN SCREEN
// 🔵 =====================================================

export default function CreateGroup() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    contactIds?: string | string[];
  }>();

  // 🟡 GROUP DETAILS

  const [groupName, setGroupName] =
    useState("");

  const [groupImage, setGroupImage] =
    useState("");

  // 🟡 LOADING STATES

  const [loading, setLoading] =
    useState(false);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [loadingContacts, setLoadingContacts] =
    useState(false);

  // 🟡 TABS

  const [tab, setTab] =
    useState<GroupTab>("followers");

  // 🟡 USER LISTS

  const [followers, setFollowers] =
    useState<User[]>([]);

  const [discoverUsers, setDiscoverUsers] =
    useState<User[]>([]);

  const [contacts, setContacts] =
    useState<User[]>([]);

  // 🟡 USER IDs

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [selectedUsers, setSelectedUsers] =
    useState<string[]>([]);

  // 🟡 SEARCH

  const [search, setSearch] =
    useState("");

  // 🔵 =====================================================
  // 🔵 PRESELECT CONTACTS FROM CONTACTS SCREEN
  // 🔵 =====================================================

  useEffect(() => {
    const rawIds = params.contactIds;

    if (!rawIds) return;

    const ids = Array.isArray(rawIds)
      ? rawIds.flatMap((value) => value.split(","))
      : rawIds.split(",");

    const cleanedIds = [
      ...new Set(
        ids
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];

    if (cleanedIds.length > 0) {
      setSelectedUsers((previous) => [
        ...new Set([
          ...previous,
          ...cleanedIds,
        ]),
      ]);

      setTab("contacts");
    }
  }, [params.contactIds]);

  // 🔵 =====================================================
  // 🔵 LOAD CURRENT USER
  // 🔵 =====================================================

  useEffect(() => {
    loadUsers();
  }, []);

  // 🔵 =====================================================
  // 🔵 LOAD FOLLOWERS AND DISCOVER USERS
  // 🔵 =====================================================

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        Alert.alert(
          "Login required",
          "Please log in to create a group."
        );
        return;
      }

      setCurrentUserId(user.id);

      // 🟡 LOAD FOLLOWERS

      const { data: followerRows, error: followerError } =
        await (supabase as any)
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);

      if (followerError) {
        console.log(
          "Followers error:",
          followerError
        );
      }

      const followerIds = [
        ...new Set(
          (followerRows || [])
            .map((item: any) => item.follower_id)
            .filter(Boolean)
            .filter((id: string) => id !== user.id)
        ),
      ];

      if (followerIds.length > 0) {
        const {
          data: followerProfiles,
          error,
        } = await (supabase as any)
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url, verified"
          )
          .in("id", followerIds)
          .order("full_name", {
            ascending: true,
          });

        if (error) {
          console.log(
            "Follower profiles error:",
            error
          );
        }

        setFollowers(followerProfiles || []);
      } else {
        setFollowers([]);
      }

      // 🟡 LOAD DISCOVER USERS

      const {
        data: discoverProfiles,
        error: discoverError,
      } = await (supabase as any)
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, verified"
        )
        .neq("id", user.id)
        .order("full_name", {
          ascending: true,
        })
        .limit(200);

      if (discoverError) {
        console.log(
          "Discover users error:",
          discoverError
        );
      }

      setDiscoverUsers(
        discoverProfiles || []
      );

      // 🟡 LOAD SAVED CONTACTS

      await loadContacts(user.id);
    } catch (error) {
      console.log(
        "loadUsers error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load group members."
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 LOAD MY NASARA CONTACTS
  // 🔵 EXISTING RENDER BACKEND
  // 🔵 =====================================================

  const loadContacts = async (
    userId?: string
  ) => {
    try {
      setLoadingContacts(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error(
          "Your login session has expired."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Could not load contacts."
        );
      }

      const savedContacts: User[] =
        Array.isArray(result.contacts)
          ? result.contacts
              .map((contact: any) => ({
                id: contact.id,
                full_name:
                  contact.full_name || "Nasara User",
                avatar_url:
                  contact.avatar_url || null,
                username:
                  contact.username || null,
                verified:
                  contact.verified || false,
              }))
              .filter(
                (contact: User) =>
                  contact.id &&
                  contact.id !== (userId || currentUserId)
              )
          : [];

      setContacts(savedContacts);
    } catch (error: any) {
      console.log(
        "loadContacts error:",
        error
      );

      Alert.alert(
        "Contacts",
        error.message ||
          "Unable to load your saved contacts."
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 PICK GROUP IMAGE
  // 🔵 =====================================================

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to select a group image."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
          aspect: [1, 1],
        });

      if (result.canceled) return;

      setGroupImage(
        result.assets[0].uri
      );
    } catch (error) {
      console.log(
        "pickImage error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not select the group image."
      );
    }
  };

  // 🔵 =====================================================
  // 🔵 UPLOAD GROUP IMAGE
  // 🔵 EXISTING NASARA UPLOAD SERVER
  // 🔵 =====================================================

  const uploadToServer = async (
    uri: string,
    fileName?: string
  ): Promise<string> => {
    const formData = new FormData();

    const ext =
      fileName?.split(".").pop()?.toLowerCase() ||
      "jpg";

    const mimeType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    const finalName =
      fileName ||
      `group-${Date.now()}.${ext}`;

    if (Platform.OS === "web") {
      const response = await fetch(uri);

      if (!response.ok) {
        throw new Error(
          "Could not read the selected image."
        );
      }

      const blob = await response.blob();

      formData.append(
        "file",
        blob,
        finalName
      );
    } else {
      formData.append(
        "file",
        {
          uri,
          name: finalName,
          type: mimeType,
        } as any
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
        result?.message ||
        "Image upload failed."
      );
    }

    let url =
      result?.url ||
      result?.file ||
      result?.path;

    if (!url) {
      throw new Error(
        "The upload server did not return an image URL."
      );
    }

    if (!url.startsWith("http")) {
      url = `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
    }

    return url;
  };

  // 🔵 =====================================================
  // 🔵 SELECT / UNSELECT USER
  // 🔵 =====================================================

  const toggleUser = (id: string) => {
    if (!id || id === currentUserId) return;

    setSelectedUsers((previous) => {
      if (previous.includes(id)) {
        return previous.filter(
          (userId) => userId !== id
        );
      }

      return [
        ...previous,
        id,
      ];
    });
  };

  // 🔵 =====================================================
  // 🔵 REMOVE SELECTED USER
  // 🔵 =====================================================

  const removeSelectedUser = (id: string) => {
    setSelectedUsers((previous) =>
      previous.filter(
        (userId) => userId !== id
      )
    );
  };

  // 🔵 =====================================================
  // 🔵 GET ALL AVAILABLE USERS
  // 🔵 =====================================================

  const allAvailableUsers = useMemo(() => {
    return [
      ...followers,
      ...discoverUsers,
      ...contacts,
    ];
  }, [
    followers,
    discoverUsers,
    contacts,
  ]);

  // 🔵 =====================================================
  // 🔵 FILTER DUPLICATES
  // 🔵 =====================================================

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, User>();

    allAvailableUsers.forEach((user) => {
      if (user.id && user.id !== currentUserId) {
        map.set(user.id, user);
      }
    });

    return Array.from(map.values());
  }, [
    allAvailableUsers,
    currentUserId,
  ]);

  // 🔵 =====================================================
  // 🔵 GET SELECTED USER DETAILS
  // 🔵 =====================================================

  const selectedUserDetails = useMemo(() => {
    return selectedUsers.map((id) => {
      return (
        uniqueUsers.find(
          (user) => user.id === id
        ) || {
          id,
          full_name: "Selected Contact",
          avatar_url: null,
        }
      );
    });
  }, [
    selectedUsers,
    uniqueUsers,
  ]);

  // 🔵 =====================================================
  // 🔵 CURRENT TAB USERS
  // 🔵 =====================================================

  const users =
    tab === "followers"
      ? followers
      : tab === "discover"
        ? discoverUsers
        : contacts;

  // 🔵 =====================================================
  // 🔵 SEARCH FILTER
  // 🔵 =====================================================

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) => {
      const name =
        user.full_name?.toLowerCase() || "";

      const username =
        user.username?.toLowerCase() || "";

      return (
        name.includes(query) ||
        username.includes(query)
      );
    });
  }, [
    users,
    search,
  ]);

  // 🔵 =====================================================
  // 🔵 CREATE GROUP
  // 🔵 =====================================================

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert(
        "Group name required",
        "Please enter a name for your group."
      );
      return;
    }

    if (!currentUserId) {
      Alert.alert(
        "Login required",
        "Please log in again."
      );
      return;
    }

    try {
      setLoading(true);

      let imageUrl = "";

      // 🟡 UPLOAD IMAGE

      if (groupImage) {
        imageUrl = await uploadToServer(
          groupImage
        );
      }

      // 🟡 CREATE GROUP

      const {
        data,
        error,
      } = await (supabase as any)
        .from("groups")
        .insert({
          name: groupName.trim(),
          image_url: imageUrl,
          owner_id: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      if (!data?.id) {
        throw new Error(
          "Group was created without a valid ID."
        );
      }

      // 🟡 ADD ADMIN AND MEMBERS

      const memberIds = [
        ...new Set(
          selectedUsers.filter(
            (id) =>
              id &&
              id !== currentUserId
          )
        ),
      ];

      const members = [
        {
          group_id: data.id,
          user_id: currentUserId,
          role: "admin",
        },

        ...memberIds.map((id) => ({
          group_id: data.id,
          user_id: id,
          role: "member",
        })),
      ];

      const {
        error: memberError,
      } = await (supabase as any)
        .from("group_members")
        .insert(members);

      if (memberError) {
        console.log(
          "Group members insert error:",
          memberError
        );

        throw memberError;
      }

      Alert.alert(
        "Group created",
        `${groupName.trim()} has been created successfully.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.log(
        "createGroup error:",
        error
      );

      Alert.alert(
        "Could not create group",
        error.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 REFRESH CURRENT TAB
  // 🔵 =====================================================

  const refreshCurrentTab = useCallback(() => {
    if (tab === "contacts") {
      loadContacts(currentUserId || undefined);
    } else {
      loadUsers();
    }
  }, [
    tab,
    currentUserId,
  ]);

  // 🔵 =====================================================
  // 🔵 RENDER USER CARD
  // 🔵 =====================================================

  const renderUser = ({ item }: { item: User }) => {
    const selected =
      selectedUsers.includes(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggleUser(item.id)}
        style={[
          styles.userCard,
          selected && styles.userCardSelected,
        ]}
      >
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image
              source={{
                uri: item.avatar_url,
              }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>
                {item.full_name?.charAt(0)?.toUpperCase() || "N"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={styles.userName}
            >
              {item.full_name || "Nasara User"}
            </Text>

            {item.verified && (
              <Text style={styles.verified}>
                ✓
              </Text>
            )}
          </View>

          <Text
            numberOfLines={1}
            style={styles.username}
          >
            {item.username
              ? `@${item.username}`
              : "Nasara member"}
          </Text>
        </View>

        <View
          style={[
            styles.checkCircle,
            selected && styles.checkCircleSelected,
          ]}
        >
          {selected ? (
            <Text style={styles.checkMark}>
              ✓
            </Text>
          ) : (
            <Text style={styles.plusMark}>
              +
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 🔵 =====================================================
  // 🔵 MAIN UI
  // 🔵 =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#101B35"
      />

      {/* 🟡 TOP HEADER */}

      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            Create Group
          </Text>

          <Text style={styles.headerSubtitle}>
            Bring your people together
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerEmoji}>
            👥
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <>
            {/* 🟡 GROUP DETAILS CARD */}

            <View style={styles.groupCard}>
              <Text style={styles.sectionTitle}>
                Group information
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={pickImage}
                style={styles.imagePicker}
              >
                {groupImage ? (
                  <Image
                    source={{
                      uri: groupImage,
                    }}
                    style={styles.groupImage}
                  />
                ) : (
                  <View style={styles.groupImagePlaceholder}>
                    <Text style={styles.groupImageEmoji}>
                      👥
                    </Text>

                    <View style={styles.cameraBadge}>
                      <Text style={styles.cameraText}>
                        +
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.imagePickerText}>
                  <Text style={styles.imageTitle}>
                    Group photo
                  </Text>

                  <Text style={styles.imageSubtitle}>
                    Add a photo to identify your group
                  </Text>

                  <Text style={styles.changePhoto}>
                    {groupImage
                      ? "Change photo"
                      : "Choose photo"}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>
                Group name
              </Text>

              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Enter your group name"
                placeholderTextColor="#8992A5"
                maxLength={60}
                style={styles.groupNameInput}
              />

              <Text style={styles.characterCount}>
                {groupName.length}/60
              </Text>
            </View>

            {/* 🟡 MEMBER SECTION */}

            <View style={styles.memberHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Add group members
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Select people you want in this group
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {selectedUsers.length}
                </Text>
              </View>
            </View>

            {/* 🟡 SELECTED MEMBERS */}

            {selectedUserDetails.length > 0 && (
              <View style={styles.selectedContainer}>
                <FlatList
                  horizontal
                  data={selectedUserDetails}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.selectedMember}>
                      <View style={styles.selectedAvatarContainer}>
                        {item.avatar_url ? (
                          <Image
                            source={{
                              uri: item.avatar_url,
                            }}
                            style={styles.selectedAvatar}
                          />
                        ) : (
                          <View style={styles.selectedAvatarFallback}>
                            <Text style={styles.selectedAvatarLetter}>
                              {item.full_name?.charAt(0)?.toUpperCase() || "N"}
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={() =>
                            removeSelectedUser(item.id)
                          }
                          style={styles.removeSelected}
                        >
                          <Text style={styles.removeSelectedText}>
                            ×
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text
                        numberOfLines={1}
                        style={styles.selectedName}
                      >
                        {item.full_name}
                      </Text>
                    </View>
                  )}
                />
              </View>
            )}

            {/* 🟡 MEMBER TABS */}

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                onPress={() => {
                  setTab("followers");
                  setSearch("");
                }}
                style={[
                  styles.tabButton,
                  tab === "followers" && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "followers" && styles.activeTabText,
                  ]}
                >
                  Followers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTab("discover");
                  setSearch("");
                }}
                style={[
                  styles.tabButton,
                  tab === "discover" && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "discover" && styles.activeTabText,
                  ]}
                >
                  Discover
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setTab("contacts");
                  setSearch("");
                }}
                style={[
                  styles.tabButton,
                  tab === "contacts" && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "contacts" && styles.activeTabText,
                  ]}
                >
                  Contacts
                </Text>

                {contacts.length > 0 && (
                  <View style={styles.contactTabCount}>
                    <Text style={styles.contactTabCountText}>
                      {contacts.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* 🟡 SEARCH */}

            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>
                ⌕
              </Text>

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search members..."
                placeholderTextColor="#8992A5"
                style={styles.searchInput}
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                >
                  <Text style={styles.clearSearch}>
                    ×
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 🟡 LIST TITLE */}

            <View style={styles.listTitleRow}>
              <Text style={styles.listTitle}>
                {tab === "followers"
                  ? "Your followers"
                  : tab === "discover"
                    ? "Discover Nasara users"
                    : "My saved contacts"}
              </Text>

              <TouchableOpacity
                onPress={refreshCurrentTab}
                disabled={loadingUsers || loadingContacts}
              >
                <Text style={styles.refreshText}>
                  ↻ Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }

        ListEmptyComponent={
          loadingUsers ||
          (tab === "contacts" && loadingContacts) ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator
                size="large"
                color="#D6AD55"
              />

              <Text style={styles.emptyText}>
                Loading members...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {tab === "contacts" ? "📱" : "👥"}
              </Text>

              <Text style={styles.emptyTitle}>
                {search
                  ? "No matching users"
                  : tab === "contacts"
                    ? "No saved contacts"
                    : "No users found"}
              </Text>

              <Text style={styles.emptyText}>
                {search
                  ? "Try another name or username."
                  : tab === "contacts"
                    ? "Add Nasara users to your contacts first."
                    : "There are no users to display here yet."}
              </Text>
            </View>
          )
        }

        ListFooterComponent={
          <View style={styles.footerSpace} />
        }
      />

      {/* 🟡 BOTTOM CREATE BUTTON */}

      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>
            {selectedUsers.length} members selected
          </Text>

          <Text style={styles.bottomHint}>
            You will be the group admin
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={createGroup}
          disabled={loading}
          style={[
            styles.createButton,
            loading && styles.createButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color="#101B35"
            />
          ) : (
            <Text style={styles.createButtonText}>
              Create Group →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// 🔵 =====================================================
// 🔵 PREMIUM NAVY • GOLD • WHITE STYLES
// 🔵 =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F5F9",
  },

  // 🟡 HEADER

  topHeader: {
    backgroundColor: "#101B35",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 17,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 37,
    marginTop: -4,
  },

  headerTitleContainer: {
    flex: 1,
    marginLeft: 13,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#C6CDDA",
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(214,173,85,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerEmoji: {
    fontSize: 22,
  },

  // 🟡 LIST

  listContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // 🟡 GROUP CARD

  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 23,
    borderWidth: 1,
    borderColor: "#E8EBF1",
    elevation: 2,
  },

  sectionTitle: {
    color: "#101B35",
    fontSize: 17,
    fontWeight: "900",
  },

  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 19,
    marginBottom: 20,
  },

  groupImage: {
    width: 82,
    height: 82,
    borderRadius: 23,
    backgroundColor: "#E8EBF1",
  },

  groupImagePlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 23,
    backgroundColor: "#101B35",
    alignItems: "center",
    justifyContent: "center",
  },

  groupImageEmoji: {
    fontSize: 34,
  },

  cameraBadge: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#D6AD55",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraText: {
    color: "#101B35",
    fontWeight: "900",
    fontSize: 19,
  },

  imagePickerText: {
    flex: 1,
    marginLeft: 16,
  },

  imageTitle: {
    color: "#101B35",
    fontWeight: "800",
    fontSize: 15,
  },

  imageSubtitle: {
    color: "#8992A5",
    fontSize: 11,
    marginTop: 5,
  },

  changePhoto: {
    color: "#A77C24",
    fontWeight: "800",
    fontSize: 12,
    marginTop: 7,
  },

  inputLabel: {
    color: "#34405A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  groupNameInput: {
    backgroundColor: "#F3F5F9",
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: "#101B35",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E6EAF1",
  },

  characterCount: {
    textAlign: "right",
    color: "#8992A5",
    fontSize: 10,
    marginTop: 6,
  },

  // 🟡 MEMBER HEADER

  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionSubtitle: {
    color: "#8992A5",
    fontSize: 12,
    marginTop: 5,
  },

  countBadge: {
    minWidth: 37,
    height: 37,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: "#101B35",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    color: "#D6AD55",
    fontSize: 15,
    fontWeight: "900",
  },

  // 🟡 SELECTED MEMBERS

  selectedContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 13,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "#E8EBF1",
  },

  selectedMember: {
    width: 68,
    alignItems: "center",
    marginRight: 12,
  },

  selectedAvatarContainer: {
    position: "relative",
  },

  selectedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  selectedAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#101B35",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedAvatarLetter: {
    color: "#D6AD55",
    fontSize: 18,
    fontWeight: "900",
  },

  removeSelected: {
    position: "absolute",
    right: -5,
    top: -5,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#D94A4A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  removeSelectedText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 17,
  },

  selectedName: {
    color: "#34405A",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 7,
    textAlign: "center",
    width: 65,
  },

  // 🟡 TABS

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#E7EAF0",
    padding: 5,
    borderRadius: 15,
    marginBottom: 15,
  },

  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 11,
    gap: 5,
  },

  activeTab: {
    backgroundColor: "#101B35",
  },

  tabText: {
    color: "#667087",
    fontSize: 11,
    fontWeight: "800",
  },

  activeTabText: {
    color: "#D6AD55",
  },

  contactTabCount: {
    backgroundColor: "#D6AD55",
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  contactTabCountText: {
    color: "#101B35",
    fontSize: 9,
    fontWeight: "900",
  },

  // 🟡 SEARCH

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E9F0",
    paddingHorizontal: 13,
    marginBottom: 17,
  },

  searchIcon: {
    fontSize: 25,
    color: "#A77C24",
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 13,
    color: "#101B35",
    fontSize: 13,
  },

  clearSearch: {
    color: "#8992A5",
    fontSize: 23,
    paddingHorizontal: 5,
  },

  // 🟡 LIST TITLE

  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  listTitle: {
    color: "#101B35",
    fontSize: 14,
    fontWeight: "900",
  },

  refreshText: {
    color: "#A77C24",
    fontSize: 11,
    fontWeight: "800",
  },

  // 🟡 USER CARDS

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 17,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8EBF1",
  },

  userCardSelected: {
    backgroundColor: "#FFF9EA",
    borderColor: "#D6AD55",
  },

  avatarContainer: {
    marginRight: 12,
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 25,
    backgroundColor: "#E8EBF1",
  },

  avatarFallback: {
    width: 49,
    height: 49,
    borderRadius: 25,
    backgroundColor: "#101B35",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: "#D6AD55",
    fontSize: 20,
    fontWeight: "900",
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  userName: {
    color: "#101B35",
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },

  verified: {
    color: "#FFFFFF",
    backgroundColor: "#2388D1",
    width: 16,
    height: 16,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 9,
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 5,
  },

  username: {
    color: "#8992A5",
    fontSize: 11,
    marginTop: 5,
  },

  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#D7DCE6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  checkCircleSelected: {
    backgroundColor: "#101B35",
    borderColor: "#101B35",
  },

  checkMark: {
    color: "#D6AD55",
    fontSize: 17,
    fontWeight: "900",
  },

  plusMark: {
    color: "#8992A5",
    fontSize: 20,
    fontWeight: "400",
  },

  // 🟡 EMPTY STATES

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },

  emptyEmoji: {
    fontSize: 37,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#101B35",
    fontSize: 15,
    fontWeight: "900",
  },

  emptyText: {
    color: "#8992A5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 19,
  },

  // 🟡 BOTTOM BAR

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "#E8EBF1",
    elevation: 10,
  },

  bottomInfo: {
    flex: 1,
  },

  bottomCount: {
    color: "#101B35",
    fontSize: 13,
    fontWeight: "900",
  },

  bottomHint: {
    color: "#8992A5",
    fontSize: 10,
    marginTop: 4,
  },

  createButton: {
    backgroundColor: "#D6AD55",
    paddingHorizontal: 21,
    paddingVertical: 15,
    borderRadius: 14,
    marginLeft: 12,
    minWidth: 145,
    alignItems: "center",
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    color: "#101B35",
    fontSize: 13,
    fontWeight: "900",
  },

  footerSpace: {
    height: 15,
  },
});