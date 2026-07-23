"use client";

import { RefreshCw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface MailboxActionsProps {
  mailboxId: string;
  provider: "mock" | "google" | "microsoft";
  connected: boolean;
}

export function MailboxActions({ mailboxId, provider, connected }: MailboxActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function run(action: "sync" | "disconnect") {
    if (
      action === "disconnect" &&
      !window.confirm("Déconnecter cette boîte ? Les tokens chiffrés et le watch seront supprimés.")
    ) {
      return;
    }
    setPending(action);
    setMessage("");
    setFailed(false);
    const response = await fetch(`/api/mailboxes/${mailboxId}/${action}`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      ingested?: number;
    };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "L’action n’a pas abouti.");
      setPending(null);
      return;
    }
    setMessage(
      action === "sync"
        ? `${payload.ingested ?? 0} nouveau(x) message(s) intégré(s).`
        : "Boîte déconnectée et tokens supprimés.",
    );
    setPending(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {connected && provider !== "mock" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={pending !== null}
            onClick={() => run("sync")}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {pending === "sync" ? "Synchronisation…" : "Synchroniser"}
          </Button>
        ) : null}
        {connected && provider !== "mock" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending !== null}
            onClick={() => run("disconnect")}
          >
            <Unplug className="size-3.5" aria-hidden="true" />
            {pending === "disconnect" ? "Déconnexion…" : "Déconnecter"}
          </Button>
        ) : null}
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
