"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ThreadOpportunityFormProps {
  threadId: string;
  defaultTitle: string;
  defaultEventType?: string | null;
  defaultGuests?: number | null;
  defaultDate?: string | null;
  existingOpportunityId?: string | null;
  disabled?: boolean;
}

export function ThreadOpportunityForm({
  threadId,
  defaultTitle,
  defaultEventType,
  defaultGuests,
  defaultDate,
  existingOpportunityId,
  disabled,
}: ThreadOpportunityFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  if (existingOpportunityId) {
    return (
      <Link
        href={`/opportunities/${existingOpportunityId}`}
        className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
      >
        Ouvrir l’opportunité
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    );
  }

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const rawNextActionAt = String(formData.get("nextActionAt") ?? "").trim();
    const response = await fetch(`/api/threads/${threadId}/opportunity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        eventType: String(formData.get("eventType") ?? "").trim() || null,
        estimatedGuests: Number(formData.get("estimatedGuests")) || null,
        desiredEventDate: String(formData.get("desiredEventDate") ?? "").trim() || null,
        nextAction: formData.get("nextAction"),
        nextActionAt: rawNextActionAt ? new Date(rawNextActionAt).toISOString() : null,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      opportunityId?: string;
      error?: string;
    };
    if (!response.ok || !payload.opportunityId) {
      setFailed(true);
      setMessage(payload.error ?? "L’opportunité n’a pas pu être créée.");
    } else {
      router.push(`/opportunities/${payload.opportunityId}`);
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <label htmlFor="thread-opportunity-title" className="text-xs font-semibold">
          Titre du dossier
        </label>
        <Input
          id="thread-opportunity-title"
          name="title"
          defaultValue={defaultTitle}
          minLength={3}
          maxLength={200}
          required
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="thread-event-type" className="text-xs font-semibold">
            Format
          </label>
          <Input
            id="thread-event-type"
            name="eventType"
            defaultValue={defaultEventType ?? ""}
            maxLength={120}
            autoComplete="off"
            className="mt-1.5"
            disabled={disabled || pending}
          />
        </div>
        <div>
          <label htmlFor="thread-guests" className="text-xs font-semibold">
            Participants
          </label>
          <Input
            id="thread-guests"
            name="estimatedGuests"
            type="number"
            min="1"
            max="100000"
            defaultValue={defaultGuests ?? ""}
            inputMode="numeric"
            autoComplete="off"
            className="mt-1.5"
            disabled={disabled || pending}
          />
        </div>
      </div>
      <div>
        <label htmlFor="thread-event-date" className="text-xs font-semibold">
          Date souhaitée
        </label>
        <Input
          id="thread-event-date"
          name="desiredEventDate"
          type="date"
          defaultValue={defaultDate?.match(/^\d{4}-\d{2}-\d{2}$/) ? defaultDate : ""}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="thread-next-action" className="text-xs font-semibold">
          Première action
        </label>
        <Input
          id="thread-next-action"
          name="nextAction"
          defaultValue="Qualifier le besoin"
          minLength={2}
          maxLength={300}
          required
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="thread-next-action-at" className="text-xs font-semibold">
          Échéance
        </label>
        <Input
          id="thread-next-action-at"
          name="nextActionAt"
          type="datetime-local"
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? "Création…" : "Créer l’opportunité"}
      </Button>
      {message ? (
        <p
          className={`text-xs ${failed ? "text-danger" : "text-muted-foreground"}`}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
