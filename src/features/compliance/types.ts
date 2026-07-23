import type {
  AnalyticsExportRow,
  AuditLogRow,
  ComplianceSettingsRow,
  PrivacyRequestRow,
  RetentionRunRow,
} from "@/types/database";

export interface ComplianceContactOption {
  id: string;
  name: string;
  email: string | null;
  lawfulBasis: string | null;
  doNotContact: boolean;
  deletedAt: string | null;
}

export interface ComplianceCenter {
  settings: ComplianceSettingsRow;
  contacts: ComplianceContactOption[];
  diagnostics: {
    activeContacts: number;
    missingLawfulBasis: number;
    suppressedContacts: number;
    deletionCandidates: number;
    documentedSources: number;
  };
  retentionRuns: RetentionRunRow[];
  exports: AnalyticsExportRow[];
  privacyRequests: PrivacyRequestRow[];
  isPreview: boolean;
}

export interface AuditEntry extends AuditLogRow {
  actorLabel: string;
  changedFields: string[];
}

export interface AuditLedger {
  entries: AuditEntry[];
  actors: Array<{ id: string; label: string }>;
  actions: string[];
  entityTypes: string[];
  isPreview: boolean;
}
