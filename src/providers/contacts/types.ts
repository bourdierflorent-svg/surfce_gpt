export interface ContactEmailVerificationInput {
  contactId: string;
  fullName: string;
  email: string | null;
  companyDomain: string | null;
}

export interface ContactEmailVerification {
  provider: string;
  status: "valid" | "risky" | "invalid";
  confidence: number;
  reason: string;
  externalReference: string;
  checkedAt: string;
  estimatedCost: number;
  mock: boolean;
}

export interface ContactVerificationProvider {
  readonly name: string;
  readonly estimatedCost: number;
  verifyEmail(input: ContactEmailVerificationInput): Promise<ContactEmailVerification>;
}
