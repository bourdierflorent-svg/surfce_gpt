"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ReplyComposerProps {
  threadId: string;
  defaultSubject: string;
  defaultBody: string;
  disabled?: boolean;
}

export function ReplyComposer({
  threadId,
  defaultSubject,
  defaultBody,
  disabled,
}: ReplyComposerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const response = await fetch(`/api/threads/${threadId}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: formData.get("subject"),
        bodyText: formData.get("bodyText"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      duplicate?: boolean;
    };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "La réponse n’a pas été confirmée.");
    } else {
      setDirty(false);
      setMessage(
        payload.duplicate
          ? "Cette réponse avait déjà été traitée."
          : "Réponse envoyée dans le fil du provider.",
      );
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <label htmlFor="reply-subject" className="text-xs font-semibold">
          Objet
        </label>
        <Input
          id="reply-subject"
          name="subject"
          className="mt-1.5"
          defaultValue={defaultSubject}
          required
          maxLength={140}
          autoComplete="off"
          onInput={() => setDirty(true)}
          disabled={disabled || pending}
        />
      </div>
      <div>
        <label htmlFor="reply-body" className="text-xs font-semibold">
          Réponse
        </label>
        <Textarea
          id="reply-body"
          name="bodyText"
          className="mt-1.5 min-h-44"
          defaultValue={defaultBody}
          required
          maxLength={10_000}
          autoComplete="off"
          onInput={() => setDirty(true)}
          disabled={disabled || pending}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-xs leading-5 text-muted-foreground">
          L’envoi reste dans le fil Gmail ou Microsoft et est dédupliqué côté SURFCE.
        </p>
        <Button type="submit" disabled={disabled || pending}>
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Envoi…" : "Envoyer la réponse"}
        </Button>
      </div>
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
