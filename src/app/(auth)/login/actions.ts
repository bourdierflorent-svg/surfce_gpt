"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { loginSchema } from "@/features/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginActionState {
  status: "idle" | "error";
  message: string | null;
  fieldErrors: {
    email?: string[];
    password?: string[];
  };
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: fr.login.genericError,
      fieldErrors: {
        email: errors.email,
        password: errors.password,
      },
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: fr.errors.missingConfiguration,
      fieldErrors: {},
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: fr.login.invalidCredentials,
      fieldErrors: {},
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
