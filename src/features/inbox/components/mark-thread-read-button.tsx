"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function MarkThreadReadButton({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markRead() {
    setPending(true);
    setFailed(false);
    const response = await fetch(`/api/threads/${threadId}/read`, { method: "POST" });
    setPending(false);
    if (response.ok) {
      router.refresh();
    } else {
      setFailed(true);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button variant="secondary" size="sm" onClick={markRead} disabled={pending}>
        <CheckCheck className="size-3.5" aria-hidden="true" />
        {pending ? "Mise à jour…" : "Marquer comme lue"}
      </Button>
      {failed ? (
        <p className="text-xs text-danger" role="alert">
          La conversation n’a pas été mise à jour. Réessayez.
        </p>
      ) : null}
    </div>
  );
}
