import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  LayoutDashboard,
  List,
  Network as NetworkIcon,
  RefreshCw,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  fetchTransactions,
  fetchRiskAnalysis,
  fetchAlerts,
  fetchGraph,
  fetchAccountRisk,
  simulateTransaction,
  setApiRole,
} from "./services/api";

import RiskChart from "./components/RiskChart";
import TransactionTable from "./components/TransactionTable";
import NetworkGraph from "./components/NetworkGraph";
import AccountRiskTable from "./components/AccountRiskTable";

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [accountRisk, setAccountRisk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [role, setRole] = useState(localStorage.getItem("muleshield_role") || "analyst");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [txs, risk, alts, graphRes, accounts] = await Promise.all([
        fetchTransactions(),
        fetchRiskAnalysis(),
        fetchAlerts(),
        fetchGraph(),
        fetchAccountRisk(),
      ]);
      setTransactions(txs);
      setRiskData(risk);
      setAlerts(alts);
      setGraphData(graphRes.graph || graphRes);
      setAccountRisk(graphRes.accountInsights || accounts);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load data");
      console.error("Error loading data:", loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setError("");
    try {
      await simulateTransaction();
      await loadData();
    } catch (simulateError) {
      setError(simulateError?.message || "Simulation failed");
      console.error("Simulation failed:", simulateError);
    } finally {
      setSimulating(false);
    }
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setApiRole(nextRole);
  };

  useEffect(() => {
    setApiRole(role);
  }, []);

  useEffect(() => {
    loadData();
  }, [role]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MuleShield AI</h1>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={role}
              onChange={(event) => handleRoleChange(event.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleSimulate}
              disabled={simulating || role === "viewer"}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${simulating ? "animate-pulse" : ""}`} />
              Simulate Transaction
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
          <TabButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} icon={<List className="w-4 h-4" />} label="Transactions" />
          <TabButton active={activeTab === "accounts"} onClick={() => setActiveTab("accounts")} icon={<Users className="w-4 h-4" />} label="Accounts" />
          <TabButton active={activeTab === "network"} onClick={() => setActiveTab("network")} icon={<NetworkIcon className="w-4 h-4" />} label="Network" />
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm border border-red-200">{error}</div>}

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Transactions" value={transactions.length} icon={<Activity className="text-blue-600" />} />
                <StatCard title="High-Risk Tx" value={riskData?.high || 0} icon={<AlertTriangle className="text-red-600" />} />
                <StatCard title="Alerts Count" value={alerts.length} icon={<ShieldAlert className="text-orange-600" />} />
                <StatCard title="High-Risk Accounts" value={accountRisk.filter((a) => a.is_high_risk).length} icon={<Users className="text-violet-600" />} />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Risk Distribution</h3>
                <RiskChart data={riskData} />
              </div>
            </motion.div>
          )}

          {activeTab === "transactions" && (
            <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
              </div>
              <TransactionTable transactions={transactions} />
            </motion.div>
          )}

          {activeTab === "accounts" && (
            <motion.div key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">Account Risk Intelligence</h3>
              </div>
              <AccountRiskTable accounts={accountRisk} />
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 h-[600px] flex flex-col">
              <NetworkGraph data={graphData} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all ${
      active ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
    }`}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h4 className="text-3xl font-bold text-slate-900">{value}</h4>
    </div>
    <div className="p-3 bg-slate-50 rounded-xl">{React.cloneElement(icon, { className: "w-6 h-6" })}</div>
  </div>
);

export default App;
