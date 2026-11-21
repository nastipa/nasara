import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAdminGuard } from "../../hooks/useAdminGuard";
import { supabase } from "../../lib/supabase";

const API_BASE_URL = "https://nasara-upload-server.onrender.com";

const NAVY = "#101C3A";
const NAVY_LIGHT = "#1B2B50";
const GOLD = "#D9A928";
const WHITE = "#FFFFFF";
const MUTED = "#8993A8";
const BACKGROUND = "#F3F5F9";
const GREEN = "#168653";
const RED = "#C43D45";

type EngagementSettings = {
  id: number;
  enabled: boolean;
  send_hour: number;
  send_minute: number;
};

type Campaign = {
  weekday: number;
  feature_key: string;
  title: string;
  body: string;
  enabled: boolean;
};

type CampaignHistory = {
  notification_date: string;
  feature_key: string;
  title: string;
  body: string;
  status: "processing" | "sent" | "partial" | "failed";
  target_count: number;
  sent_count: number;
  failed_count: number;
  started_at: string;
  completed_at: string | null;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function EngagementManagerScreen() {
  useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const [settings, setSettings] = useState<EngagementSettings>({
    id: 1,
    enabled: true,
    send_hour: 8,
    send_minute: 30,
  });

  // Separate editable text values prevent the input from resetting
  // when the administrator temporarily clears a field.
  const [hourInput, setHourInput] = useState("08");
  const [minuteInput, setMinuteInput] = useState("30");

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [history, setHistory] = useState<CampaignHistory[]>([]);

  const [testTitle, setTestTitle] = useState(
    "Nasara test notification"
  );

  const [testBody, setTestBody] = useState(
    "Your Nasara notifications are connected."
  );
  const showMessage = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(
        message ? `${title}\n\n${message}` : title
      );
    }
    return;
  }

  Alert.alert(title, message || "");
};
  const getAuthHeaders = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const apiRequest = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "The request could not be completed."
        );
      }

      return result;
    },
    [getAuthHeaders]
  );

  const loadDashboard = useCallback(async () => {
    try {
      const result = await apiRequest("/admin/engagement");

      if (result.settings) {
        const loadedSettings: EngagementSettings = {
          ...result.settings,
          send_hour: Number(result.settings.send_hour),
          send_minute: Number(result.settings.send_minute),
        };

        setSettings(loadedSettings);

        setHourInput(
          String(loadedSettings.send_hour).padStart(2, "0")
        );

        setMinuteInput(
          String(loadedSettings.send_minute).padStart(2, "0")
        );
      }

      setCampaigns(result.campaigns || []);
      setHistory(result.history || []);
    } catch (error: any) {
      showMessage(
        "Unable to load",
        error?.message || "Could not load engagement settings."
      );
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =====================================================
  // TIME INPUT HANDLERS
  // =====================================================

  const handleHourChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);

    setHourInput(digits);

    if (digits.length === 2) {
      const parsed = Number(digits);

      if (parsed >= 0 && parsed <= 23) {
        setSettings((current) => ({
          ...current,
          send_hour: parsed,
        }));
      }
    }
  };

  const handleMinuteChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);

    setMinuteInput(digits);

    if (digits.length === 2) {
      const parsed = Number(digits);

      if (parsed >= 0 && parsed <= 59) {
        setSettings((current) => ({
          ...current,
          send_minute: parsed,
        }));
      }
    }
  };

  // =====================================================
  // SAVE DAILY REMINDER SETTINGS
  // =====================================================

  const updateSettings = async () => {
    const hour = Number(hourInput);
    const minute = Number(minuteInput);

    if (
      hourInput.length !== 2 ||
      minuteInput.length !== 2 ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      showMessage(
        "Invalid time",
        "Enter a valid hour from 00–23 and minute from 00–59."
      );
      return;
    }

    try {
      setSavingSettings(true);

      const result = await apiRequest(
        "/admin/engagement/settings",
        "PUT",
        {
          enabled: settings.enabled,
          send_hour: hour,
          send_minute: minute,
        }
      );

      if (result.settings) {
        const saved: EngagementSettings = {
          ...result.settings,
          send_hour: Number(result.settings.send_hour),
          send_minute: Number(result.settings.send_minute),
        };

        setSettings(saved);

        setHourInput(
          String(saved.send_hour).padStart(2, "0")
        );

        setMinuteInput(
          String(saved.send_minute).padStart(2, "0")
        );
      } else {
        setSettings((current) => ({
          ...current,
          send_hour: hour,
          send_minute: minute,
        }));

        setHourInput(String(hour).padStart(2, "0"));
        setMinuteInput(String(minute).padStart(2, "0"));
      }

      showMessage(
        "Saved",
        "Daily reminder settings have been updated."
      );
    } catch (error: any) {
      showMessage(
        "Save failed",
        error?.message || "Could not save settings."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  // =====================================================
  // UPDATE CAMPAIGN FIELDS
  // =====================================================

  const updateCampaignField = (
    weekday: number,
    field: keyof Campaign,
    value: string | boolean
  ) => {
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.weekday === weekday
          ? { ...campaign, [field]: value }
          : campaign
      )
    );
  };

  // =====================================================
  // SAVE WEEKLY CAMPAIGN
  // =====================================================

  const saveCampaign = async (campaign: Campaign) => {
    try {
      setSavingCampaign(campaign.weekday);

      const result = await apiRequest(
        `/admin/engagement/campaigns/${campaign.weekday}`,
        "PUT",
        {
          feature_key: campaign.feature_key,
          title: campaign.title,
          body: campaign.body,
          enabled: campaign.enabled,
        }
      );

      if (result.campaign) {
        setCampaigns((current) =>
          current.map((item) =>
            item.weekday === campaign.weekday
              ? result.campaign
              : item
          )
        );
      }
showMessage(
        "Campaign saved",
        `${WEEKDAYS[campaign.weekday]}'s campaign has been updated.`
      );
    } catch (error: any) {
      showMessage(
        "Save failed",
        error?.message || "Could not save campaign."
      );
    } finally {
      setSavingCampaign(null);
    }
  };
// =====================================================
  // TEST NOTIFICATION
  // =====================================================

  const sendTestNotification = async () => {
    if (!testTitle.trim() || !testBody.trim()) {
      showMessage(
        "Missing details",
        "Enter a title and message first."
      );
      return;
    }

    try {
      setTesting(true);

      const result = await apiRequest(
        "/admin/engagement/test",
        "POST",
        {
          title: testTitle.trim(),
          body: testBody.trim(),
        }
      );

      const browserSent = Number(result.browserSent || 0);
      const nativeAccepted = result.native === true;
      const browserAccepted = result.browser === true;

      if (browserAccepted && nativeAccepted) {
        showMessage(
          "Test notification sent",
          `Web browser: ${browserSent} notification(s) accepted.\nAndroid/iOS: accepted.`
        );
      } else if (browserAccepted) {
        showMessage(
          "Web test sent",
          `${browserSent} browser notification(s) accepted.`
        );
      } else if (nativeAccepted) {
        showMessage(
          "Mobile test sent",
          "Android/iOS accepted the notification, but no web browser notification was confirmed."
        );
      } else {
        showMessage(
          "Delivery incomplete",
          "Neither notification channel confirmed delivery."
        );
      }
    } catch (error: any) {
      showMessage(
        "Test failed",
        error?.message || "Could not send the test notification."
      );
    } finally {
      setTesting(false);
    }
  };

  // =====================================================
  // TIME PREVIEW
  // =====================================================

  const formatTime = (hour: number, minute: number) => {
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return "--:--";
    }

    const date = new Date();
    date.setHours(hour, minute, 0, 0);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const previewHour =
    hourInput.length === 2 &&
    Number(hourInput) >= 0 &&
    Number(hourInput) <= 23
      ? Number(hourInput)
      : -1;

  const previewMinute =
    minuteInput.length === 2 &&
    Number(minuteInput) >= 0 &&
    Number(minuteInput) <= 59
      ? Number(minuteInput)
      : -1;

  const statusColor = (status: CampaignHistory["status"]) => {
    if (status === "sent") return GREEN;
    if (status === "partial") return GOLD;
    if (status === "failed") return RED;
    return MUTED;
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />

        <ActivityIndicator size="large" color={GOLD} />

        <Text style={styles.loadingText}>
          Loading Engagement Manager...
        </Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>
          NASARA ADMINISTRATION
        </Text>

        <Text style={styles.headerTitle}>
          Engagement Manager
        </Text>

        <Text style={styles.headerSubtitle}>
          Keep your community active with daily reminders.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* DAILY REMINDER SETTINGS */}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>🔔</Text>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.cardTitle}>
                Daily reminders
              </Text>

              <Text style={styles.cardSubtitle}>
                Control the automatic daily campaign.
              </Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>
                Enable daily reminders
              </Text>

              <Text style={styles.settingDescription}>
                Send the scheduled campaign to eligible users.
              </Text>
            </View>

            <Switch
              value={settings.enabled}
              onValueChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  enabled: value,
                }))
              }
              trackColor={{
                false: "#D5D9E2",
                true: GOLD,
              }}
              thumbColor={WHITE}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>
            Sending time — Ghana time
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>
                Hour (00–23)
              </Text>

              <TextInput
                value={hourInput}
                onChangeText={handleHourChange}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.timeInput}
                placeholder="08"
                placeholderTextColor={MUTED}
                selectTextOnFocus
                editable={!savingSettings}
              />
            </View>

            <Text style={styles.timeColon}>:</Text>

            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>
                Minute (00–59)
              </Text>

              <TextInput
                value={minuteInput}
                onChangeText={handleMinuteChange}
                keyboardType="number-pad"
                maxLength={2}
                style={styles.timeInput}
                placeholder="30"
                placeholderTextColor={MUTED}
                selectTextOnFocus
                editable={!savingSettings}
              />
            </View>

            <View style={styles.timePreview}>
              <Text style={styles.timePreviewLabel}>
                Preview
              </Text>

              <Text style={styles.timePreviewValue}>
                {previewHour >= 0 && previewMinute >= 0
                  ? formatTime(previewHour, previewMinute)
                  : "--:--"}
              </Text>
            </View>
          </View>

          <Text style={styles.helperText}>
            Enter the hour using 24-hour time. For example, 14:30
            means 2:30 PM. The backend checks this time every minute
            using the Africa/Accra timezone.
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              savingSettings && styles.disabledButton,
            ]}
            onPress={updateSettings}
            disabled={savingSettings}
          >
            {savingSettings ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.primaryButtonText}>
                Save reminder settings
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* WEEKLY CAMPAIGNS */}

        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            Weekly campaigns
          </Text>

          <Text style={styles.sectionDescription}>
            Edit the message users receive on each day.
          </Text>
        </View>

        {campaigns.map((campaign) => (
          <View
            key={campaign.weekday}
            style={styles.campaignCard}
          >
            <View style={styles.campaignTopRow}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>
                  {WEEKDAYS[campaign.weekday]}
                </Text>
              </View>

              <Switch
                value={campaign.enabled}
                onValueChange={(value) =>
                  updateCampaignField(
                    campaign.weekday,
                    "enabled",
                    value
                  )
                }
                trackColor={{
                  false: "#D5D9E2",
                  true: GOLD,
                }}
                thumbColor={WHITE}
              />
            </View>

            <Text style={styles.fieldLabel}>
              Feature key
            </Text>

            <TextInput
              value={campaign.feature_key}
              onChangeText={(value) =>
                updateCampaignField(
                  campaign.weekday,
                  "feature_key",
                  value
                )
              }
              autoCapitalize="none"
              style={styles.textInput}
              placeholder="e.g. marketplace"
              placeholderTextColor={MUTED}
            />

            <Text style={styles.fieldLabel}>
              Notification title
            </Text>

            <TextInput
              value={campaign.title}
              onChangeText={(value) =>
                updateCampaignField(
                  campaign.weekday,
                  "title",
                  value
                )
              }
              style={styles.textInput}
              placeholder="Enter notification title"
              placeholderTextColor={MUTED}
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>
              Notification message
            </Text>

            <TextInput
              value={campaign.body}
              onChangeText={(value) =>
                updateCampaignField(
                  campaign.weekday,
                  "body",
                  value
                )
              }
              style={[
                styles.textInput,
                styles.messageInput,
              ]}
              placeholder="Write a short message for Nasara users"
              placeholderTextColor={MUTED}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                savingCampaign === campaign.weekday &&
                  styles.disabledButton,
              ]}
              onPress={() => saveCampaign(campaign)}
              disabled={savingCampaign === campaign.weekday}
            >
              {savingCampaign === campaign.weekday ? (
                <ActivityIndicator color={NAVY} />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Save {WEEKDAYS[campaign.weekday]} campaign
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* TEST NOTIFICATION */}

        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            Test notification
          </Text>

          <Text style={styles.sectionDescription}>
            Send a test to the administrator account currently signed in.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            Test title
          </Text>

          <TextInput
            value={testTitle}
            onChangeText={setTestTitle}
            style={styles.textInput}
            placeholder="Notification title"
            placeholderTextColor={MUTED}
            maxLength={100}
          />

          <Text style={styles.fieldLabel}>
            Test message
          </Text>

          <TextInput
            value={testBody}
            onChangeText={setTestBody}
            style={[
              styles.textInput,
              styles.messageInput,
            ]}
            placeholder="Notification message"
            placeholderTextColor={MUTED}
            multiline
            textAlignVertical="top"
            maxLength={300}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              testing && styles.disabledButton,
            ]}
            onPress={sendTestNotification}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.primaryButtonText}>
                Send test notification
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* CAMPAIGN HISTORY */}

        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            Campaign history
          </Text>

          <Text style={styles.sectionDescription}>
            Review recent campaign results.
          </Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              No campaign history yet
            </Text>

            <Text style={styles.emptyText}>
              Completed daily campaigns will appear here.
            </Text>
          </View>
        ) : (
          history.map((item) => (
            <View
              key={item.notification_date}
              style={styles.historyCard}
            >
              <View style={styles.historyTopRow}>
                <Text style={styles.historyDate}>
                  {item.notification_date}
                </Text>

                <Text
                  style={[
                    styles.historyStatus,
                    { color: statusColor(item.status) },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.historyTitle}>
                {item.title}
              </Text>

              <Text style={styles.historyBody}>
                {item.body}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {item.target_count}
                  </Text>

                  <Text style={styles.statLabel}>
                    Targeted
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: GREEN },
                    ]}
                  >
                    {item.sent_count}
                  </Text>

                  <Text style={styles.statLabel}>
                    Accepted
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: RED },
                    ]}
                  >
                    {item.failed_count}
                  </Text>

                  <Text style={styles.statLabel}>
                    Failed
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* REFRESH */}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setLoading(true);
            loadDashboard();
          }}
        >
          <Text style={styles.refreshButtonText}>
            Refresh dashboard
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          NASARA • ENGAGEMENT MANAGEMENT
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: WHITE,
    marginTop: 14,
    fontSize: 14,
  },

  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
  },

  headerEyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  headerTitle: {
    color: WHITE,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 8,
  },

  headerSubtitle: {
    color: "#C5CCDA",
    fontSize: 13,
    marginTop: 6,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 17,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8EBF1",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFF5D9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  sectionIconText: {
    fontSize: 20,
  },

  sectionHeading: {
    flex: 1,
  },

  cardTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
  },

  cardSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settingTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  settingTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "800",
  },

  settingDescription: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  divider: {
    height: 1,
    backgroundColor: "#EDF0F5",
    marginVertical: 17,
  },

  fieldLabel: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 13,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  timeInputGroup: {
    flex: 1,
  },

  timeLabel: {
    color: MUTED,
    fontSize: 10,
    marginBottom: 6,
  },

  timeInput: {
    backgroundColor: "#F5F6F9",
    borderWidth: 1,
    borderColor: "#E5E8EF",
    borderRadius: 11,
    height: 48,
    color: NAVY,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },

  timeColon: {
    color: NAVY,
    fontSize: 22,
    fontWeight: "900",
    marginHorizontal: 8,
    marginBottom: 10,
  },

  timePreview: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 5,
  },

  timePreviewLabel: {
    color: MUTED,
    fontSize: 10,
  },

  timePreviewValue: {
    color: GOLD,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },

  helperText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },

  primaryButton: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    minHeight: 48,
  },

  primaryButtonText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: "900",
  },

  secondaryButton: {
    backgroundColor: "#FFF5D9",
    borderWidth: 1,
    borderColor: "#F0D58B",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 46,
  },

  secondaryButtonText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  sectionTitleContainer: {
    marginTop: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  campaignCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E8EBF1",
  },

  campaignTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  dayBadge: {
    backgroundColor: NAVY,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  dayBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
  },

  textInput: {
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E4E7ED",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: NAVY,
    fontSize: 13,
    minHeight: 45,
  },

  messageInput: {
    minHeight: 92,
    paddingTop: 12,
  },

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },

  historyCard: {
    backgroundColor: WHITE,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8EBF1",
  },

  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  historyDate: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  historyStatus: {
    fontSize: 10,
    fontWeight: "900",
  },

  historyTitle: {
    color: NAVY,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },

  historyBody: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F5",
  },

  statBox: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    color: NAVY,
    fontSize: 18,
    fontWeight: "900",
  },

  statLabel: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },

  refreshButton: {
    borderWidth: 1,
    borderColor: NAVY,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },

  refreshButtonText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: "900",
  },

  footerText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1.5,
    marginTop: 25,
  },
});