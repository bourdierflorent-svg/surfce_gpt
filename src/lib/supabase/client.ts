"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();

  return createBrowserClient<Database>(config.url, config.anonKey);
}
