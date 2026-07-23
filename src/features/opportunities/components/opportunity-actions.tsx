"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OpportunityStageRow, ProposalRow, TaskRow } from "@/types/database";

function isoFromLocal(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

async function sendJson(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "L’action n’a pas abouti.");
  return payload;
}

export function StageMoveForm({
  opportunityId,
  currentStageId,
  stages,
  disabled,
}: {
  opportunityId: string;
  currentStageId: string;
  stages: OpportunityStageRow[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(currentStageId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const selected = stages.find((stage) => stage.id === stageId);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      await sendJson(`/api/opportunities/${opportunityId}/stage`, "POST", {
        stageId,
        lossReason: String(formData.get("lossReason") ?? "").trim() || null,
      });
      setMessage("Étape enregistrée dans l’historique.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le passage d’étape a échoué.");
    }
    setPending(false);
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <label htmlFor="detail-stage" className="text-xs font-semibold">
          Étape commerciale
        </label>
        <Select
          id="detail-stage"
          name="stageId"
          value={stageId}
          onChange={(event) => setStageId(event.currentTarget.value)}
          disabled={disabled || pending}
          className="mt-1.5"
        >
          {stages
            .filter((stage) => stage.is_active || stage.id === currentStageId)
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label} · {stage.default_probability}%
              </option>
            ))}
        </Select>
      </div>
      {selected?.category === "lost" ? (
        <div>
          <label htmlFor="detail-loss-reason" className="text-xs font-semibold">
            Motif de perte
          </label>
          <Textarea
            id="detail-loss-reason"
            name="lossReason"
            minLength={3}
            maxLength={500}
            required
            rows={3}
            autoComplete="off"
            className="mt-1.5"
          />
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={disabled || pending || stageId === currentStageId}>
        {pending ? "Déplacement…" : "Passer à cette étape"}
      </Button>
      {message ? (
        <p className="text-xs leading-5 text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function TaskComposer({
  opportunityId,
  disabled,
}: {
  opportunityId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      await sendJson(`/api/opportunities/${opportunityId}/tasks`, "POST", {
        title: formData.get("title"),
        description: String(formData.get("description") ?? "").trim() || null,
        priority: formData.get("priority"),
        dueAt: isoFromLocal(formData.get("dueAt")),
      });
      setMessage("Tâche ajoutée au dossier.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La tâche n’a pas pu être créée.");
    }
    setPending(false);
  }

  return (
    <form action={submit} className="grid gap-3">
      <div>
        <label htmlFor="task-title" className="text-xs font-semibold">
          Action à réaliser
        </label>
        <Input
          id="task-title"
          name="title"
          minLength={2}
          maxLength={200}
          required
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-due-at" className="text-xs font-semibold">
            Échéance
          </label>
          <Input
            id="task-due-at"
            name="dueAt"
            type="datetime-local"
            autoComplete="off"
            className="mt-1.5"
            disabled={disabled || pending}
          />
        </div>
        <div>
          <label htmlFor="task-priority" className="text-xs font-semibold">
            Priorité
          </label>
          <Select
            id="task-priority"
            name="priority"
            defaultValue="normal"
            className="mt-1.5"
            disabled={disabled || pending}
          >
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="task-description" className="text-xs font-semibold">
          Détail
        </label>
        <Textarea
          id="task-description"
          name="description"
          rows={2}
          maxLength={2000}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? "Ajout…" : "Ajouter la tâche"}
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function TaskStatusButton({ task, disabled }: { task: TaskRow; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function complete() {
    setPending(true);
    setMessage("");
    try {
      await sendJson(`/api/tasks/${task.id}/status`, "POST", { status: "completed" });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La tâche n’a pas été terminée.");
    }
    setPending(false);
  }

  if (task.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
        <Check className="size-3.5" aria-hidden="true" />
        Terminée
      </span>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={complete}
        disabled={disabled || pending}
        className="text-xs font-semibold text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {pending ? "Mise à jour…" : "Marquer terminée"}
      </button>
      {message ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function AppointmentComposer({
  opportunityId,
  disabled,
}: {
  opportunityId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      await sendJson(`/api/opportunities/${opportunityId}/appointments`, "POST", {
        title: formData.get("title"),
        description: String(formData.get("description") ?? "").trim() || null,
        startsAt: isoFromLocal(formData.get("startsAt")),
        endsAt: isoFromLocal(formData.get("endsAt")),
        location: String(formData.get("location") ?? "").trim() || null,
      });
      setMessage("Rendez-vous planifié et pipeline actualisé.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le rendez-vous n’a pas été créé.");
    }
    setPending(false);
  }

  return (
    <form action={submit} className="grid gap-3">
      <div>
        <label htmlFor="appointment-title" className="text-xs font-semibold">
          Objet du rendez-vous
        </label>
        <Input
          id="appointment-title"
          name="title"
          required
          minLength={2}
          maxLength={200}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="appointment-start" className="text-xs font-semibold">
            Début
          </label>
          <Input
            id="appointment-start"
            name="startsAt"
            type="datetime-local"
            required
            autoComplete="off"
            className="mt-1.5"
            disabled={disabled || pending}
          />
        </div>
        <div>
          <label htmlFor="appointment-end" className="text-xs font-semibold">
            Fin
          </label>
          <Input
            id="appointment-end"
            name="endsAt"
            type="datetime-local"
            required
            autoComplete="off"
            className="mt-1.5"
            disabled={disabled || pending}
          />
        </div>
      </div>
      <div>
        <label htmlFor="appointment-location" className="text-xs font-semibold">
          Lieu ou lien
        </label>
        <Input
          id="appointment-location"
          name="location"
          maxLength={300}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="appointment-description" className="text-xs font-semibold">
          Préparation
        </label>
        <Textarea
          id="appointment-description"
          name="description"
          rows={2}
          maxLength={2000}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? "Planification…" : "Planifier le rendez-vous"}
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function ProposalComposer({
  opportunityId,
  currency,
  estimatedGuests,
  eventDate,
  disabled,
}: {
  opportunityId: string;
  currency: string;
  estimatedGuests: number | null;
  eventDate: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    const inclusions = String(formData.get("inclusions") ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      await sendJson(`/api/opportunities/${opportunityId}/proposals`, "POST", {
        amount: Number(formData.get("amount")),
        currency,
        guestCount: estimatedGuests,
        eventDate,
        summary: formData.get("summary"),
        inclusions,
        terms: String(formData.get("terms") ?? "").trim() || null,
      });
      setMessage("Nouvelle version de proposition créée.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La proposition n’a pas été créée.");
    }
    setPending(false);
  }

  return (
    <form action={submit} className="grid gap-3">
      <div>
        <label htmlFor="proposal-amount" className="text-xs font-semibold">
          Montant proposé · {currency}
        </label>
        <Input
          id="proposal-amount"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          autoComplete="off"
          required
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="proposal-summary" className="text-xs font-semibold">
          Résumé de la proposition
        </label>
        <Textarea
          id="proposal-summary"
          name="summary"
          minLength={3}
          maxLength={2000}
          required
          rows={3}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="proposal-inclusions" className="text-xs font-semibold">
          Prestations incluses, une par ligne
        </label>
        <Textarea
          id="proposal-inclusions"
          name="inclusions"
          rows={3}
          maxLength={3000}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="proposal-terms" className="text-xs font-semibold">
          Conditions
        </label>
        <Textarea
          id="proposal-terms"
          name="terms"
          rows={2}
          maxLength={3000}
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? "Création…" : "Créer une version"}
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function ProposalStatusActions({
  proposal,
  disabled,
}: {
  proposal: ProposalRow;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function update(status: ProposalRow["status"]) {
    setPending(status);
    setMessage("");
    try {
      await sendJson(`/api/proposals/${proposal.id}/status`, "POST", { status });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le statut n’a pas été modifié.");
    }
    setPending(null);
  }

  if (proposal.status === "accepted" || proposal.status === "rejected") return null;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {proposal.status === "draft" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => update("sent")}
            disabled={disabled || Boolean(pending)}
          >
            {pending === "sent" ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Marquer envoyée
          </Button>
        ) : null}
        {proposal.status === "sent" ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => update("accepted")}
              disabled={disabled || Boolean(pending)}
            >
              Marquer acceptée
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => update("rejected")}
              disabled={disabled || Boolean(pending)}
            >
              Marquer refusée
            </Button>
          </>
        ) : null}
      </div>
      {message ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
