"use client";

import { AlertTriangle, ArrowUpRight, CalendarClock, GripVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { OpportunityStageRow } from "@/types/database";

import type { OpportunityListItem } from "../types";

interface PipelineBoardProps {
  stages: OpportunityStageRow[];
  opportunities: OpportunityListItem[];
  writable: boolean;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Aucune échéance";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export function PipelineBoard({ stages, opportunities, writable }: PipelineBoardProps) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    opportunityId: string;
    stageId: string;
    stageLabel: string;
    requiresLossReason: boolean;
  } | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lossReasonRef = useRef<HTMLTextAreaElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const busyIdRef = useRef<string | null>(null);

  const activeStages = useMemo(
    () =>
      stages.filter(
        (stage) =>
          stage.is_active || opportunities.some((opportunity) => opportunity.stage_id === stage.id),
      ),
    [opportunities, stages],
  );

  useEffect(() => {
    busyIdRef.current = busyId;
  }, [busyId]);

  useEffect(() => {
    if (!pendingMove) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusableSelector =
      "button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]";

    document.body.style.overflow = "hidden";
    (pendingMove.requiresLossReason ? lossReasonRef.current : cancelButtonRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyIdRef.current) {
        setPendingMove(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [pendingMove]);

  function requestMove(opportunityId: string, stageId: string) {
    const stage = stages.find((item) => item.id === stageId);
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    if (!stage || !opportunity || stage.id === opportunity.stage_id) return;
    setPendingMove({
      opportunityId,
      stageId,
      stageLabel: stage.label,
      requiresLossReason: stage.category === "lost",
    });
    setLossReason("");
    setFailed(false);
  }

  async function confirmMove() {
    if (!pendingMove) return;
    if (pendingMove.requiresLossReason && lossReason.trim().length < 3) {
      setFailed(true);
      setAnnouncement("Renseignez un motif de perte avant de continuer.");
      return;
    }
    setBusyId(pendingMove.opportunityId);
    setFailed(false);
    const response = await fetch(`/api/opportunities/${pendingMove.opportunityId}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stageId: pendingMove.stageId,
        lossReason: pendingMove.requiresLossReason ? lossReason : null,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFailed(true);
      setAnnouncement(payload.error ?? "Le passage d’étape n’a pas abouti.");
    } else {
      setAnnouncement(`Opportunité déplacée vers ${pendingMove.stageLabel}.`);
      setPendingMove(null);
      router.refresh();
    }
    setBusyId(null);
  }

  return (
    <>
      <div
        className={cn(
          "overflow-x-auto pb-4 [scrollbar-color:var(--border)_transparent]",
          draggedId && "select-none",
        )}
        aria-label="Pipeline commercial"
      >
        <div
          className="grid min-w-max gap-3"
          style={{ gridTemplateColumns: `repeat(${activeStages.length}, minmax(18rem, 20rem))` }}
        >
          {activeStages.map((stage) => {
            const items = opportunities.filter((item) => item.stage_id === stage.id);
            const total = items.reduce(
              (sum, item) =>
                sum + (item.signed_amount ?? item.proposed_amount ?? item.estimated_amount ?? 0),
              0,
            );
            const weighted = items.reduce(
              (sum, item) =>
                sum +
                (item.signed_amount ?? item.proposed_amount ?? item.estimated_amount ?? 0) *
                  (item.probability / 100),
              0,
            );
            return (
              <section
                key={stage.id}
                className={cn(
                  "min-h-[28rem] border-t-4 bg-muted/35",
                  draggedId && writable && "outline-1 outline-dashed outline-border",
                  stage.category === "won"
                    ? "border-success"
                    : stage.category === "lost"
                      ? "border-muted-foreground"
                      : "border-primary/45",
                )}
                onDragOver={(event) => {
                  if (writable) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedId && writable) requestMove(draggedId, stage.id);
                  setDraggedId(null);
                }}
              >
                <header className="border-b border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-data text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Jalon {String(stage.position / 10).padStart(2, "0")}
                      </p>
                      <h2 className="font-display mt-1 text-lg font-semibold tracking-[-0.025em]">
                        {stage.label}
                      </h2>
                    </div>
                    <span className="font-data rounded-full border border-border bg-card px-2 py-1 text-[0.65rem]">
                      {items.length}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Volume</p>
                      <p className="font-data mt-1 font-semibold">{formatMoney(total, "EUR")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pondéré</p>
                      <p className="font-data mt-1 font-semibold">{formatMoney(weighted, "EUR")}</p>
                    </div>
                  </div>
                </header>

                <div className="divide-y divide-border">
                  {items.map((opportunity) => {
                    const amount =
                      opportunity.signed_amount ??
                      opportunity.proposed_amount ??
                      opportunity.estimated_amount ??
                      0;
                    return (
                      <article
                        key={opportunity.id}
                        draggable={writable}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedId(opportunity.id);
                        }}
                        onDragEnd={() => setDraggedId(null)}
                        className={cn(
                          "group bg-card p-4 [content-visibility:auto] [contain-intrinsic-size:auto_15rem]",
                          busyId === opportunity.id && "opacity-55",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {writable ? (
                            <GripVertical
                              className="mt-1 size-4 shrink-0 cursor-grab text-muted-foreground"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/opportunities/${opportunity.id}`}
                              className="font-display block text-lg font-semibold leading-6 tracking-[-0.025em] hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {opportunity.title}
                            </Link>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {opportunity.companyName}
                              {opportunity.contactName ? ` · ${opportunity.contactName}` : ""}
                            </p>
                          </div>
                          <ArrowUpRight
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </div>

                        <div className="mt-4 border-l-2 border-primary/30 pl-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-data text-base font-semibold">
                              {formatMoney(amount, opportunity.currency)}
                            </p>
                            <p className="font-data text-[0.65rem] text-muted-foreground">
                              {opportunity.probability}% ·{" "}
                              {formatMoney(
                                amount * (opportunity.probability / 100),
                                opportunity.currency,
                              )}
                            </p>
                          </div>
                          <p className="mt-2 flex items-start gap-2 text-xs leading-5">
                            <CalendarClock
                              className="mt-0.5 size-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <span>
                              {opportunity.next_action ?? "Prochaine action à définir"}
                              <span className="block text-muted-foreground">
                                {formatDate(opportunity.next_action_at)}
                              </span>
                            </span>
                          </p>
                        </div>

                        {opportunity.overdueTaskCount ? (
                          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-danger">
                            <AlertTriangle className="size-3.5" aria-hidden="true" />
                            {opportunity.overdueTaskCount} action en retard
                          </p>
                        ) : null}

                        {writable ? (
                          <div className="mt-4">
                            <label htmlFor={`move-${opportunity.id}`} className="sr-only">
                              Déplacer {opportunity.title}
                            </label>
                            <Select
                              id={`move-${opportunity.id}`}
                              value={opportunity.stage_id}
                              onChange={(event) =>
                                requestMove(opportunity.id, event.currentTarget.value)
                              }
                              disabled={busyId === opportunity.id}
                              className="h-9 text-xs"
                            >
                              {activeStages.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                  {!items.length ? (
                    <p className="p-5 text-center text-xs leading-5 text-muted-foreground">
                      Aucun dossier à ce jalon.
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {pendingMove ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overscroll-contain bg-foreground/35 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="move-dialog-title"
          aria-describedby="move-dialog-description"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-primary">
              Passage de jalon
            </p>
            <h2 id="move-dialog-title" className="font-display mt-2 text-2xl font-semibold">
              Déplacer vers {pendingMove.stageLabel}
            </h2>
            <p
              id="move-dialog-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              Le changement sera ajouté à l’historique et recalculera la valeur pondérée.
            </p>
            {pendingMove.requiresLossReason ? (
              <div className="mt-5">
                <label htmlFor="loss-reason" className="text-sm font-semibold">
                  Motif de perte
                </label>
                <textarea
                  ref={lossReasonRef}
                  id="loss-reason"
                  name="lossReason"
                  value={lossReason}
                  onChange={(event) => setLossReason(event.currentTarget.value)}
                  autoComplete="off"
                  rows={3}
                  maxLength={500}
                  className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                />
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setPendingMove(null)}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmMove}
                disabled={Boolean(busyId)}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {busyId ? "Déplacement…" : "Confirmer le passage"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className={failed ? "text-sm text-danger" : "sr-only"} role={failed ? "alert" : "status"}>
        {announcement}
      </p>
    </>
  );
}
