import type { AnalyticsFilters } from "./schemas";

export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit: "count" | "currency" | "hours" | "days";
  definition: string;
  source: string;
}

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  rate: number | null;
  denominator: number | null;
}

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  amount: number;
}

export interface AnalyticsOption {
  value: string;
  label: string;
}

export interface AnalyticsReport {
  filters: AnalyticsFilters;
  generatedAt: string;
  isPreview: boolean;
  metrics: AnalyticsMetric[];
  funnel: FunnelStep[];
  breakdowns: {
    stages: BreakdownRow[];
    owners: BreakdownRow[];
    sources: BreakdownRow[];
    campaigns: BreakdownRow[];
  };
  monitoring: {
    bounced: number;
    failed: number;
    providerFailures: number;
    mailboxErrors: number;
    overdueTasks: number;
    quotaBlocks: number;
    providerErrorRate: number;
    providerAverageDurationMs: number;
  };
  options: {
    owners: AnalyticsOption[];
    campaigns: AnalyticsOption[];
    sectors: AnalyticsOption[];
    zones: AnalyticsOption[];
    venues: AnalyticsOption[];
    offers: AnalyticsOption[];
    sources: AnalyticsOption[];
    companySizes: AnalyticsOption[];
    companyStatuses: AnalyticsOption[];
    stages: AnalyticsOption[];
  };
}
