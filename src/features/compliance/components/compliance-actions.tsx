"use client";

import { Download, FlaskConical, Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ComplianceSettingsRow } from "@/types/database";

import type { ComplianceContactOption } from "../types";

async function apiRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "L’action n’a pas abouti.");
  return payload;
}

function ActionStatus({ message, error }: { message: string | null; error: string | null }) {
  return (
    <p aria-live="polite" className={`min-h-5 text-xs ${error ? "text-danger" : "text-success"}`}>
      {error ?? message}
    </p>
  );
}

export function ComplianceSettingsForm({
  settings,
  canWrite,
}: {
  settings: ComplianceSettingsRow;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest("/api/compliance/settings", {
          method: "PATCH",
          body: JSON.stringify({
            defaultLawfulBasis: data.get("defaultLawfulBasis"),
            contactRetentionDays: Number(data.get("contactRetentionDays")),
            messageRetentionDays: Number(data.get("messageRetentionDays")),
            providerLogRetentionDays: Number(data.get("providerLogRetentionDays")),
            auditRetentionDays: Number(data.get("auditRetentionDays")),
            anonymizeInactiveContacts: data.get("anonymizeInactiveContacts") === "on",
            retainSuppressionProof: true,
            trackingEnabled: data.get("trackingEnabled") === "on",
          }),
        });
        setMessage("Politique enregistrée et journalisée.");
        setDirty(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "L’enregistrement a échoué.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      onChange={() => setDirty(true)}
      autoComplete="off"
      className="space-y-5"
    >
      <fieldset disabled={!canWrite || pending} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
          Base légale par défaut
          <Select name="defaultLawfulBasis" defaultValue={settings.default_lawful_basis}>
            <option value="legitimate_interest">Intérêt légitime documenté</option>
            <option value="consent">Consentement</option>
            <option value="contract">Contrat</option>
            <option value="legal_obligation">Obligation légale</option>
          </Select>
        </label>
        {[
          ["contactRetentionDays", "Contacts inactifs", settings.contact_retention_days, 30, 3650],
          ["messageRetentionDays", "Messages", settings.message_retention_days, 30, 3650],
          [
            "providerLogRetentionDays",
            "Journaux providers",
            settings.provider_log_retention_days,
            30,
            1825,
          ],
          ["auditRetentionDays", "Journal d’audit", settings.audit_retention_days, 365, 3650],
        ].map(([name, label, value, min, max]) => (
          <label key={String(name)} className="grid gap-1.5 text-sm font-medium">
            {label} <span className="text-xs font-normal text-muted-foreground">(jours)</span>
            <Input
              name={String(name)}
              type="number"
              min={Number(min)}
              max={Number(max)}
              defaultValue={Number(value)}
              required
            />
          </label>
        ))}
        <div className="space-y-3 rounded-lg border border-border p-4 sm:col-span-2">
          {[
            [
              "anonymizeInactiveContacts",
              "Anonymiser les contacts inactifs",
              settings.anonymize_inactive_contacts,
            ],
            [
              "retainSuppressionProof",
              "Conserver la preuve d’opposition",
              settings.retain_suppression_proof,
            ],
            ["trackingEnabled", "Activer le tracking comportemental", settings.tracking_enabled],
          ].map(([name, label, checked]) => (
            <label key={String(name)} className="flex min-h-8 items-center gap-3 text-sm">
              <input
                type="checkbox"
                name={String(name)}
                defaultChecked={Boolean(checked)}
                disabled={name === "retainSuppressionProof"}
                className="size-4 accent-[var(--primary)]"
              />
              {label}
              {name === "retainSuppressionProof" ? (
                <span className="ml-auto text-xs text-muted-foreground">invariant obligatoire</span>
              ) : name === "trackingEnabled" ? (
                <span className="ml-auto text-xs text-muted-foreground">désactivé par défaut</span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActionStatus message={message} error={error} />
        {canWrite ? (
          <Button type="submit" disabled={pending}>
            <Save className="size-4" aria-hidden="true" />
            {pending ? "Enregistrement…" : "Enregistrer la politique"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Lecture seule pour votre rôle.</span>
        )}
      </div>
    </form>
  );
}

export function RetentionSimulationButton({ canSimulate }: { canSimulate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function simulate() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest("/api/compliance/retention/simulate", { method: "POST", body: "{}" });
        setMessage("Simulation terminée : aucune donnée n’a été modifiée.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "La simulation a échoué.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        onClick={simulate}
        disabled={!canSimulate || pending}
      >
        <FlaskConical className="size-4" aria-hidden="true" />
        {pending ? "Simulation…" : "Simuler la rétention"}
      </Button>
      <ActionStatus message={message} error={error} />
      {!canSimulate ? (
        <p className="text-xs text-muted-foreground">Simulation réservée à l’administrateur.</p>
      ) : null}
    </div>
  );
}

export function PrivacyRequestForm({
  contacts,
  canProcess,
}: {
  contacts: ComplianceContactOption[];
  canProcess: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedContact, setSelectedContact] = useState(contacts[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (
      !window.confirm(
        "Confirmez-vous l’anonymisation irréversible de ce contact et de ses échanges ?",
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await apiRequest("/api/compliance/privacy", {
          method: "POST",
          body: JSON.stringify({
            contactId: data.get("contactId"),
            requestType: data.get("requestType"),
            reason: data.get("reason"),
            confirmation: data.get("confirmation"),
          }),
        });
        setMessage("Demande exécutée ; les séquences ont été stoppées et la preuve conservée.");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "La demande a échoué.");
      }
    });
  }

  if (!contacts.length) {
    return <p className="text-sm text-muted-foreground">Aucun contact disponible.</p>;
  }

  return (
    <form onSubmit={submit} autoComplete="off" className="space-y-4">
      <fieldset disabled={!canProcess || pending} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium">
          Personne concernée
          <Select
            name="contactId"
            value={selectedContact}
            onChange={(event) => setSelectedContact(event.target.value)}
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.email ? ` · ${contact.email}` : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Action
          <Select name="requestType" defaultValue="anonymize">
            <option value="anonymize">Anonymiser les données personnelles</option>
            <option value="delete">Supprimer et anonymiser le dossier</option>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Motif documenté
          <Textarea
            name="reason"
            minLength={3}
            maxLength={500}
            required
            defaultValue="Demande vérifiée de la personne concernée"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Saisissez CONFIRMER
          <Input name="confirmation" autoComplete="off" pattern="CONFIRMER" required />
        </label>
      </fieldset>
      <div className="rounded-lg border border-danger/25 bg-danger/5 p-3 text-xs leading-5 text-foreground">
        <ShieldAlert className="mr-2 inline size-4 text-danger" aria-hidden="true" />
        Cette action retire les données personnelles, stoppe les séquences et ne peut pas restaurer
        le contenu supprimé.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canProcess || pending}>
          {pending ? "Traitement…" : "Exécuter la demande"}
        </Button>
        {canProcess && selectedContact ? (
          <a
            href={`/api/compliance/contacts/${selectedContact}/export`}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Exporter les données
          </a>
        ) : null}
      </div>
      <ActionStatus message={message} error={error} />
    </form>
  );
}
