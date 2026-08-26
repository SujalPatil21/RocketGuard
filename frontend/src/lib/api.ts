// RocketGuard API Layer
// Maps to actual backend endpoints — no mocks, no fakes.

export interface Payment {
  invoice_id: string;
  vendor_id: string;
  vendor_name: string;
  amount: number;
  currency: string;
  due_date: string;
  bank_account: string;
  ifsc: string;
  requested_by: string;
  request_message: string;
  submitted_at: string;
  request_type: string;
}

export interface PaymentResult {
  payment: Payment;
  status: 'PENDING' | 'SCREENING' | 'CLEAR' | 'HELD' | 'APPROVED' | 'REJECTED' | 'UNPROCESSABLE';
  risk_score: number;
  signals: string[];
  requires_human_review: boolean;
  history_checker_result?: {
    agent?: string;
    status?: string;
    riskScore?: number;
    signals?: string[];
    summary?: string;
    reasoning?: string;
    agreesWithHistoryChecker?: boolean;
    disagreementReason?: string;
  } | null;
  pattern_matcher_result?: {
    agent?: string;
    status?: string;
    riskScore?: number;
    signals?: string[];
    summary?: string;
    reasoning?: string;
    agreesWithHistoryChecker?: boolean;
    disagreementReason?: string;
  } | null;
  verifier_result?: {
    agent?: string;
    verificationRequired?: boolean;
    method?: string;
    trustedSource?: string;
    instruction?: string;
    warning?: string;
  } | null;
  audit_events: Array<{
    timestamp: string;
    type: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface Stats {
  screened: number;
  clear: number;
  held: number;
  approved: number;
  rejected: number;
  unprocessable: number;
  runtime_ms: number;
  tokens: number;
}

const API_BASE = 'http://localhost:8000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error((errorData as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: async (): Promise<{ status: string }> => {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  getStats: async (): Promise<Stats> => {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse(res);
  },

  getPayments: async (): Promise<PaymentResult[]> => {
    const res = await fetch(`${API_BASE}/payments`);
    return handleResponse(res);
  },

  screenBatch: async (): Promise<{ status: string; stats: Stats }> => {
    const res = await fetch(`${API_BASE}/screen-batch`, { method: 'POST' });
    return handleResponse(res);
  },

  approvePayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}/approve`, { method: 'POST' });
    return handleResponse(res);
  },

  rejectPayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}/reject`, { method: 'POST' });
    return handleResponse(res);
  },

  resetDemo: async (): Promise<{ status: string }> => {
    const res = await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
    return handleResponse(res);
  },
};
