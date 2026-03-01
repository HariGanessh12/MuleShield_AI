import express from "express";
import { createServer as createViteServer } from "vite";
import { calculateRisk, Transaction } from "./src/fraud_logic.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const MAX_PORT_ATTEMPTS = 20;

app.use(express.json());

// Mock Transaction Data
const initialTransactions: Transaction[] = [
  { id: "TX1001", sender: "Alice Johnson", receiver: "Bob Smith", amount: 1200, timestamp: "2026-03-01T10:00:00Z" },
  { id: "TX1002", sender: "Charlie Brown", receiver: "David Miller", amount: 55000, timestamp: "2026-03-01T10:05:00Z" },
  { id: "TX1003", sender: "Alice Johnson", receiver: "Eve Davis", amount: 800, timestamp: "2026-03-01T10:10:00Z" },
  { id: "TX1004", sender: "Alice Johnson", receiver: "Frank Wilson", amount: 1500, timestamp: "2026-03-01T10:15:00Z" },
  { id: "TX1005", sender: "Alice Johnson", receiver: "Grace Lee", amount: 2000, timestamp: "2026-03-01T10:20:00Z" },
  { id: "TX1006", sender: "Henry Ford", receiver: "Ivy Chen", amount: 62000, timestamp: "2026-03-01T10:25:00Z" },
  { id: "TX1007", sender: "Jack Sparrow", receiver: "Kelly Clarkson", amount: 4500, timestamp: "2026-03-01T10:30:00Z" },
  { id: "TX1008", sender: "Liam Neeson", receiver: "Mona Lisa", amount: 12000, timestamp: "2026-03-01T10:35:00Z" },
  { id: "TX1009", sender: "Liam Neeson", receiver: "Noah Ark", amount: 15000, timestamp: "2026-03-01T10:40:00Z" },
  { id: "TX1010", sender: "Liam Neeson", receiver: "Olivia Pope", amount: 18000, timestamp: "2026-03-01T10:45:00Z" },
  { id: "TX1011", sender: "Bob Smith", receiver: "Alice Johnson", amount: 500, timestamp: "2026-03-01T10:50:00Z" }, // Circular
];

// Enrich transactions with risk scores
let enrichedTransactions = initialTransactions.map((t, index) => {
  const history = initialTransactions.slice(0, index);
  const risk = calculateRisk(t, history);
  return { ...t, ...risk };
});

// API Routes
app.get("/api/transactions", (req, res) => {
  res.json(enrichedTransactions);
});

app.post("/api/simulate", (req, res) => {
  const senders = ["Alice Johnson", "Bob Smith", "Charlie Brown", "David Miller", "Eve Davis", "Henry Ford"];
  const receivers = ["Alice Johnson", "Bob Smith", "Charlie Brown", "David Miller", "Eve Davis", "Henry Ford"];
  
  const sender = senders[Math.floor(Math.random() * senders.length)];
  let receiver = receivers[Math.floor(Math.random() * receivers.length)];
  while (receiver === sender) {
    receiver = receivers[Math.floor(Math.random() * receivers.length)];
  }

  const newTx: Transaction = {
    id: `TX${1012 + enrichedTransactions.length}`,
    sender,
    receiver,
    amount: Math.floor(Math.random() * 70000) + 100,
    timestamp: new Date().toISOString()
  };

  const risk = calculateRisk(newTx, enrichedTransactions);
  const enriched = { ...newTx, ...risk };
  
  enrichedTransactions = [enriched, ...enrichedTransactions];
  res.json(enriched);
});

app.get("/api/risk-analysis", (req, res) => {
  const distribution = {
    low: enrichedTransactions.filter(t => !t.isHighRisk).length,
    high: enrichedTransactions.filter(t => t.isHighRisk).length,
  };
  res.json(distribution);
});

app.get("/api/alerts", (req, res) => {
  const alerts = enrichedTransactions.filter(t => t.isHighRisk);
  res.json(alerts);
});

app.get("/api/graph", (req, res) => {
  // Simulated graph data (nodes and edges)
  const nodes = Array.from(new Set([
    ...enrichedTransactions.map(t => t.sender),
    ...enrichedTransactions.map(t => t.receiver)
  ])).map(name => ({ id: name, label: name }));

  const edges = enrichedTransactions.map(t => ({
    from: t.sender,
    to: t.receiver,
    amount: t.amount,
    isHighRisk: t.isHighRisk,
    isCircular: t.reasons?.includes("Circular transaction detected")
  }));

  res.json({ nodes, edges });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
}

function startServer(port: number, attempts = 0) {
  const server = app.listen(port, HOST, () => {
    const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
    console.log(`Server running on http://${displayHost}:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    const recoverable = error.code === "EACCES" || error.code === "EADDRINUSE";
    if (!recoverable || attempts >= MAX_PORT_ATTEMPTS) {
      throw error;
    }

    const nextPort = port + 1;
    console.warn(
      `Port ${port} unavailable (${error.code}). Retrying on port ${nextPort}...`
    );
    startServer(nextPort, attempts + 1);
  });
}

startServer(PORT);
