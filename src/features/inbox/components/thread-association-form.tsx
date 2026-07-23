"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface ThreadAssociationFormProps {
  threadId: string;
  current: {
    companyId: string | null;
    contactId: string | null;
    campaignId: string | null;
  };
  options: {
    companies: Array<{ id: string; name: string }>;
    contacts: Array<{ id: string; company_id: string; name: string }>;
    campaigns: Array<{ id: string; name: string }>;
  };
  disabled?: boolean;
}

export function ThreadAssociationForm({
  threadId,
  current,
  options,
  disabled,
}: ThreadAssociationFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setFailed(false);
    const optional = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" && value ? value : null;
    };
    const response = await fetch(`/api/threads/${threadId}/associate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: optional("companyId"),
        contactId: optional("contactId"),
        campaignId: optional("campaignId"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFailed(true);
      setMessage(payload.error ?? "L’association n’a pas abouti.");
    } else {
      setMessage("Correspondances enregistrées.");
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <label htmlFor="thread-company" className="text-xs font-semibold">
          Entreprise
        </label>
        <Select
          id="thread-company"
          name="companyId"
          className="mt-1.5"
          defaultValue={current.companyId ?? ""}
          disabled={disabled || pending}
        >
          <option value="">Non associée</option>
          {options.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="thread-contact" className="text-xs font-semibold">
          Contact
        </label>
        <Select
          id="thread-contact"
          name="contactId"
          className="mt-1.5"
          defaultValue={current.contactId ?? ""}
          disabled={disabled || pending}
        >
          <option value="">Non associé</option>
          {options.contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="thread-campaign" className="text-xs font-semibold">
          Campagne
        </label>
        <Select
          id="thread-campaign"
          name="campaignId"
          className="mt-1.5"
          defaultValue={current.campaignId ?? ""}
          disabled={disabled || pending}
        >
          <option value="">Hors campagne</option>
          {options.campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={disabled || pending}>
        {pending ? "Association…" : "Enregistrer les liens"}
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
