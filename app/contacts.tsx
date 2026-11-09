// 🔵 =====================================================
// 🔵 NASARA PREMIUM CONTACTS
// 🔵 Navy • Gold • White
// 🔵 Manual Search • Phone Contacts • My Contacts
// 🔵 Verified Phone Matching • Private Phone Numbers
// 🔵 Favorites • Pinned • Categories • Private Notes
// 🔵 Recently Added • Invite Friends • Refresh
// 🔵 Local Preferences • No Backend Changes
// 🔵 =====================================================

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as Contacts from "expo-contacts";

import { useRouter } from "expo-router";

import { supabase } from "../lib/supabase";

// 🔵 =====================================================
// 🔵 CONFIGURATION
// 🔵 =====================================================

const API_BASE_URL =
  "https://nasara-upload-server.onrender.com";

const CONTACT_BATCH_SIZE = 100;

const CONTACT_CATEGORIES = [
  "Friends",
  "Family",
  "Work",
  "Business",
];

const CONTACT_STORAGE_PREFIX =
  "@nasara_contacts_preferences_";

const NASARA_WEBSITE =
  "https://nasara-six.vercel.app";

// 🔵 =====================================================
// 🔵 TYPES
// 🔵 =====================================================

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

type ContactFilter =
  | "all"
  | "favorites"
  | "pinned"
  | "recent";

type ContactPreference = {
  favorite?: boolean;
  pinned?: boolean;
  category?: string;
  note?: string;
  addedAt?: number;
};

type ContactPreferences = Record<
  string,
  ContactPreference
>;

// 🔵 =====================================================
// 🔵 MAIN SCREEN
// 🔵 =====================================================

