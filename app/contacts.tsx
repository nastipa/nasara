// 🔵 =====================================================
// 🔵 NASARA CONTACTS
// 🔵 Navy • Gold • White
// 🔵 Manual Search • Phone Contacts • My Contacts
// 🔵 Verified Phone Matching • Private Phone Numbers
// 🔵 =====================================================

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as Contacts from "expo-contacts";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

// 🔵 =====================================================
// 🔵 CONFIGURATION
// 🔵 =====================================================

const API_BASE_URL =
  "https://nasara-upload-server.onrender.com";

const CONTACT_BATCH_SIZE = 100;

type NasaraContact = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  verified?: boolean;
  created_at?: string | null;
};

type ContactSection =
  | "saved"
  | "manual"
  | "phone";

export default function ContactsScreen() {
  const router = useRouter();

  // 🔵 =====================================================
  // 🔵 STATE
  // 🔵 =====================================================

  const [contacts, setContacts] =
    useState<NasaraContact[]>([]);

  const [matches, setMatches] =
    useState<NasaraContact[]>([]);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [activeSection, setActiveSection] =
    useState<ContactSection>("saved");

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [addingId, setAddingId] =
    useState<string | null>(null);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const [messagingId, setMessagingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  // 🔵 =====================================================
  // 🔵 MESSAGE HELPER
  // 🔵 =====================================================

  const showMessage = (
    title: string,
    description?: string
  ) => {
    setMessage(
      description
        ? `${title}: ${description}`
        : title
    );
  };

  // 🔵 =====================================================
  // 🔵 GET ACCESS TOKEN
  // 🔵 =====================================================

  const getAccessToken = async () => {
    const {
      data,
      error,
    } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        "Please sign in again."
      );
    }

    return data.session.access_token;
  };

  // 🔵 =====================================================
  // 🔵 BACKEND REQUEST
  // 🔵 =====================================================

  const backendRequest = async (
    endpoint: string,
    method = "GET",
    body?: any
  ) => {
    const token = await getAccessToken();

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body !== undefined
          ? {
              body: JSON.stringify(body),
            }
          : {}),
      }
    );

    let result: any;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
          "Something went wrong."
      );
    }

    return result;
  };

  // 🔵 =====================================================
  // 🔵 LOAD SAVED CONTACTS
  // 🔵 =====================================================

  const loadContacts = useCallback(async () => {
    const result =
      await backendRequest("/contacts");

    setContacts(
      Array.isArray(result.contacts)
        ? result.contacts
        : []
    );
  }, []);

  // 🔵 =====================================================
  // 🔵 INITIAL LOAD
  // 🔵 NO PHONE DISCOVERY SETTING REQUIRED
  // 🔵 =====================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);

      try {
        await loadContacts();
      } catch (error: any) {
        if (mounted) {
          showMessage(
            "Contacts",
            error?.message ||
              "Could not load contacts."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadContacts]);

  // 🔵 =====================================================
  // 🔵 MANUAL PHONE LOOKUP
  // 🔵 MATCH VERIFIED NASARA ACCOUNTS
  // 🔵 =====================================================

  const searchPhoneNumber = async () => {
    const cleaned = phoneNumber.trim();

    if (!cleaned) {
      showMessage(
        "Phone number",
        "Enter a phone number first."
      );
      return;
    }

    try {
      setSearching(true);
      setMatches([]);
      setMessage("");

      const result =
        await backendRequest(
          "/contacts/lookup",
          "POST",
          {
            phone_number: cleaned,
            default_country: "GH",
          }
        );

      const foundMatches: NasaraContact[] =
        Array.isArray(result.matches)
          ? result.matches
          : [];

      setMatches(foundMatches);

      if (foundMatches.length === 0) {
        showMessage(
          "No match found",
          "This number is not linked to a verified Nasara account."
        );
      }
    } catch (error: any) {
      showMessage(
        "Search failed",
        error?.message ||
          "Could not search this number."
      );
    } finally {
      setSearching(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 PHONE ADDRESS BOOK MATCHING
  // 🔵 PROCESS EVERY NUMBER IN BATCHES OF 100
  // 🔵 =====================================================

  const findPhoneContacts = async () => {
    try {
      setSearching(true);
      setMatches([]);
      setMessage("");

      const permission =
        await Contacts.requestPermissionsAsync();

      if (!permission.granted) {
        showMessage(
          "Permission required",
          "Allow Nasara to access your contacts to find people you know."
        );
        return;
      }

      const result =
        await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.PhoneNumbers,
          ],
        });

      const phoneNumbers: string[] = [];

      for (const contact of result.data) {
        const numbers =
          contact.phoneNumbers || [];

        for (const item of numbers) {
          if (
            item.number &&
            item.number.trim()
          ) {
            phoneNumbers.push(
              item.number.trim()
            );
          }
        }
      }

      const uniqueNumbers = [
        ...new Set(phoneNumbers),
      ];

      if (uniqueNumbers.length === 0) {
        showMessage(
          "No phone numbers",
          "No phone numbers were found in your address book."
        );
        return;
      }

      // 🔵 ONLY PHONE NUMBERS ARE SUBMITTED.
      // 🔵 ADDRESS-BOOK NAMES ARE NOT UPLOADED.
      // 🔵 BACKEND RETURNS VERIFIED NASARA MATCHES.
      // 🔵 PROCESS ALL NUMBERS IN BATCHES OF 100.

      const allMatches: NasaraContact[] = [];

      const matchedIds = new Set<string>();

      for (
        let i = 0;
        i < uniqueNumbers.length;
        i += CONTACT_BATCH_SIZE
      ) {
        const batch =
          uniqueNumbers.slice(
            i,
            i + CONTACT_BATCH_SIZE
          );

        const serverResult =
          await backendRequest(
            "/contacts/lookup",
            "POST",
            {
              phone_numbers: batch,
              default_country: "GH",
            }
          );

        const batchMatches: NasaraContact[] =
          Array.isArray(serverResult.matches)
            ? serverResult.matches
            : [];

        for (const contact of batchMatches) {
          if (
            contact?.id &&
            !matchedIds.has(contact.id)
          ) {
            matchedIds.add(contact.id);
            allMatches.push(contact);
          }
        }
      }

      setMatches(allMatches);

      if (allMatches.length === 0) {
        showMessage(
          "No matches found",
          "None of these numbers matched a verified Nasara account."
        );
      } else {
        showMessage(
          "Contacts found",
          `${allMatches.length} Nasara users found.`
        );
      }
    } catch (error: any) {
      showMessage(
        "Contact matching failed",
        error?.message ||
          "Could not match your phone contacts."
      );
    } finally {
      setSearching(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 ADD CONTACT
  // 🔵 DOES NOT CREATE A CHAT ROOM
  // 🔵 =====================================================

  const addContact = async (
    contact: NasaraContact
  ) => {
    if (addingId || !contact.id) return;

    try {
      setAddingId(contact.id);

      await backendRequest(
        "/contacts/add",
        "POST",
        {
          contact_user_id: contact.id,
        }
      );

      setMatches((previous) =>
        previous.filter(
          (item) => item.id !== contact.id
        )
      );

      await loadContacts();

      showMessage(
        "Contact added",
        `${contact.full_name} is now in your contacts.`
      );
    } catch (error: any) {
      showMessage(
        "Could not add contact",
        error?.message ||
          "Please try again."
      );
    } finally {
      setAddingId(null);
    }
  };

  // 🔵 =====================================================
  // 🔵 REMOVE CONTACT
  // 🔵 =====================================================

  const removeContact = async (
    contact: NasaraContact
  ) => {
    if (removingId || !contact.id) return;

    try {
      setRemovingId(contact.id);

      await backendRequest(
        `/contacts/${encodeURIComponent(contact.id)}`,
        "DELETE"
      );

      setContacts((previous) =>
        previous.filter(
          (item) => item.id !== contact.id
        )
      );

      showMessage(
        "Contact removed",
        `${contact.full_name} was removed.`
      );
    } catch (error: any) {
      showMessage(
        "Could not remove contact",
        error?.message ||
          "Please try again."
      );
    } finally {
      setRemovingId(null);
    }
  };

  // 🔵 =====================================================
  // 🔵 OPEN CHAT
  // 🔵 ONLY WHEN USER TAPS MESSAGE
  // 🔵 =====================================================

  const openChat = async (
    contact: NasaraContact
  ) => {
    if (messagingId) return;

    try {
      setMessagingId(contact.id);

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Please sign in again."
        );
      }

      const myId = authData.user.id;
      const otherUserId = contact.id;

      if (myId === otherUserId) {
        throw new Error(
          "You cannot message yourself."
        );
      }

      // 🔵 STORE THE CHAT ROOM ID

      let chatRoomId: string | null = null;

      // 🔵 CHECK EXISTING ROOM: FIRST DIRECTION

      const firstResult = await (supabase as any)
        .from("chat_rooms")
        .select("id")
        .eq("buyer_id", myId)
        .eq("seller_id", otherUserId)
        .maybeSingle();

      if (firstResult.error) {
        throw firstResult.error;
      }

      if (firstResult.data?.id) {
        chatRoomId = String(
          firstResult.data.id
        );
      }

      // 🔵 CHECK EXISTING ROOM: REVERSE DIRECTION

      if (!chatRoomId) {
        const reverseResult = await (supabase as any)
          .from("chat_rooms")
          .select("id")
          .eq("buyer_id", otherUserId)
          .eq("seller_id", myId)
          .maybeSingle();

        if (reverseResult.error) {
          throw reverseResult.error;
        }

        if (reverseResult.data?.id) {
          chatRoomId = String(
            reverseResult.data.id
          );
        }
      }

      // 🔵 CREATE ROOM ONLY WHEN MESSAGE IS TAPPED

      if (!chatRoomId) {
        const {
          data: newRoom,
          error: createError,
        } = await (supabase as any)
          .from("chat_rooms")
          .insert({
            buyer_id: myId,
            seller_id: otherUserId,
            item_id: null,
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        if (!newRoom?.id) {
          throw new Error(
            "Chat room could not be created."
          );
        }

        chatRoomId = String(newRoom.id);
      }

      // 🔵 FINAL VALIDATION

      if (!chatRoomId) {
        throw new Error(
          "Unable to open this chat."
        );
      }

      // 🔵 OPEN CHAT SCREEN

      router.push({
        pathname: "/chat/[id]",
        params: {
          id: chatRoomId,
        },
      });
    } catch (error: any) {
      showMessage(
        "Could not open chat",
        error?.message ||
          "Please try again."
      );
    } finally {
      setMessagingId(null);
    }
  };

  // 🔵 =====================================================
  // 🔵 CONTACT AVATAR
  // 🔵 =====================================================

  const renderAvatar = (
    contact: NasaraContact
  ) => {
    if (contact.avatar_url) {
      return (
        <Image
          source={{
            uri: contact.avatar_url,
          }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarLetter}>
          {(
            contact.full_name || "N"
          ).charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  // 🔵 =====================================================
  // 🔵 CONTACT CARD
  // 🔵 =====================================================

  const renderContact = ({
    item,
  }: {
    item: NasaraContact;
  }) => {
    const isSaved =
      activeSection === "saved";

    return (
      <View style={styles.contactCard}>
        {renderAvatar(item)}

        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text
              style={styles.contactName}
              numberOfLines={1}
            >
              {item.full_name}
            </Text>

            {item.verified && (
              <Text style={styles.verified}>
                ✓
              </Text>
            )}
          </View>

          <Text style={styles.contactSubtitle}>
            Nasara user
          </Text>
        </View>

        {isSaved ? (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => openChat(item)}
            disabled={messagingId !== null}
            activeOpacity={0.8}
          >
            {messagingId === item.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.messageButtonText}>
                Message
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addContact(item)}
            disabled={addingId !== null}
            activeOpacity={0.8}
          >
            {addingId === item.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>
                + Add
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // 🔵 =====================================================
  // 🔵 MAIN SCREEN
  // 🔵 =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 🔵 HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>
              Contacts
            </Text>

            <Text style={styles.headerSubtitle}>
              Connect with people on Nasara
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* 🟡 PHONE DISCOVERY INFORMATION */}

          <View style={styles.privacyCard}>
            <View style={styles.privacyTop}>
              <View style={styles.privacyIcon}>
                <Text style={styles.privacyIconText}>
                  🔐
                </Text>
              </View>

              <View style={styles.privacyTextBox}>
                <Text style={styles.privacyTitle}>
                  Find Nasara users by phone number
                </Text>

                <Text style={styles.privacyDescription}>
                  Search for people using their registered phone number.
                </Text>
              </View>
            </View>

            <Text style={styles.privacyNote}>
              Verified Nasara accounts can be found by anyone who has their phone number. Phone numbers are never displayed in search results.
            </Text>
          </View>

          {/* 🔵 SECTION SELECTOR */}

          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                activeSection === "saved" &&
                  styles.activeSectionTab,
              ]}
              onPress={() => {
                setActiveSection("saved");
                setMatches([]);
                setMessage("");
              }}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === "saved" &&
                    styles.activeSectionTabText,
                ]}
              >
                My Contacts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sectionTab,
                activeSection === "manual" &&
                  styles.activeSectionTab,
              ]}
              onPress={() => {
                setActiveSection("manual");
                setMatches([]);
                setMessage("");
              }}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === "manual" &&
                    styles.activeSectionTabText,
                ]}
              >
                Add Number
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sectionTab,
                activeSection === "phone" &&
                  styles.activeSectionTab,
              ]}
              onPress={() => {
                setActiveSection("phone");
                setMatches([]);
                setMessage("");
              }}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === "phone" &&
                    styles.activeSectionTabText,
                ]}
              >
                Phone Contacts
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🔵 MANUAL NUMBER SEARCH */}

          {activeSection === "manual" && (
            <View style={styles.searchCard}>
              <Text style={styles.cardTitle}>
                Find a Nasara user
              </Text>

              <Text style={styles.cardDescription}>
                Enter a phone number with or without its country code.
              </Text>

              <TextInput
                style={styles.phoneInput}
                placeholder="0241234567 or +233241234567"
                placeholderTextColor="#929292"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={searchPhoneNumber}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Search Nasara
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 🔵 ADDRESS BOOK MATCHING */}

          {activeSection === "phone" && (
            <View style={styles.searchCard}>
              <Text style={styles.cardTitle}>
                Find people you know
              </Text>

              <Text style={styles.cardDescription}>
                Nasara checks phone numbers on your device against verified Nasara accounts.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={findPhoneContacts}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Find My Phone Contacts
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.smallPrivacyText}>
                Only phone numbers are sent for matching. Your address-book names are not uploaded.
              </Text>
            </View>
          )}

          {/* 🔵 STATUS MESSAGE */}

          {!!message && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>
                {message}
              </Text>
            </View>
          )}

          {/* 🔵 CONTACT RESULTS */}

          {activeSection !== "saved" && (
            <View style={styles.listSection}>
              <Text style={styles.listHeading}>
                Search Results
              </Text>

              {searching ? (
                <ActivityIndicator
                  color="#D6A43B"
                  size="large"
                  style={styles.loading}
                />
              ) : matches.length > 0 ? (
                <FlatList
                  data={matches}
                  keyExtractor={(item) => item.id}
                  renderItem={renderContact}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>
                    👥
                  </Text>

                  <Text style={styles.emptyTitle}>
                    No results yet
                  </Text>

                  <Text style={styles.emptyDescription}>
                    Search a phone number or match your phone contacts.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 🔵 SAVED CONTACTS */}

          {activeSection === "saved" && (
            <View style={styles.listSection}>
              <View style={styles.listHeadingRow}>
                <Text style={styles.listHeading}>
                  My Contacts
                </Text>

                <Text style={styles.contactCount}>
                  {contacts.length}
                </Text>
              </View>

              {loading ? (
                <ActivityIndicator
                  color="#D6A43B"
                  size="large"
                  style={styles.loading}
                />
              ) : contacts.length > 0 ? (
                contacts.map((item) => (
                  <View key={item.id}>
                    {renderContact({ item })}

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeContact(item)}
                      disabled={removingId !== null}
                    >
                      {removingId === item.id ? (
                        <ActivityIndicator color="#B94A48" />
                      ) : (
                        <Text style={styles.removeButtonText}>
                          Remove contact
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>
                    📇
                  </Text>

                  <Text style={styles.emptyTitle}>
                    No contacts yet
                  </Text>

                  <Text style={styles.emptyDescription}>
                    Find people by phone number or through your address book and add them here.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 🔵 DISCOVER USERS */}

          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() =>
              router.push("/discover")
            }
          >
            <Text style={styles.discoverButtonText}>
              👥 Discover More Nasara Users
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 🔵 =====================================================
// 🔵 STYLES
// 🔵 =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#071A35",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#142B49",
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 38,
  },

  headerTitleBox: {
    marginLeft: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#D1D8E2",
    fontSize: 12,
    marginTop: 3,
  },

  privacyCard: {
    margin: 15,
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9E2D2",
  },

  privacyTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  privacyIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFF5DE",
    alignItems: "center",
    justifyContent: "center",
  },

  privacyIconText: {
    fontSize: 21,
  },

  privacyTextBox: {
    flex: 1,
    marginHorizontal: 10,
  },

  privacyTitle: {
    color: "#071A35",
    fontSize: 14,
    fontWeight: "800",
  },

  privacyDescription: {
    color: "#777777",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  privacyNote: {
    color: "#777777",
    fontSize: 11,
    marginTop: 12,
    lineHeight: 17,
  },

  sectionTabs: {
    flexDirection: "row",
    marginHorizontal: 15,
    backgroundColor: "#E8EAF0",
    borderRadius: 12,
    padding: 4,
  },

  sectionTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 9,
  },

  activeSectionTab: {
    backgroundColor: "#071A35",
  },

  sectionTabText: {
    color: "#657080",
    fontSize: 11,
    fontWeight: "700",
  },

  activeSectionTabText: {
    color: "#FFFFFF",
  },

  searchCard: {
    margin: 15,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
  },

  cardTitle: {
    color: "#071A35",
    fontSize: 16,
    fontWeight: "800",
  },

  cardDescription: {
    color: "#777777",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  phoneInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE1E8",
    backgroundColor: "#FAFBFD",
    paddingHorizontal: 14,
    marginTop: 17,
    color: "#071A35",
    fontSize: 14,
  },

  primaryButton: {
    height: 49,
    backgroundColor: "#071A35",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  smallPrivacyText: {
    color: "#888888",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },

  statusBox: {
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF5DE",
  },

  statusText: {
    color: "#70531C",
    fontSize: 12,
    lineHeight: 18,
  },

  listSection: {
    marginHorizontal: 15,
    marginTop: 15,
  },

  listHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  listHeading: {
    color: "#071A35",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  contactCount: {
    color: "#D09A2D",
    fontSize: 13,
    fontWeight: "800",
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E8EAF0",
  },

  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#071A35",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  contactInfo: {
    flex: 1,
    marginLeft: 11,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  contactName: {
    color: "#071A35",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 150,
  },

  verified: {
    color: "#1688E8",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 5,
  },

  contactSubtitle: {
    color: "#888888",
    fontSize: 11,
    marginTop: 4,
  },

  messageButton: {
    backgroundColor: "#071A35",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 76,
    alignItems: "center",
  },

  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  addButton: {
    backgroundColor: "#D6A43B",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minWidth: 65,
    alignItems: "center",
  },

  addButtonText: {
    color: "#071A35",
    fontSize: 11,
    fontWeight: "900",
  },

  removeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: -5,
    marginBottom: 9,
  },

  removeButtonText: {
    color: "#B94A48",
    fontSize: 10,
    fontWeight: "700",
  },

  emptyBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 15,
    marginTop: 5,
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  emptyTitle: {
    color: "#071A35",
    fontSize: 14,
    fontWeight: "800",
  },

  emptyDescription: {
    color: "#888888",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },

  loading: {
    marginVertical: 25,
  },

  discoverButton: {
    marginHorizontal: 15,
    marginTop: 18,
    backgroundColor: "#D6A43B",
    padding: 15,
    borderRadius: 13,
    alignItems: "center",
  },

  discoverButtonText: {
    color: "#071A35",
    fontSize: 13,
    fontWeight: "900",
  },

  bottomSpace: {
    height: 35,
  },
});