import type { ContactRow } from "@/types/database";

export interface ContactListItem extends ContactRow {
  companyName: string;
}

export interface ContactDetail extends ContactListItem {
  companyDomain: string | null;
  companyAssignedTo: string | null;
  latestVerification: {
    provider: string;
    checkedAt: string;
    confidence: number;
    mock: boolean;
  } | null;
}
