"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface EnrollmentFormProps {
  campaignId: string;
  contacts: Array<{ id: string; full_name: string; email: string | null }>;
  disabled?: boolean;
}

export function EnrollmentForm({ campaignId, contacts, disabled }: EnrollmentFormProps) {
  const router = useRouter();
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function enroll() {
    setPending(true);
    setMessage("");
    setError(false);
    const response = await fetch(`/api/campaigns/${campaignId}/enroll`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(true);
      setMessage(payload.error ?? "L’inscription a été bloquée.");
      return;
    }
    setMessage("Contact inscrit après contrôle de la suppression.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Select
          aria-label="Contact valide à inscrire"
          name="contactId"
          value={contactId}
          onChange={(event) => setContactId(event.target.value)}
          disabled={disabled || pending || contacts.length === 0}
        >
          {contacts.length ? (
            contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name} · {contact.email}
              </option>
            ))
          ) : (
            <option>Aucun contact valide disponible</option>
          )}
        </Select>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || pending || !contactId}
          onClick={enroll}
        >
          {pending ? "Contrôle…" : "Inscrire"}
        </Button>
      </div>
      {message ? (
        <p
          className={`text-xs ${error ? "text-danger" : "text-muted-foreground"}`}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
