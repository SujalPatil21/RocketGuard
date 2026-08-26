import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Stats, PaymentResult } from '../lib/api';
import { Cpu, Workflow, Activity as ActivityIcon } from 'lucide-react';

export default function Activity() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payments, setPayments] = useState<PaymentResult[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setStats(await api.getStats());
    setPayments(await api.getPayments());
  };

  const handleReset = async () => {
    await api.resetDemo();
    await load();
  };

  const recentEvents = payments.flatMap(p => 
    p.audit_events.map(e => ({ ...e, invoice_id: p.payment.invoice_id }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-primaryText">Activity</h1>
          <p className="text-secondaryText mt-1">Pipeline execution and audit activity.</p>
        </div>
        <button 
          onClick={handleReset}
          className="bg-surface border border-border hover:bg-elevated text-secondaryText px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          RESET DEMO
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-secondaryText mb-6 flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              RocketRide Pipeline
            </h2>
            
            <div className="flex justify-between items-center px-4 relative">
              <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-border -z-10"></div>
              
              {['INPUT', 'HISTORY', 'PATTERN', 'DECISION', 'VERIFIER'].map((node, i) => (
                <div key={node} className="flex flex-col items-center space-y-2 bg-surface px-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${stats?.screened ? 'border-primaryAccent bg-primaryAccent/10 text-primaryAccent' : 'border-border bg-elevated text-secondaryText'}`}>
                    {i + 1}
                  </div>
                  <div className="text-xs font-medium text-secondaryText">{node}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-elevated">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-secondaryText flex items-center gap-2">
                <ActivityIcon className="w-4 h-4" />
                Recent System Activity
              </h2>
            </div>
            <div className="p-4 overflow-auto max-h-[400px]">
              <div className="space-y-4">
                {recentEvents.map((evt, i) => (
                  <div key={i} className="flex space-x-4 text-sm">
                    <div className="text-xs text-secondaryText w-16 pt-0.5 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                    </div>
                    <div>
                      <span className="text-primaryAccent font-mono mr-2">{evt.invoice_id}</span>
                      <span className="font-medium text-primaryText">{evt.type.replace(/_/g, ' ')}</span>
                      <div className="text-secondaryText text-xs mt-0.5">{evt.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-secondaryText mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Compute Resources
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-border pb-2">
                <div className="text-sm text-secondaryText">Runtime</div>
                <div className="font-mono text-lg">{stats?.runtime_ms || 0}ms</div>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-2">
                <div className="text-sm text-secondaryText">Tokens</div>
                <div className="font-mono text-lg">{stats?.tokens || 0}</div>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-2">
                <div className="text-sm text-secondaryText">Estimated Cost</div>
                <div className="font-mono text-lg text-primaryAccent">${((stats?.tokens || 0) * 0.00001).toFixed(4)}</div>
              </div>
              <div className="flex justify-between items-end pb-2">
                <div className="text-sm text-secondaryText">Model</div>
                <div className="font-mono text-sm">llama3.2 (Local)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
