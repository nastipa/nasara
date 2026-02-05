import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405 }
      );
    }

    const body = await req.json();

    const item_id = Number(body.item_id);
    const plan_id = Number(body.plan_id);

    if (!item_id || !plan_id) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Get boost plan
    const { data: plan, error: planError } = await supabase
      .from("boost_plans")
      .select("days, price")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: "Boost plan not found" }),
        { status: 400 }
      );
    }

    // 2️⃣ Calculate promotion expiry
    const promoted_until = new Date();
    promoted_until.setDate(promoted_until.getDate() + plan.days);

    // 3️⃣ Update item
    const { data: updated, error: updateError } = await supabase
      .from("items_live")
      .update({
        is_promoted: true,
        promoted_until: promoted_until.toISOString(),
        promotion_type: "boost",
      })
      .eq("id", item_id)
      .select();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500 }
      );
    }

    if (!updated || updated.length === 0) {
      return new Response(
        JSON.stringify({ error: "Item not updated" }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(e) }),
      { status: 500 }
    );
  }
});