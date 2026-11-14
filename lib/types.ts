export type UseCaseId = "parking" | "laundry" | "restroom";

export type PaymentPhase =
  | "idle"
  | "creating"
  | "awaiting"
  | "success"
  | "error";

export interface UseCaseConfig {
  id: UseCaseId;
  label: string;
  serviceTitle: string;
  ticketLabel: string;
  successAction: string;
  relayLabel: string;
  accent: string;
  accentSoft: string;
  doohCampaigns: DoohCampaign[];
}

export interface DoohCampaign {
  id: string;
  brand: string;
  headline: string;
  subline: string;
  gradient: string;
  cta: string;
}

export interface CreateQrRequest {
  useCaseId: UseCaseId;
}

export interface CreateQrResponse {
  qrId: string;
  qrString: string;
  qrImage: string | null;
  amount: number;
  concept: string;
  numRef: string;
  expiration: number;
}

export interface PaymentStatusResponse {
  qrId: string;
  status: "PENDING" | "PAID" | "UNKNOWN";
  paid: boolean;
  transactionId?: string;
  amount?: number;
  datePaid?: number;
}

export interface PeyErrorBody {
  error?: {
    message?: string;
    type?: string;
    requestId?: string;
  };
}
