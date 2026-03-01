import React from 'react';
import { ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";

const TransactionTable = ({ transactions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <th className="px-6 py-4">Sender / Receiver</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Risk Score</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const riskScore = tx.riskScore ?? tx.risk_score ?? 0;
            const isHighRisk = tx.isHighRisk ?? tx.is_high_risk ?? false;
            const reasons = tx.reasons || [];
            const channel = tx.channel || "unknown";

            return (
            <tr 
              key={tx.id} 
              className={`transition-colors ${isHighRisk ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}
            >
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">{tx.sender}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <ArrowRight className="w-3 h-3" />
                    <span>{tx.receiver}</span>
                  </div>
                  <span className="text-[10px] mt-1 text-slate-500 uppercase tracking-wide">{channel}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-semibold text-slate-900">
                  ${tx.amount.toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${riskScore > 60 ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${riskScore}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{riskScore}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium self-start ${
                    isHighRisk 
                      ? "bg-red-100 text-red-700" 
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {isHighRisk ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    {isHighRisk ? "High Risk" : "Low Risk"}
                  </span>
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reasons.map((reason, idx) => (
                        <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
