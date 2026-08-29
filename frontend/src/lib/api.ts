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

export interface Campaign {
  id: string;
  campaign_type: string;
  confidence: number;
  stage: string;
  total_exposure: number;
  status: string;
  reasoning: string;
  payments: string[];
  vendors: string[];
}

export interface RelationshipEdge {
  from: string;
  to: string;
  relationship: string;
  evidence?: string | null;
}

export interface CampaignRelationships {
  campaign_id: string;
  relationships: RelationshipEdge[];
}

export interface AnomalyResult {
  anomalous: boolean;
  risk_score: number;
  signals: string[];
}

export interface HistoricalAssociation {
  campaign_id: string;
  campaign_type: string;
}

export interface CampaignAssessment {
  campaign_type: string;
  attack_stage: string;
  confidence: number;
  summary: string;
  evidence: string[];
  recommended_action: string;
}

export interface VerificationCheck {
  check: string;
  result: 'PASS' | 'FAIL';
  detail?: string;
}

export interface InvestigateResult {
  payment_id: string;
  anomaly: AnomalyResult;
  relationships: Array<{ payment_id: string; relationship: string; evidence?: string | null }>;
  historical_associations: HistoricalAssociation[];
  campaign_result: CampaignAssessment | null;
  verification?: { checks: VerificationCheck[]; verified: boolean };
  verdict: 'NORMAL' | 'INDIVIDUAL_FRAUD' | 'COORDINATED_ATTACK';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : 'http://localhost:5001/api';
const AUTH_BASE = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/auth` : 'http://localhost:5001/auth';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('rg_token');
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  return { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || (errorData as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  getMe: async (): Promise<any> => {
    const res = await fetch(`${AUTH_BASE}/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  login: async (email: string, password: string): Promise<any> => {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  register: async (email: string, password: string, full_name: string): Promise<any> => {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name })
    });
    return handleResponse(res);
  },

  verifyOtp: async (email: string, purpose: string, otp: string): Promise<any> => {
    const res = await fetch(`${AUTH_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose, otp })
    });
    return handleResponse(res);
  },

  setToken: (token: string) => {
    localStorage.setItem('rg_token', token);
  },

  clearToken: () => {
    localStorage.removeItem('rg_token');
  },

  // API
  getHealth: async (): Promise<{ status: string }> => {
    const res = await fetch(`${API_BASE}/health`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getStats: async (): Promise<Stats> => {
    const res = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE}/campaigns`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getCampaign: async (id: string): Promise<Campaign> => {
    const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getCampaignPayments: async (id: string): Promise<PaymentResult[]> => {
    const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/payments`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getCampaignRelationships: async (id: string): Promise<CampaignRelationships> => {
    const res = await fetch(`${API_BASE}/campaigns/${encodeURIComponent(id)}/relationships`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  getPayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  investigatePayment: async (id: string): Promise<InvestigateResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}/investigate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getPayments: async (): Promise<PaymentResult[]> => {
    const res = await fetch(`${API_BASE}/payments`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  screenBatch: async (): Promise<{ status: string; stats: Stats }> => {
    const res = await fetch(`${API_BASE}/screen-batch`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  approvePayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}/approve`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  rejectPayment: async (id: string): Promise<PaymentResult> => {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(id)}/reject`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  resetDemo: async (): Promise<{ status: string }> => {
    const res = await fetch(`${API_BASE}/reset-demo`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getMode: async (): Promise<{ mode: string }> => {
    const res = await fetch(`${API_BASE}/mode`, { headers: getAuthHeaders() });
    return handleResponse(res);
  },

  setMode: async (mode: string): Promise<{ mode: string }> => {
    const res = await fetch(`${API_BASE}/mode`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mode })
    });
    return handleResponse(res);
  },
};
