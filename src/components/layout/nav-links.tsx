"use client";

import {
  BarChart3,
  Building2,
  CircleGauge,
  ContactRound,
  Landmark,
  MailOpen,
  Map,
  Megaphone,
  Settings2,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { fr } from "@/lib/i18n/fr";
import {
  getVisibleNavigation,
  type NavigationKey,
  type NavigationPolicy,
} from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/auth";

const icons: Record<NavigationKey, LucideIcon> = {
  dashboard: CircleGauge,
  explore: Map,
  companies: Building2,
  contacts: ContactRound,
  campaigns: Megaphone,
  inbox: MailOpen,
  opportunities: Target,
  venues: Landmark,
  analytics: BarChart3,
  settings: Settings2,
};

interface NavLinksProps {
  currentPhase: number;
  role: AppRole;
}

function getLabel(key: NavigationKey): string {
  return fr.navigation[key];
}

function isCurrentPath(pathname: string, item: NavigationPolicy): boolean {
  if (item.href === "/dashboard") {
    return pathname === item.href;
  }

  return pathname.startsWith(item.href.split("/").slice(0, 2).join("/"));
}

export function NavLinks({ currentPhase, role }: NavLinksProps) {
  const pathname = usePathname();
  const navigation = getVisibleNavigation(role);

  return (
    <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto lg:flex-col">
      {navigation.map((item) => {
        const Icon = icons[item.key];
        const isAvailable = item.availableFromPhase <= currentPhase;
        const isActive = isAvailable && isCurrentPath(pathname, item);
        const content = (
          <>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{getLabel(item.key)}</span>
            {!isAvailable ? (
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                P{item.availableFromPhase}
              </span>
            ) : null}
          </>
        );

        const className = cn(
          "flex min-h-10 min-w-fit items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:w-full",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          !isAvailable &&
            "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-muted-foreground",
        );

        if (!isAvailable) {
          return (
            <span
              key={item.key}
              className={className}
              aria-disabled="true"
              title={fr.common.comingSoon}
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            className={className}
            aria-current={isActive ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
