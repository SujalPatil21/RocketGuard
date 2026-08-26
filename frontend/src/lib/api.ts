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
  history_checker_result?: any;
  pattern_matcher_result?: any;
  verifier_result?: any;
  audit_events: any[];
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

export const api = {
  getStats: async (): Promise<Stats> => {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  },
  getPayments: async (): Promise<PaymentResult[]> => {
    const res = await fetch(`${API_BASE}/payments`);
    return res.json();
  },
  screenBatch: async (): Promise<{status: string, stats: Stats}> => {
    const res = await fetch(`${API_BASE}/screen-batch`, { method: 'POST' });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${res.status}`);
    }
    return res.json();
  },
  approvePayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${id}/approve`, { method: 'POST' });
    return res.json();
  },
  rejectPayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${id}/reject`, { method: 'POST' });
    return res.json();
  },
  resetDemo: async () => {
    await fetch(`${API_BASE}/reset-demo`, { method: 'POST' });
  }
};
