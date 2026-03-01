import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

const AccountRiskTable = ({ accounts }) => {
  if (!accounts?.length) {
    return <div className="p-6 text-sm text-slate-500">No account intelligence available.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <th className="px-6 py-4">Account</th>
            <th className="px-6 py-4">Network Risk</th>
            <th className="px-6 py-4">Volume</th>
            <th className="px-6 py-4">Channels</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <tr key={account.account} className={account.is_high_risk ? "bg-red-50/40" : ""}>
              <td className="px-6 py-4">
                <div className="text-sm font-semibold text-slate-900">{account.account}</div>
                <div className="text-xs text-slate-500 mt-1">{account.reasons?.join(", ") || "No triggers"}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={account.network_risk_score >= 60 ? "h-full bg-red-500" : "h-full bg-emerald-500"}
                      style={{ width: `${account.network_risk_score}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-600 font-semibold">{account.network_risk_score}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-700">
                <div>{account.tx_count} tx</div>
                <div className="text-xs text-slate-500">
                  ${Number(account.total_sent || 0).toLocaleString()} sent
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {account.channels?.map((channel) => (
                    <span key={channel} className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {channel}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                    account.is_high_risk ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {account.is_high_risk ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  {account.is_high_risk ? "High Risk" : "Low Risk"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountRiskTable;
