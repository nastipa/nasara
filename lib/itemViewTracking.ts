// ==========================================
// 👁️ NASARA ITEM VIEW TRACKING
// ==========================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// ==========================================
// 🔑 GET OR CREATE VISITOR SESSION
// ==========================================

const SESSION_KEY = "nasara_item_view_session";

export const getItemViewSession = async (): Promise<string> => {
  try {
    let sessionId = await AsyncStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId =
        "nasara_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).substring(2, 15);

      await AsyncStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    console.error("ITEM VIEW SESSION ERROR:", error);

    throw error;
  }
};

// ==========================================
// 📊 RECORD ITEM VIEW
// ==========================================

export const recordItemView = async (
  itemId: number | string
): Promise<number | null> => {
  try {
    const sessionId = await getItemViewSession();

    // ==========================================
// 📊 CALL ITEM VIEW DATABASE FUNCTION
// ==========================================

const { data, error } = await (supabase as any).rpc(
  "record_item_view",
  {
    p_item_id: String(itemId),
    p_session_id: sessionId,
  }
);

    if (error) {
      console.error("RECORD ITEM VIEW ERROR:", error.message);
      return null;
    }

    return Number(data);
  } catch (error) {
    console.error("ITEM VIEW TRACKING FAILED:", error);
    return null;
  }
};