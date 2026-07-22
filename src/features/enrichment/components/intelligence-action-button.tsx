"use client";

import { Check, LoaderCircle, Play, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

type CompanyIntelligenceAction =
  | "enrich"
  | "verify"
  | "persona-generate"
  | "persona-validate"
  | "matching-generate"
  | "matching-select";

interface IntelligenceActionButtonProps {
  companyId: string;
  action: CompanyIntelligenceAction;
  label: string;
  disabled?: boolean;
  resourceId?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}

function actionRequest(
  companyId: string,
  action: CompanyIntelligenceAction,
  resourceId?: string,
): { endpoint: string; body: Record<string, string> } {
  const root = `/api/companies/${companyId}`;
  if (action === "enrich") {
    return { endpoint: `${root}/enrich`, body: { idempotencyKey: crypto.randomUUID() } };
  }
  if (action === "verify") {
    return { endpoint: `${root}/verify`, body: { idempotencyKey: crypto.randomUUID() } };
  }
  if (action === "persona-generate") {
    return {
      endpoint: `${root}/persona`,
      body: { action: "generate", idempotencyKey: crypto.randomUUID() },
    };
  }
  if (action === "persona-validate") {
    return {
      endpoint: `${root}/persona`,
      body: { action: "validate", personaId: resourceId ?? "" },
    };
  }
  if (action === "matching-select") {
    return {
      endpoint: `${root}/match-venues`,
      body: { action: "select", matchId: resourceId ?? "" },
    };
  }
  return {
    endpoint: `${root}/match-venues`,
    body: { action: "generate", idempotencyKey: crypto.randomUUID() },
  };
}

export function IntelligenceActionButton({
  companyId,
  action,
  label,
  disabled,
  resourceId,
  variant = "secondary",
  size = "sm",
  className,
}: IntelligenceActionButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const isValidation = action === "persona-validate" || action === "matching-select";

  async function run() {
    setStatus("pending");
    setMessage("Traitement en cours…");
    const request = actionRequest(companyId, action, resourceId);
    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Le traitement n’a pas abouti.");
      setStatus("success");
      setMessage("Terminé. Les données affichées ont été actualisées.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Une erreur inattendue est survenue.");
    }
  }

  const Icon =
    status === "pending"
      ? LoaderCircle
      : status === "success"
        ? Check
        : isValidation
          ? ShieldCheck
          : Play;

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || status === "pending"}
        onClick={run}
        aria-describedby={message ? `${action}-${resourceId ?? companyId}-status` : undefined}
      >
        <Icon
          className={`size-3.5 ${status === "pending" ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
        {status === "pending" ? "En cours…" : label}
      </Button>
      <span
        id={`${action}-${resourceId ?? companyId}-status`}
        className={status === "error" ? "mt-2 block max-w-sm text-xs text-danger" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {message}
      </span>
    </div>
  );
}
