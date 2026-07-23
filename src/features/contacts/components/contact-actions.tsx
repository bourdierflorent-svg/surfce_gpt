"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ContactActionsProps {
  contactId: string;
  canWrite: boolean;
  suppressed: boolean;
}

export function ContactActions({ contactId, canWrite, suppressed }: ContactActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<"verify" | "suppress" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function post(action: "verify" | "suppress") {
    if (
      action === "suppress" &&
      !window.confirm(
        "Confirmer l’opposition ? Les séquences actives seront arrêtées et les messages programmés annulés.",
      )
    ) {
      return;
    }
    setPending(action);
    setMessage("");
    setError(false);
    const endpoint =
      action === "verify"
        ? `/api/contacts/${contactId}/verify-email`
        : `/api/contacts/${contactId}/suppress`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action === "verify" ? {} : { reason, source: "manual_ui" }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      status?: string;
    };
    setPending(null);
    if (!response.ok) {
      setError(true);
      setMessage(payload.error ?? "L’action n’a pas abouti.");
      return;
    }
    setMessage(
      action === "verify"
        ? `Vérification mock terminée : ${payload.status ?? "statut actualisé"}.`
        : "Opposition enregistrée ; les séquences actives sont arrêtées.",
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        disabled={!canWrite || pending !== null || suppressed}
        onClick={() => post("verify")}
      >
        {pending === "verify" ? "Vérification…" : "Vérifier l’adresse"}
      </Button>

      {!suppressed ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label htmlFor="suppression-reason" className="sr-only">
            Motif d’opposition
          </label>
          <Input
            id="suppression-reason"
            name="suppressionReason"
            autoComplete="off"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motif d’opposition…"
            disabled={!canWrite || pending !== null}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!canWrite || reason.trim().length < 3 || pending !== null}
            onClick={() => post("suppress")}
          >
            {pending === "suppress" ? "Blocage…" : "Ne plus contacter"}
          </Button>
        </div>
      ) : null}
      {message ? (
        <p
          className={`text-xs leading-5 ${error ? "text-danger" : "text-muted-foreground"}`}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
