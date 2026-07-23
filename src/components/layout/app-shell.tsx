import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { fr } from "@/lib/i18n/fr";
import type { AppAuthContext } from "@/types/auth";

import { NavLinks } from "./nav-links";
import { SurfceLogo } from "./surfce-logo";

interface AppShellProps {
  authContext: AppAuthContext;
  children: ReactNode;
}

export function AppShell({ authContext, children }: AppShellProps) {
  const { isPreview, membership, organization, user } = authContext;

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {fr.common.skipToContent}
      </a>

      <aside className="border-b border-border bg-card px-4 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
        <div className="mb-3 flex items-center justify-between lg:mb-8 lg:px-2">
          <SurfceLogo />
          {isPreview ? <Badge>{fr.shell.previewMode}</Badge> : null}
        </div>
        <NavLinks currentPhase={5} role={membership.role} />
        <div className="mt-7 hidden rounded-lg border border-border bg-background p-3 lg:block">
          <p className="truncate text-sm font-semibold">{organization.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{fr.roles[membership.role]}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-7">
          <div className="relative hidden max-w-lg flex-1 md:block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <label htmlFor="global-search" className="sr-only">
              {fr.shell.globalSearchLabel}
            </label>
            <input
              id="global-search"
              disabled
              placeholder={fr.shell.globalSearchPlaceholder}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              disabled
              aria-label={fr.shell.notificationsLabel}
              className="grid size-10 place-items-center rounded-lg text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Bell className="size-4" aria-hidden="true" />
            </button>
            <div className="h-8 w-px bg-border" aria-hidden="true" />
            <div className="min-w-0 text-right">
              <p className="max-w-44 truncate text-sm font-semibold">
                {user.fullName ?? user.email}
              </p>
              <p className="max-w-44 truncate text-xs text-muted-foreground">{organization.name}</p>
            </div>
            <div
              className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
              aria-label={fr.shell.accountLabel}
            >
              {(user.fullName ?? user.email).slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        {isPreview ? (
          <div
            className="border-b border-warning/25 bg-warning/8 px-4 py-2.5 text-sm text-foreground md:px-7"
            role="status"
          >
            <span className="font-semibold">{fr.shell.previewMode}.</span>{" "}
            {fr.shell.previewDescription}
          </div>
        ) : null}

        <main id="main-content" className="px-4 py-7 md:px-7 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
