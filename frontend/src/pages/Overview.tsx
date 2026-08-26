import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PaymentResult, Stats } from '../lib/api';
import { AlertTriangle } from 'lucide-react';

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await api.getStats();
    const p = await api.getPayments();
    setStats(s);
    setPayments(p);
  };

  const [error, setError] = useState<string | null>(null);

  const handleScreenBatch = async () => {
    if (processing) return;
    setProcessing(true);
    setError(null);
    try {
      await api.screenBatch();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Batch request failed.');
    } finally {
      setProcessing(false);
    }
  };

  const attentionNeeded = payments.filter(p => ['HELD', 'UNPROCESSABLE'].includes(p.status));
  const recent = payments.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-primaryText">Overview</h1>
          <p className="text-secondaryText mt-1">AI screening for suspicious vendor payments before money moves.</p>
        </div>
        <button 
          onClick={handleScreenBatch}
          disabled={processing || stats?.screened === 20}
          className="bg-primaryAccent hover:bg-opacity-90 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {processing ? 'SCREENING...' : 'SCREEN BATCH'}
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-3xl font-semibold">{stats?.screened || 0}</div>
          <div className="text-sm text-secondaryText mt-1 font-medium tracking-wide uppercase">Screened</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-3xl font-semibold text-safe">{stats?.clear || 0}</div>
          <div className="text-sm text-secondaryText mt-1 font-medium tracking-wide uppercase">Clear</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-3xl font-semibold text-danger">{stats?.held || 0}</div>
          <div className="text-sm text-secondaryText mt-1 font-medium tracking-wide uppercase">Held</div>
        </div>
        <div className="bg-surface border border-border p-5 rounded-xl">
          <div className="text-3xl font-semibold text-warning">{attentionNeeded.length}</div>
          <div className="text-sm text-secondaryText mt-1 font-medium tracking-wide uppercase">Needs Attention</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-secondaryText">Recent Payments</h2>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-elevated border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondaryText">Invoice</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Vendor</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Amount</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map(p => (
                  <tr key={p.payment.invoice_id} className="hover:bg-elevated transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono">{p.payment.invoice_id}</td>
                    <td className="px-4 py-3">{p.payment.vendor_name}</td>
                    <td className="px-4 py-3">${p.payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'CLEAR' ? 'bg-safe/10 text-safe' :
                        p.status === 'HELD' ? 'bg-danger/10 text-danger' :
                        p.status === 'APPROVED' ? 'bg-safe/20 text-safe' :
                        'bg-muted/10 text-secondaryText'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-secondaryText">No payments processed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-secondaryText">Attention Required</h2>
          <div className="space-y-3">
            {attentionNeeded.map(p => (
              <div key={p.payment.invoice_id} className="bg-surface border border-danger/20 p-4 rounded-xl hover:border-danger/40 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{p.payment.vendor_name}</div>
                  <div className="font-mono text-sm">${p.payment.amount.toLocaleString()}</div>
                </div>
                <div className="text-sm text-secondaryText mb-3">Risk Score: <span className="text-danger font-semibold">{p.risk_score}</span></div>
                <button 
                  onClick={() => window.location.href = `/payments?id=${p.payment.invoice_id}`}
                  className="w-full py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-elevated transition-colors"
                >
                  REVIEW
                </button>
              </div>
            ))}
            {attentionNeeded.length === 0 && stats?.screened !== 0 && (
              <div className="p-8 text-center text-secondaryText bg-surface border border-border rounded-xl">
                All clear. No payments need attention.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