export default function ContactsScreen() {
  const router = useRouter();

  // 🔵 =====================================================
  // 🔵 CONTACT STATE
  // 🔵 =====================================================

  const [contacts, setContacts] =
    useState<NasaraContact[]>([]);

  const [matches, setMatches] =
    useState<NasaraContact[]>([]);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [activeSection, setActiveSection] =
    useState<ContactSection>("saved");

  const [activeFilter, setActiveFilter] =
    useState<ContactFilter>("all");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  // 🔵 =====================================================
  // 🔵 LOADING STATE
  // 🔵 =====================================================

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searching, setSearching] =
    useState(false);

  const [addingId, setAddingId] =
    useState<string | null>(null);

  const [removingId, setRemovingId] =
    useState<string | null>(null);

  const [messagingId, setMessagingId] =
    useState<string | null>(null);

  // 🔵 =====================================================
  // 🔵 LOCAL CONTACT PREFERENCES
  // 🔵 =====================================================

  const [contactPreferences, setContactPreferences] =
    useState<ContactPreferences>({});

  const [metaStorageKey, setMetaStorageKey] =
    useState<string | null>(null);

  const [metaReady, setMetaReady] =
    useState(false);

  const [expandedToolsId, setExpandedToolsId] =
    useState<string | null>(null);

  const [editingNoteId, setEditingNoteId] =
    useState<string | null>(null);

  const [noteDraft, setNoteDraft] =
    useState("");

  // 🔵 =====================================================
  // 🔵 STATUS MESSAGE
  // 🔵 =====================================================

  const [message, setMessage] =
    useState("");

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

    if (
      error ||
      !data.session?.access_token
    ) {
      throw new Error(
        "Please sign in again."
      );
    }

    return data.session.access_token;
  };

  // 🔵 =====================================================
  // 🔵 BACKEND REQUEST
  // 🔵 EXISTING RENDER API ONLY
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
        "The server returned an invalid response. Please try again."
      );
    }

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.error ||
          "Something went wrong."
      );
    }

    return result;
  };

  // 🔵 =====================================================
  // 🔵 LOAD LOCAL CONTACT PREFERENCES
  // 🔵 EACH ACCOUNT HAS ITS OWN LOCAL SETTINGS
  // 🔵 =====================================================

  useEffect(() => {
    let mounted = true;

    const loadPreferences = async () => {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (
          error ||
          !data.session?.user?.id
        ) {
          throw new Error(
            "Please sign in again."
          );
        }

        const storageKey =
          `${CONTACT_STORAGE_PREFIX}${data.session.user.id}`;

        const saved =
          await AsyncStorage.getItem(storageKey);

        let parsed: ContactPreferences = {};

        if (saved) {
          try {
            parsed = JSON.parse(saved);
          } catch {
            parsed = {};
          }
        }

        if (mounted) {
          setMetaStorageKey(storageKey);
          setContactPreferences(parsed);
          setMetaReady(true);
        }
      } catch (error: any) {
        if (mounted) {
          setMetaReady(true);

          showMessage(
            "Contact preferences",
            error?.message ||
              "Local preferences could not be loaded."
          );
        }
      }
    };

    loadPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔵 =====================================================
  // 🔵 SAVE LOCAL CONTACT PREFERENCES
  // 🔵 NO BACKEND OR DATABASE REQUIRED
  // 🔵 =====================================================

  useEffect(() => {
    if (
      !metaReady ||
      !metaStorageKey
    ) {
      return;
    }

    AsyncStorage.setItem(
      metaStorageKey,
      JSON.stringify(contactPreferences)
    ).catch(() => {
      showMessage(
        "Local storage",
        "Some contact preferences could not be saved."
      );
    });
  }, [
    contactPreferences,
    metaReady,
    metaStorageKey,
  ]);

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
  // 🔵 REFRESH CONTACTS
  // 🔵 =====================================================

  const refreshContacts = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);

      await loadContacts();

      showMessage(
        "Contacts refreshed",
        "Your saved contacts are up to date."
      );
    } catch (error: any) {
      showMessage(
        "Refresh failed",
        error?.message ||
          "Could not refresh contacts."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // 🔵 =====================================================
  // 🔵 PHONE NUMBER INPUT CLEANING
  // 🔵 KEEP COUNTRY CODE AND DIGITS
  // 🔵 =====================================================

  const cleanPhoneNumber = (
    value: string
  ) => {
    const trimmed = value.trim();

    const startsWithPlus =
      trimmed.startsWith("+");

    const digits =
      trimmed.replace(/\D/g, "");

    return startsWithPlus
      ? `+${digits}`
      : digits;
  };

  // 🔵 =====================================================
  // 🔵 BASIC PHONE NUMBER VALIDATION
  // 🔵 BACKEND REMAINS THE FINAL VALIDATOR
  // 🔵 =====================================================

  const isValidPhoneInput = (
    value: string
  ) => {
    const cleaned =
      cleanPhoneNumber(value);

    const digits =
      cleaned.replace(/\D/g, "");

    return (
      digits.length >= 9 &&
      digits.length <= 15
    );
  };

  // 🔵 =====================================================
  // 🔵 MANUAL PHONE LOOKUP
  // 🔵 MATCH VERIFIED NASARA ACCOUNTS
  // 🔵 =====================================================

  const searchPhoneNumber = async () => {
    const cleaned =
      cleanPhoneNumber(phoneNumber);

    if (!cleaned) {
      showMessage(
        "Phone number",
        "Enter a phone number first."
      );
      return;
    }

    if (!isValidPhoneInput(cleaned)) {
      showMessage(
        "Invalid phone number",
        "Enter a complete phone number, including the country code when necessary."
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
      } else {
        showMessage(
          "User found",
          `${foundMatches.length} verified Nasara account found.`
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
  // 🔵 PROCESS ALL NUMBERS IN BATCHES OF 100
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
      // 🔵 PROCESS EVERY NUMBER IN BATCHES OF 100.

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
  // 🔵 CONTACT PREFERENCE UPDATE
  // 🔵 =====================================================

  const updateContactPreference = (
    contactId: string,
    changes: Partial<ContactPreference>
  ) => {
    setContactPreferences((previous) => ({
      ...previous,
      [contactId]: {
        ...previous[contactId],
        ...changes,
      },
    }));
  };

  // 🔵 =====================================================
  // 🔵 ADD CONTACT
  // 🔵 DOES NOT CREATE A CHAT ROOM
  // 🔵 =====================================================

  const addContact = async (
    contact: NasaraContact
  ) => {
    if (
      addingId ||
      !contact.id
    ) {
      return;
    }

    const alreadySaved =
      contacts.some(
        (item) => item.id === contact.id
      );

    if (alreadySaved) {
      showMessage(
        "Already added",
        "This user is already in your contacts."
      );
      return;
    }

    try {
      setAddingId(contact.id);

      await backendRequest(
        "/contacts/add",
        "POST",
        {
          contact_user_id: contact.id,
        }
      );

      updateContactPreference(
        contact.id,
        {
          addedAt: Date.now(),
          category: "Friends",
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
    if (
      removingId ||
      !contact.id
    ) {
      return;
    }

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

      setContactPreferences((previous) => {
        const updated = {
          ...previous,
        };

        delete updated[contact.id];

        return updated;
      });

      showMessage(
        "Contact removed",
        `${contact.full_name} was removed from your contacts.`
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
  // 🔵 FAVORITE CONTACT
  // 🔵 SAVED LOCALLY
  // 🔵 =====================================================

  const toggleFavorite = (
    contact: NasaraContact
  ) => {
    const current =
      contactPreferences[contact.id]?.favorite === true;

    updateContactPreference(
      contact.id,
      {
        favorite: !current,
      }
    );

    showMessage(
      current
        ? "Removed from favorites"
        : "Added to favorites",
      contact.full_name
    );
  };

  // 🔵 =====================================================
  // 🔵 PIN CONTACT
  // 🔵 SAVED LOCALLY
  // 🔵 =====================================================

  const togglePin = (
    contact: NasaraContact
  ) => {
    const current =
      contactPreferences[contact.id]?.pinned === true;

    updateContactPreference(
      contact.id,
      {
        pinned: !current,
      }
    );

    showMessage(
      current
        ? "Contact unpinned"
        : "Contact pinned",
      contact.full_name
    );
  };

  // 🔵 =====================================================
  // 🔵 CONTACT CATEGORY
  // 🔵 =====================================================

  const changeCategory = (
    contact: NasaraContact,
    category: string
  ) => {
    updateContactPreference(
      contact.id,
      {
        category,
      }
    );

    showMessage(
      "Category updated",
      `${contact.full_name} moved to ${category}.`
    );
  };

  // 🔵 =====================================================
  // 🔵 SAVE PRIVATE CONTACT NOTE
  // 🔵 DEVICE-LOCAL ONLY
  // 🔵 =====================================================

  const startEditingNote = (
    contact: NasaraContact
  ) => {
    setEditingNoteId(contact.id);

    setNoteDraft(
      contactPreferences[contact.id]?.note || ""
    );
  };

  const saveContactNote = (
    contact: NasaraContact
  ) => {
    updateContactPreference(
      contact.id,
      {
        note: noteDraft.trim(),
      }
    );

    setEditingNoteId(null);
    setNoteDraft("");

    showMessage(
      "Private note saved",
      "This note is stored on this device only."
    );
  };

  // 🔵 =====================================================
  // 🔵 INVITE PEOPLE TO NASARA
  // 🔵 USE NATIVE SHARE MENU
  // 🔵 =====================================================

  const inviteToNasara = async () => {
    try {
      await Share.share({
        message:
          `Join me on Nasara! Discover products, connect with people and explore opportunities.\n\n${NASARA_WEBSITE}`,
        url: NASARA_WEBSITE,
      });
    } catch (error: any) {
      showMessage(
        "Sharing failed",
        error?.message ||
          "Could not open the sharing menu."
      );
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

      if (
        authError ||
        !authData.user
      ) {
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

      // 🔵 STORE CHAT ROOM ID

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
          )
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>
    );
  };

  // 🔵 =====================================================
  // 🔵 CONTACT CARD
  // 🔵 =====================================================

  const renderContact = (
    contact: NasaraContact,
    isSaved: boolean
  ) => {
    const preference =
      contactPreferences[contact.id] || {};

    const isFavorite =
      preference.favorite === true;

    const isPinned =
      preference.pinned === true;

    const category =
      preference.category || "Friends";

    const isExpanded =
      expandedToolsId === contact.id;

    const isEditingNote =
      editingNoteId === contact.id;

    return (
      <View
        key={contact.id}
        style={styles.contactWrapper}
      >
        <View style={styles.contactCard}>
          {renderAvatar(contact)}

          <View style={styles.contactInfo}>
            <View style={styles.nameRow}>
              <Text
                style={styles.contactName}
                numberOfLines={1}
              >
                {contact.full_name || "Nasara User"}
              </Text>

              {contact.verified && (
                <Text style={styles.verified}>
                  ✓
                </Text>
              )}

              {isPinned && (
                <Text style={styles.pinIndicator}>
                  📌
                </Text>
              )}
            </View>

            <Text style={styles.contactSubtitle}>
              {category} • Verified Nasara account
            </Text>

            {isFavorite && (
              <Text style={styles.favoriteLabel}>
                ★ Favorite
              </Text>
            )}
          </View>

          {isSaved ? (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => openChat(contact)}
              disabled={messagingId !== null}
              activeOpacity={0.8}
            >
              {messagingId === contact.id ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.messageButtonText}>
                  Message
                </Text>
              )}
            </TouchableOpacity>
          ) : contacts.some(
              (item) => item.id === contact.id
            ) ? (
            <View style={styles.alreadyAddedButton}>
              <Text style={styles.alreadyAddedText}>
                Added ✓
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addContact(contact)}
              disabled={addingId !== null}
              activeOpacity={0.8}
            >
              {addingId === contact.id ? (
                <ActivityIndicator color="#071A35" />
              ) : (
                <Text style={styles.addButtonText}>
                  + Add
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {isSaved && (
          <>
            {/* 🔵 CONTACT QUICK ACTIONS */}

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => toggleFavorite(contact)}
              >
                <Text style={styles.quickActionText}>
                  {isFavorite ? "★ Favorite" : "☆ Favorite"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => togglePin(contact)}
              >
                <Text style={styles.quickActionText}>
                  {isPinned ? "📌 Unpin" : "📌 Pin"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => {
                  setExpandedToolsId(
                    isExpanded ? null : contact.id
                  );

                  if (isExpanded) {
                    setEditingNoteId(null);
                  }
                }}
              >
                <Text style={styles.quickActionText}>
                  {isExpanded ? "Close" : "More"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 🔵 EXPANDED CONTACT OPTIONS */}

            {isExpanded && (
              <View style={styles.expandedTools}>
                <Text style={styles.toolHeading}>
                  Contact category
                </Text>

                <View style={styles.categoryOptions}>
                  {CONTACT_CATEGORIES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.categoryOption,
                        category === item &&
                          styles.categoryOptionActive,
                      ]}
                      onPress={() =>
                        changeCategory(contact, item)
                      }
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          category === item &&
                            styles.categoryOptionTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.noteHeader}>
                  <Text style={styles.toolHeading}>
                    Private note
                  </Text>

                  {!isEditingNote && (
                    <TouchableOpacity
                      onPress={() =>
                        startEditingNote(contact)
                      }
                    >
                      <Text style={styles.editNoteText}>
                        Edit note
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isEditingNote ? (
                  <>
                    <TextInput
                      style={styles.noteInput}
                      value={noteDraft}
                      onChangeText={setNoteDraft}
                      placeholder="Write a private note about this contact..."
                      placeholderTextColor="#929292"
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                    />

                    <View style={styles.noteButtons}>
                      <TouchableOpacity
                        style={styles.saveNoteButton}
                        onPress={() =>
                          saveContactNote(contact)
                        }
                      >
                        <Text style={styles.saveNoteText}>
                          Save note
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cancelNoteButton}
                        onPress={() => {
                          setEditingNoteId(null);
                          setNoteDraft("");
                        }}
                      >
                        <Text style={styles.cancelNoteText}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <Text style={styles.savedNote}>
                    {preference.note ||
                      "No private note added yet."}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeContact(contact)}
                  disabled={removingId !== null}
                >
                  {removingId === contact.id ? (
                    <ActivityIndicator color="#B94A48" />
                  ) : (
                    <Text style={styles.removeButtonText}>
                      Remove contact
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // 🔵 =====================================================
  // 🔵 SORT AND FILTER SAVED CONTACTS
  // 🔵 =====================================================

  const filteredContacts = contacts
    .filter((contact) => {
      const preference =
        contactPreferences[contact.id] || {};

      if (
        activeFilter === "favorites" &&
        !preference.favorite
      ) {
        return false;
      }

      if (
        activeFilter === "pinned" &&
        !preference.pinned
      ) {
        return false;
      }

      if (
        activeFilter === "recent" &&
        !preference.addedAt
      ) {
        return false;
      }

      if (
        selectedCategory !== "All" &&
        (preference.category || "Friends") !==
          selectedCategory
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const first =
        contactPreferences[a.id] || {};

      const second =
        contactPreferences[b.id] || {};

      if (
        Boolean(first.pinned) !==
        Boolean(second.pinned)
      ) {
        return first.pinned ? -1 : 1;
      }

      if (
        Boolean(first.favorite) !==
        Boolean(second.favorite)
      ) {
        return first.favorite ? -1 : 1;
      }

      return (
        (second.addedAt || 0) -
        (first.addedAt || 0)
      );
    });

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

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshContacts}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.refreshText}>
                ↻
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* 🟡 PRIVACY INFORMATION */}

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

            <Text style={styles.localPrivacyNote}>
              ⭐ Favorites, pins, categories and private notes are stored locally on this device.
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
                Enter a complete phone number with or without its country code.
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

          {/* 🔵 SEARCH RESULTS */}

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
                matches.map((item) =>
                  renderContact(item, false)
                )
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

              {/* 🔵 CONTACT FILTERS */}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                {[
                  {
                    key: "all",
                    label: "All",
                  },
                  {
                    key: "favorites",
                    label: "★ Favorites",
                  },
                  {
                    key: "pinned",
                    label: "📌 Pinned",
                  },
                  {
                    key: "recent",
                    label: "Recently Added",
                  },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      activeFilter === filter.key &&
                        styles.filterButtonActive,
                    ]}
                    onPress={() =>
                      setActiveFilter(
                        filter.key as ContactFilter
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        activeFilter === filter.key &&
                          styles.filterButtonTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 🔵 CATEGORY FILTERS */}

              <Text style={styles.categoryHeading}>
                Contact categories
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
              >
                {[
                  "All",
                  ...CONTACT_CATEGORIES,
                ].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryFilter,
                      selectedCategory === category &&
                        styles.categoryFilterActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(category)
                    }
                  >
                    <Text
                      style={[
                        styles.categoryFilterText,
                        selectedCategory === category &&
                          styles.categoryFilterTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 🔵 CONTACT LIST */}

              {loading || !metaReady ? (
                <ActivityIndicator
                  color="#D6A43B"
                  size="large"
                  style={styles.loading}
                />
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((item) =>
                  renderContact(item, true)
                )
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>
                    📇
                  </Text>

                  <Text style={styles.emptyTitle}>
                    No contacts found
                  </Text>

                  <Text style={styles.emptyDescription}>
                    {contacts.length === 0
                      ? "Find people by phone number or through your address book and add them here."
                      : "No contacts match this filter. Try another category or filter."}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 🟡 INVITE FRIENDS */}

          <TouchableOpacity
            style={styles.inviteButton}
            onPress={inviteToNasara}
            activeOpacity={0.85}
          >
            <Text style={styles.inviteIcon}>
              ✉️
            </Text>

            <View style={styles.inviteTextBox}>
              <Text style={styles.inviteTitle}>
                Invite Friends to Nasara
              </Text>

              <Text style={styles.inviteDescription}>
                Share Nasara with people you know.
              </Text>
            </View>

            <Text style={styles.inviteArrow}>
              ›
            </Text>
          </TouchableOpacity>

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

  // 🔵 HEADER

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
    flex: 1,
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

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#142B49",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  // 🟡 PRIVACY

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

  localPrivacyNote: {
    color: "#8A671F",
    fontSize: 10,
    marginTop: 9,
    lineHeight: 16,
  },

  // 🔵 SECTION TABS

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

  // 🔵 SEARCH

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

  // 🔵 STATUS

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

  // 🔵 CONTACT LIST

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
  },

  contactCount: {
    color: "#D09A2D",
    fontSize: 13,
    fontWeight: "800",
  },

  contactWrapper: {
    marginBottom: 10,
  },

  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
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
    marginRight: 5,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  contactName: {
    color: "#071A35",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 145,
  },

  verified: {
    color: "#1688E8",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 5,
  },

  pinIndicator: {
    fontSize: 11,
    marginLeft: 5,
  },

  contactSubtitle: {
    color: "#888888",
    fontSize: 10,
    marginTop: 4,
  },

  favoriteLabel: {
    color: "#B88727",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },

  // 🔵 CONTACT BUTTONS

  messageButton: {
    backgroundColor: "#071A35",
    borderRadius: 9,
    paddingHorizontal: 11,
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

  alreadyAddedButton: {
    backgroundColor: "#E8F4EA",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  alreadyAddedText: {
    color: "#287A3D",
    fontSize: 10,
    fontWeight: "800",
  },

  // 🔵 QUICK ACTIONS

  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 8,
    paddingBottom: 9,
    marginTop: -2,
  },

  quickAction: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 4,
    backgroundColor: "#F5F6F8",
    borderRadius: 8,
  },

  quickActionText: {
    color: "#071A35",
    fontSize: 10,
    fontWeight: "800",
  },

  // 🔵 EXPANDED OPTIONS

  expandedTools: {
    backgroundColor: "#FFFFFF",
    padding: 13,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    marginTop: -2,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  toolHeading: {
    color: "#071A35",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 9,
  },

  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 13,
  },

  categoryOption: {
    borderWidth: 1,
    borderColor: "#DDE1E8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 6,
    marginBottom: 6,
  },

  categoryOptionActive: {
    backgroundColor: "#071A35",
    borderColor: "#071A35",
  },

  categoryOptionText: {
    color: "#657080",
    fontSize: 10,
    fontWeight: "700",
  },

  categoryOptionTextActive: {
    color: "#FFFFFF",
  },

  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  editNoteText: {
    color: "#B88727",
    fontSize: 11,
    fontWeight: "800",
  },

  noteInput: {
    minHeight: 75,
    borderWidth: 1,
    borderColor: "#DDE1E8",
    borderRadius: 10,
    padding: 11,
    color: "#071A35",
    fontSize: 12,
    backgroundColor: "#FAFBFD",
  },

  savedNote: {
    color: "#777777",
    fontSize: 11,
    lineHeight: 18,
    backgroundColor: "#F5F6F8",
    borderRadius: 9,
    padding: 11,
  },

  noteButtons: {
    flexDirection: "row",
    marginTop: 9,
  },

  saveNoteButton: {
    backgroundColor: "#071A35",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  saveNoteText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  cancelNoteButton: {
    backgroundColor: "#EEEEEE",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginLeft: 8,
  },

  cancelNoteText: {
    color: "#555555",
    fontSize: 10,
    fontWeight: "800",
  },

  removeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8,
  },

  removeButtonText: {
    color: "#B94A48",
    fontSize: 10,
    fontWeight: "800",
  },

  // 🔵 FILTERS

  filterScroll: {
    marginBottom: 13,
  },

  filterButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E3E9",
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginRight: 7,
  },

  filterButtonActive: {
    backgroundColor: "#071A35",
    borderColor: "#071A35",
  },

  filterButtonText: {
    color: "#657080",
    fontSize: 10,
    fontWeight: "800",
  },

  filterButtonTextActive: {
    color: "#FFFFFF",
  },

  categoryHeading: {
    color: "#071A35",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 9,
  },

  categoryFilter: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E3E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 7,
  },

  categoryFilterActive: {
    backgroundColor: "#D6A43B",
    borderColor: "#D6A43B",
  },

  categoryFilterText: {
    color: "#657080",
    fontSize: 10,
    fontWeight: "800",
  },

  categoryFilterTextActive: {
    color: "#071A35",
  },

  // 🔵 EMPTY STATE

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

  // 🟡 INVITE

  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9E2D2",
    padding: 15,
    borderRadius: 14,
  },

  inviteIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  inviteTextBox: {
    flex: 1,
  },

  inviteTitle: {
    color: "#071A35",
    fontSize: 13,
    fontWeight: "900",
  },

  inviteDescription: {
    color: "#888888",
    fontSize: 10,
    marginTop: 4,
  },

  inviteArrow: {
    color: "#D6A43B",
    fontSize: 26,
    fontWeight: "800",
  },

  // 🔵 DISCOVER

  discoverButton: {
    marginHorizontal: 15,
    marginTop: 13,
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