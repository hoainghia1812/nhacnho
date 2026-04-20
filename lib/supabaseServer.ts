import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let serverClient: SupabaseClient<Database> | null = null;

export function getSupabaseServer() {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
  }

  serverClient = createClient<Database>(supabaseUrl, serviceRoleKey);
  return serverClient;
}
