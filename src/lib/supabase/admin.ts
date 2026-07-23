import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

const serviceRoleSchema = z.string().min(1);

export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = serviceRoleSchema.parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
