import React from "react";
import { Users, Network as NetworkIcon } from "lucide-react";
import { motion } from "motion/react";

const NetworkGraph = ({ data }) => {
  if (!data) {
    return <div className="h-full flex items-center justify-center text-slate-400">Loading graph...</div>;
  }

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const highRiskEdges = edges.filter((edge) => edge.isHighRisk);

  return (
    <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 relative overflow-hidden grid place-items-center">
      <div className="absolute inset-0 p-12 grid grid-cols-4 gap-8">
        {nodes.map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <div
              className={`w-12 h-12 rounded-full bg-white shadow-md border flex items-center justify-center ${
                node.isHighRisk ? "border-red-300 text-red-600" : "border-slate-200 text-indigo-600"
              }`}
            >
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600 text-center">{node.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="z-10 bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-slate-200 shadow-xl max-w-md text-center">
        <NetworkIcon className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h4 className="text-lg font-bold text-slate-900 mb-2">Network Topology</h4>
        <p className="text-slate-600 text-sm mb-6">
          Visualizing {nodes.length} entities and {edges.length} connections.
          High-risk paths are monitored for potential money laundering activity.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {highRiskEdges.slice(0, 6).map((edge, i) => (
            <div
              key={`${edge.from}-${edge.to}-${i}`}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                edge.amount > 50000 ? "bg-red-600 text-white border-red-700 animate-pulse" : "bg-red-50 text-red-700 border-red-100"
              }`}
            >
              ALERT: {edge.from} -&gt; {edge.to}
            </div>
          ))}
          {highRiskEdges.length === 0 && <div className="text-xs text-slate-500">No active high-risk network paths.</div>}
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
