"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { classificationLabels, inboundClassificationSchema } from "@/features/inbox/classification";

interface ThreadClassificationFormProps {
  messageId: string;
  classification: string | null;
  priority: "low" | "normal" | "high";
  disabled?: boolean;
}

export function ThreadClassificationForm({
  messageId,
  classification,
  priority,
  disabled,
}: ThreadClassificationFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const response = await fetch(`/api/messages/${messageId}/classify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classification: formData.get("classification"),
        priority: formData.get("priority"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "La qualification n’a pas abouti.");
    } else {
      setMessage("Qualification corrigée et règles d’arrêt réévaluées.");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <label htmlFor="thread-classification" className="text-xs font-semibold">
          Signal détecté
        </label>
        <Select
          id="thread-classification"
          name="classification"
          className="mt-1.5"
          defaultValue={inboundClassificationSchema.safeParse(classification).data ?? "unknown"}
          disabled={disabled || pending}
        >
          {inboundClassificationSchema.options.map((value) => (
            <option key={value} value={value}>
              {classificationLabels[value]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="thread-priority" className="text-xs font-semibold">
          Priorité
        </label>
        <Select
          id="thread-priority"
          name="priority"
          className="mt-1.5"
          defaultValue={priority}
          disabled={disabled || pending}
        >
          <option value="low">Basse</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        {pending ? "Enregistrement…" : "Corriger la qualification"}
      </Button>
      {message ? (
        <p
          className={`text-xs leading-5 ${failed ? "text-danger" : "text-muted-foreground"}`}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
