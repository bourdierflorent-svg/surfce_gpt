import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface PaginationNavProps {
  pathname: string;
  page: number;
  pageCount: number;
  total: number;
  params?: Record<string, string | undefined>;
}

function pageHref(pathname: string, page: number, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function PaginationNav({
  pathname,
  page,
  pageCount,
  total,
  params = {},
}: PaginationNavProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
    >
      <Link
        href={pageHref(pathname, Math.max(page - 1, 1), params)}
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-self-start",
          page === 1 ? "pointer-events-none opacity-45" : "hover:bg-muted",
        )}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Précédente
      </Link>
      <p className="text-center font-data text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Feuillet {String(page).padStart(2, "0")} / {String(pageCount).padStart(2, "0")} · {total}{" "}
        dossiers
      </p>
      <Link
        href={pageHref(pathname, Math.min(page + 1, pageCount), params)}
        aria-disabled={page === pageCount}
        tabIndex={page === pageCount ? -1 : undefined}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-self-end",
          page === pageCount ? "pointer-events-none opacity-45" : "hover:bg-muted",
        )}
      >
        Suivante
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
