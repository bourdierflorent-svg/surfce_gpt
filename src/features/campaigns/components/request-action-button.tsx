"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

interface RequestActionButtonProps {
  endpoint: string;
  label: string;
  pendingLabel: string;
  body?: Record<string, unknown>;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
}

export function RequestActionButton({
  endpoint,
  label,
  pendingLabel,
  body = {},
  variant,
  disabled,
}: RequestActionButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setStatus("pending");
    setMessage("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
    };
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error ?? "L’action n’a pas abouti.");
      return;
    }
    setStatus("success");
    setMessage(
      payload.reason === "not_due"
        ? "Message conservé : son créneau n’est pas encore ouvert."
        : "Action enregistrée.",
    );
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant={variant}
        disabled={disabled || status === "pending"}
        onClick={run}
      >
        {status === "pending" ? pendingLabel : label}
      </Button>
      {message ? (
        <p
          className={`max-w-64 text-xs leading-5 ${
            status === "error" ? "text-danger" : "text-muted-foreground"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
