"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface ThreadIntelligenceActionsProps {
  threadId: string;
  disabled?: boolean;
}

export function ThreadIntelligenceActions({ threadId, disabled }: ThreadIntelligenceActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"summarize" | "draft-reply" | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function run(action: "summarize" | "draft-reply") {
    setPending(action);
    setMessage("");
    setFailed(false);
    const response = await fetch(`/api/threads/${threadId}/${action}`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "L’analyse n’a pas abouti.");
    } else {
      setMessage(
        action === "summarize" ? "Résumé structuré actualisé." : "Suggestion de réponse préparée.",
      );
      router.refresh();
    }
    setPending(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={disabled || pending !== null} onClick={() => run("summarize")}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          {pending === "summarize" ? "Analyse…" : "Résumer"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || pending !== null}
          onClick={() => run("draft-reply")}
        >
          {pending === "draft-reply" ? "Rédaction…" : "Suggérer une réponse"}
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
    </div>
  );
}
