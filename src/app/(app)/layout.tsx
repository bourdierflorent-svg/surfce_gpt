import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAppAuthContext } from "@/features/auth/server/auth-context";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const authContext = await requireAppAuthContext();

  return <AppShell authContext={authContext}>{children}</AppShell>;
}
