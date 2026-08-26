import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { PaymentResult } from '../lib/api';
import { X, CheckCircle2 } from 'lucide-react';

export default function Payments() {
  const [payments, setPayments] = useState<PaymentResult[]>([]);
  const [selected, setSelected] = useState<PaymentResult | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await api.getPayments();
    setPayments(data);
    
    // Check URL for specific payment to review
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      const p = data.find(p => p.payment.invoice_id === id);
      if (p) {
        setSelected(p);
      }
      // Clean up URL without reload
      window.history.replaceState({}, '', '/payments');
    }
  };

  const handleApprove = async () => {
    if (selected) {
      const updated = await api.approvePayment(selected.payment.invoice_id);
      setSelected(updated);
      await load();
    }
  };

  const handleReject = async () => {
    if (selected) {
      const updated = await api.rejectPayment(selected.payment.invoice_id);
      setSelected(updated);
      await load();
    }
  };

  return (
    <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)]">
      <div className={`flex-1 flex flex-col space-y-4 ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-primaryText">Payments</h1>
          <p className="text-secondaryText mt-1">Review screened vendor payment requests.</p>
        </div>
        
        <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <input 
              type="text" 
              placeholder="Search invoice or vendor..." 
              className="bg-elevated border border-border rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-primaryAccent"
            />
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-elevated border-b border-border sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondaryText">Invoice</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Vendor</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Amount</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Risk</th>
                  <th className="px-4 py-3 font-medium text-secondaryText">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr 
                    key={p.payment.invoice_id} 
                    onClick={() => setSelected(p)}
                    className={`transition-colors cursor-pointer ${selected?.payment.invoice_id === p.payment.invoice_id ? 'bg-elevated' : 'hover:bg-elevated/50'}`}
                  >
                    <td className="px-4 py-3 font-mono">{p.payment.invoice_id}</td>
                    <td className="px-4 py-3">{p.payment.vendor_name}</td>
                    <td className="px-4 py-3">${p.payment.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={p.risk_score > 50 ? 'text-danger font-medium' : 'text-secondaryText'}>{p.risk_score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'CLEAR' ? 'bg-safe/10 text-safe' :
                        p.status === 'HELD' ? 'bg-danger/10 text-danger' :
                        p.status === 'APPROVED' ? 'bg-safe/20 text-safe' :
                        p.status === 'REJECTED' ? 'bg-danger/20 text-danger' :
                        'bg-muted/10 text-secondaryText'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="w-full lg:w-[480px] bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-8 duration-300">
          <div className="p-4 border-b border-border flex items-center justify-between bg-elevated">
            <div>
              <div className="font-mono text-sm text-secondaryText">{selected.payment.invoice_id}</div>
              <div className="font-medium text-lg">{selected.payment.vendor_name}</div>
            </div>
            <button onClick={() => setSelected(null)} className="p-2 hover:bg-surface rounded-lg transition-colors">
              <X className="w-5 h-5 text-secondaryText" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <div className="flex items-center bg-primaryAccent/10 border border-primaryAccent/20 text-primaryAccent px-3 py-1.5 rounded-lg text-xs font-medium w-fit mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Simulated Demo Payment
            </div>
            <div className="flex items-center justify-between pb-6 border-b border-border">
              <div>
                <div className="text-3xl font-semibold tracking-tight">${selected.payment.amount.toLocaleString()}</div>
                <div className={`text-sm font-medium mt-1 ${selected.status === 'HELD' || selected.status === 'REJECTED' ? 'text-danger' : selected.status === 'UNPROCESSABLE' ? 'text-warning' : 'text-safe'}`}>{selected.status}</div>
              </div>
              <div className="text-right text-sm space-y-1 text-secondaryText">
                <div>Bank: <span className="font-mono text-primaryText">••••{selected.payment.bank_account.slice(-4)}</span></div>
                <div>Due: <span className="text-primaryText">{selected.payment.due_date}</span></div>
              </div>
            </div>

            <div className="space-y-3 pb-6 border-b border-border text-sm">
              <div className="flex"><span className="text-secondaryText w-24">Requester:</span> <span className="font-medium text-primaryText">{selected.payment.requested_by}</span></div>
              <div className="flex"><span className="text-secondaryText w-24">Message:</span> <span className="text-primaryText">{selected.payment.request_message}</span></div>
            </div>

            {selected.history_checker_result && (
              <div className="space-y-4">
                <div className="bg-elevated rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold tracking-wide uppercase text-secondaryText">AI Screening Result</div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${selected.history_checker_result.status === 'FLAG' ? 'bg-danger/10 text-danger' : 'bg-safe/10 text-safe'}`}>
                      {selected.history_checker_result.status}
                    </span>
                  </div>
                  <p className="text-sm">{selected.history_checker_result.summary}</p>
                </div>
                
                {selected.signals && selected.signals.length > 0 && (
                  <div className="bg-elevated rounded-xl p-4 border border-border">
                    <div className="text-sm font-semibold tracking-wide uppercase text-secondaryText mb-2">Signals</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {selected.signals.map((sig, i) => (
                        <li key={i}>{sig}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selected.verifier_result && (
              <div className="bg-elevated rounded-xl p-4 border border-border">
                <div className="text-sm font-semibold tracking-wide uppercase text-secondaryText mb-2">Verification Instruction</div>
                <p className="text-sm">{selected.verifier_result.instruction}</p>
                {selected.verifier_result.trusted_source && (
                  <p className="text-sm text-secondaryText mt-2">Source: <span className="font-medium text-primaryText">{selected.verifier_result.trusted_source}</span></p>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-border">
              <div className="text-sm font-semibold tracking-wide uppercase text-secondaryText mb-4">Audit Trail</div>
              <div className="space-y-4">
                {selected.audit_events.map((evt, i) => (
                  <div key={i} className="flex space-x-3 text-sm">
                    <div className="text-xs text-secondaryText w-16 pt-0.5 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{evt.type.replace(/_/g, ' ')}</div>
                      <div className="text-secondaryText text-xs mt-0.5">{evt.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-elevated flex gap-3">
            {(selected.status === 'HELD' || selected.status === 'UNPROCESSABLE') && (
              <>
                <button onClick={handleReject} className="flex-1 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 hover:text-danger px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                  REJECT PAYMENT
                </button>
                <button onClick={handleApprove} className="flex-1 bg-primaryAccent hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                  APPROVE PAYMENT
                </button>
              </>
            )}
            {selected.status === 'CLEAR' && (
              <div className="flex-1 text-center py-2 text-safe font-medium text-sm border border-safe/20 bg-safe/10 rounded-lg">
                PAYMENT CLEARED
              </div>
            )}
            {selected.status === 'APPROVED' && (
              <div className="flex-1 text-center py-2 text-safe font-medium text-sm border border-safe/20 bg-safe/10 rounded-lg">
                APPROVED
              </div>
            )}
            {selected.status === 'REJECTED' && (
              <div className="flex-1 text-center py-2 text-danger font-medium text-sm border border-danger/20 bg-danger/10 rounded-lg">
                REJECTED
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
