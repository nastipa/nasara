import { createClient } from "@supabase/supabase-js";

// Supabase project info
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_KEY = "your-service-role-key"; // service_role key required

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUsage() {
  try {
    // Get storage usage per bucket
    const { data: buckets } = await supabase
      .storage
      .listBuckets();

    console.log("Storage usage per bucket:");
    for (const bucket of buckets) {
      console.log(`${bucket.name}: ${bucket.size} bytes`);
    }

    // Get database size
    const { data: dbSize } = await supabase.rpc("pg_database_size", {});

    console.log(`Database size: ${dbSize} bytes`);

    // Optional: set thresholds
    // If storage > 80% or egress > threshold, send alert
  } catch (err) {
    console.error("Error checking usage:", err.message);
  }
}

checkUsage();