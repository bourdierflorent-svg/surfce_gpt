"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpportunityStageRow } from "@/types/database";

export function StageConfigurationForm({
  stage,
  disabled,
}: {
  stage: OpportunityStageRow;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const response = await fetch(`/api/opportunity-stages/${stage.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: formData.get("label"),
        defaultProbability: Number(formData.get("defaultProbability")),
        isActive: formData.get("isActive") === "on",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "La configuration n’a pas été enregistrée.");
    } else {
      setMessage("Étape enregistrée.");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form
      action={submit}
      className="grid gap-3 border-b border-border p-5 last:border-b-0 lg:grid-cols-[5rem_1fr_9rem_8rem_auto] lg:items-end"
    >
      <div>
        <p className="font-data text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
          Position
        </p>
        <p className="font-data mt-2 text-sm font-semibold">{stage.position / 10}</p>
      </div>
      <div>
        <label htmlFor={`stage-label-${stage.id}`} className="text-xs font-semibold">
          Libellé
        </label>
        <Input
          id={`stage-label-${stage.id}`}
          name="label"
          defaultValue={stage.label}
          minLength={2}
          maxLength={80}
          required
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor={`stage-probability-${stage.id}`} className="text-xs font-semibold">
          Probabilité %
        </label>
        <Input
          id={`stage-probability-${stage.id}`}
          name="defaultProbability"
          type="number"
          min="0"
          max="100"
          defaultValue={stage.default_probability}
          required
          inputMode="numeric"
          autoComplete="off"
          className="mt-1.5"
          disabled={disabled || pending}
        />
      </div>
      <label className="flex h-10 items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={stage.is_active}
          disabled={disabled || pending || stage.category !== "open"}
          className="size-4 rounded border-input accent-primary"
        />
        Étape active
      </label>
      <div>
        <Button type="submit" size="sm" disabled={disabled || pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {message ? (
          <p
            className={`mt-2 text-xs ${failed ? "text-danger" : "text-muted-foreground"}`}
            role={failed ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
