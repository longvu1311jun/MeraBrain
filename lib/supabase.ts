import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let supabaseClient: any = null;

export function getSupabaseClient(): any {
  if (!supabaseClient) {
    const env = getEnv();
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}
