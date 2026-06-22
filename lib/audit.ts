import { supabase } from "../lib/supabase"; // adjust path if needed

export const logAudit = async (
  adminId: string,
  action: string,
  refId: string,
  details?: string
) => {
  await (supabase as any).from("utility_audit_logs").insert({
    user_id: adminId,
    action,
    reference_id: refId,
    details,
  });
};