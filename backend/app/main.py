from __future__ import annotations

import os
import random
from datetime import datetime, timedelta, timezone
from typing import Literal

import networkx as nx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from sklearn.ensemble import IsolationForest


class Transaction(BaseModel):
    id: str
    sender: str
    receiver: str
    amount: float
    timestamp: datetime
    channel: Literal["bank_transfer", "upi", "wallet", "card", "cash_in", "crypto"]
    risk_score: int = 0
    is_high_risk: bool = False
    reasons: list[str] = Field(default_factory=list)
    anomaly_score: float = 0.0


class AccountInsight(BaseModel):
    account: str
    tx_count: int
    total_sent: float
    total_received: float
    distinct_receivers: int
    distinct_senders: int
    high_risk_tx_count: int
    channels: list[str]
    centrality: float
    cycle_participation: bool
    network_risk_score: int
    is_high_risk: bool
    reasons: list[str]


class AppState:
    def __init__(self) -> None:
        self.transactions: list[Transaction] = []
        self.mongo_enabled = False
        self.collection = None
        mongo_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("MONGODB_DB", "muleshield")
        collection_name = os.getenv("MONGODB_COLLECTION", "transactions")

        if mongo_uri:
            try:
                client = MongoClient(mongo_uri, serverSelectionTimeoutMS=1500)
                client.admin.command("ping")
                self.collection = client[db_name][collection_name]
                self.mongo_enabled = True
            except PyMongoError:
                self.mongo_enabled = False

    def load(self) -> list[Transaction]:
        if not self.mongo_enabled or self.collection is None:
            return self.transactions
        try:
            docs = list(self.collection.find({}, {"_id": 0}))
            self.transactions = [Transaction(**doc) for doc in docs]
        except PyMongoError:
            pass
        return self.transactions

    def save_all(self) -> None:
        if not self.mongo_enabled or self.collection is None:
            return
        try:
            self.collection.delete_many({})
            if self.transactions:
                self.collection.insert_many([t.model_dump(mode="json") for t in self.transactions])
        except PyMongoError:
            pass

    def append(self, tx: Transaction) -> None:
        self.transactions.insert(0, tx)
        if not self.mongo_enabled or self.collection is None:
            return
        try:
            self.collection.insert_one(tx.model_dump(mode="json"))
        except PyMongoError:
            pass


def compute_rule_risk(tx: Transaction, history: list[Transaction]) -> tuple[int, list[str]]:
    risk = 0
    reasons: list[str] = []

    if tx.amount > 50000:
        risk += 60
        reasons.append("High transaction amount")

    sender_history = [t for t in history if t.sender == tx.sender]
    if len(sender_history) >= 3:
        risk += 40
        reasons.append("High frequency transactions")

    receiver_count = len(set(t.receiver for t in sender_history))
    if receiver_count >= 3:
        risk += 20
        reasons.append("Multiple receiver pattern")

    is_circular = any(t.sender == tx.receiver and t.receiver == tx.sender for t in history)
    if is_circular:
        risk += 30
        reasons.append("Circular transaction detected")

    channel_span = len(set(t.channel for t in sender_history + [tx]))
    if channel_span >= 3:
        risk += 15
        reasons.append("Cross-channel burst")

    return min(risk, 100), reasons


def apply_ml_scores(transactions: list[Transaction]) -> None:
    if len(transactions) < 8:
        for tx in transactions:
            tx.anomaly_score = 0.0
        return

    features = []
    for tx in transactions:
        hour = tx.timestamp.hour
        features.append([tx.amount, hour])

    model = IsolationForest(contamination=0.2, random_state=42)
    model.fit(features)
    scores = model.decision_function(features)

    for i, tx in enumerate(transactions):
        # Lower decision score means more anomalous. Convert to 0..100 risk-like score.
        anomaly_risk = max(0.0, min(100.0, (0.2 - scores[i]) * 250))
        tx.anomaly_score = round(anomaly_risk, 2)


def enrich_transactions(transactions: list[Transaction]) -> list[Transaction]:
    ordered = sorted(transactions, key=lambda t: t.timestamp)
    history: list[Transaction] = []
    for tx in ordered:
        score, reasons = compute_rule_risk(tx, history)
        tx.risk_score = score
        tx.is_high_risk = score >= 60
        tx.reasons = reasons
        history.append(tx)

    apply_ml_scores(ordered)
    for tx in ordered:
        if tx.anomaly_score >= 65:
            tx.risk_score = min(100, tx.risk_score + 20)
            tx.is_high_risk = tx.risk_score >= 60
            if "ML anomaly pattern" not in tx.reasons:
                tx.reasons.append("ML anomaly pattern")

    return sorted(ordered, key=lambda t: t.timestamp, reverse=True)


def build_graph(transactions: list[Transaction]) -> tuple[dict, list[AccountInsight]]:
    graph = nx.DiGraph()
    for tx in transactions:
        if graph.has_edge(tx.sender, tx.receiver):
            graph[tx.sender][tx.receiver]["count"] += 1
            graph[tx.sender][tx.receiver]["amount"] += tx.amount
            graph[tx.sender][tx.receiver]["high_risk"] = graph[tx.sender][tx.receiver]["high_risk"] or tx.is_high_risk
        else:
            graph.add_edge(
                tx.sender,
                tx.receiver,
                count=1,
                amount=tx.amount,
                high_risk=tx.is_high_risk,
                channels={tx.channel},
            )
        graph[tx.sender][tx.receiver].setdefault("channels", set()).add(tx.channel)

    centrality = nx.degree_centrality(graph) if graph.number_of_nodes() > 0 else {}
    cycle_nodes = set()
    for cycle in nx.simple_cycles(graph):
        cycle_nodes.update(cycle)

    insights: list[AccountInsight] = []
    for account in graph.nodes:
        involved = [t for t in transactions if t.sender == account or t.receiver == account]
        outgoing = [t for t in involved if t.sender == account]
        incoming = [t for t in involved if t.receiver == account]
        channels = sorted(set(t.channel for t in involved))
        reasons: list[str] = []
        score = 0

        high_risk_count = len([t for t in involved if t.is_high_risk])
        if high_risk_count > 0:
            score += min(45, high_risk_count * 15)
            reasons.append("Linked to high-risk transactions")

        distinct_receivers = len(set(t.receiver for t in outgoing))
        if distinct_receivers >= 3:
            score += 20
            reasons.append("Fan-out receiver pattern")

        distinct_senders = len(set(t.sender for t in incoming))
        if distinct_senders >= 3:
            score += 10
            reasons.append("Fan-in sender pattern")

        if len(channels) >= 3:
            score += 20
            reasons.append("Cross-channel activity spike")

        if account in cycle_nodes:
            score += 20
            reasons.append("Circular network behavior")

        if centrality.get(account, 0) >= 0.4:
            score += 15
            reasons.append("High graph centrality")

        final_score = min(100, score)
        insights.append(
            AccountInsight(
                account=account,
                tx_count=len(involved),
                total_sent=round(sum(t.amount for t in outgoing), 2),
                total_received=round(sum(t.amount for t in incoming), 2),
                distinct_receivers=distinct_receivers,
                distinct_senders=distinct_senders,
                high_risk_tx_count=high_risk_count,
                channels=channels,
                centrality=round(centrality.get(account, 0), 4),
                cycle_participation=account in cycle_nodes,
                network_risk_score=final_score,
                is_high_risk=final_score >= 60,
                reasons=reasons,
            )
        )

    nodes = [
        {
            "id": node,
            "label": node,
            "networkRiskScore": next((a.network_risk_score for a in insights if a.account == node), 0),
            "isHighRisk": next((a.is_high_risk for a in insights if a.account == node), False),
        }
        for node in graph.nodes
    ]
    edges = [
        {
            "from": source,
            "to": target,
            "count": attrs["count"],
            "amount": round(attrs["amount"], 2),
            "isHighRisk": attrs["high_risk"],
            "channels": sorted(list(attrs["channels"])),
        }
        for source, target, attrs in graph.edges(data=True)
    ]

    insights.sort(key=lambda a: a.network_risk_score, reverse=True)
    return {"nodes": nodes, "edges": edges}, insights


def require_role(allowed: set[str]):
    async def dependency(x_role: str | None = Header(default=None, alias="X-Role")) -> str:
        role = (x_role or "viewer").lower()
        if role not in {"viewer", "analyst", "admin"}:
            raise HTTPException(status_code=403, detail="Invalid role")
        if role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return role

    return dependency


def seed_transactions() -> list[Transaction]:
    base_time = datetime.now(timezone.utc) - timedelta(hours=2)
    rows = [
        ("TX1001", "Alice Johnson", "Bob Smith", 1200, "bank_transfer"),
        ("TX1002", "Charlie Brown", "David Miller", 55000, "wallet"),
        ("TX1003", "Alice Johnson", "Eve Davis", 800, "upi"),
        ("TX1004", "Alice Johnson", "Frank Wilson", 1500, "bank_transfer"),
        ("TX1005", "Alice Johnson", "Grace Lee", 2000, "wallet"),
        ("TX1006", "Henry Ford", "Ivy Chen", 62000, "crypto"),
        ("TX1007", "Jack Sparrow", "Kelly Clarkson", 4500, "card"),
        ("TX1008", "Liam Neeson", "Mona Lisa", 12000, "bank_transfer"),
        ("TX1009", "Liam Neeson", "Noah Ark", 15000, "cash_in"),
        ("TX1010", "Liam Neeson", "Olivia Pope", 18000, "wallet"),
        ("TX1011", "Bob Smith", "Alice Johnson", 500, "upi"),
    ]
    seeded = []
    for idx, row in enumerate(rows):
        tx_id, sender, receiver, amount, channel = row
        seeded.append(
            Transaction(
                id=tx_id,
                sender=sender,
                receiver=receiver,
                amount=float(amount),
                timestamp=base_time + timedelta(minutes=idx * 5),
                channel=channel,  # type: ignore[arg-type]
            )
        )
    return enrich_transactions(seeded)


STATE = AppState()
if not STATE.load():
    STATE.transactions = seed_transactions()
    STATE.save_all()
else:
    STATE.transactions = enrich_transactions(STATE.transactions)

app = FastAPI(title="MuleShield AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "mongo": STATE.mongo_enabled}


@app.get("/api/transactions", dependencies=[Depends(require_role({"viewer", "analyst", "admin"}))])
async def transactions():
    return [t.model_dump(mode="json") for t in STATE.transactions]


@app.get("/api/risk-analysis", dependencies=[Depends(require_role({"viewer", "analyst", "admin"}))])
async def risk_analysis():
    high = len([t for t in STATE.transactions if t.is_high_risk])
    low = len(STATE.transactions) - high
    avg_score = round(sum(t.risk_score for t in STATE.transactions) / max(len(STATE.transactions), 1), 2)
    return {"low": low, "high": high, "averageRiskScore": avg_score}


@app.get("/api/alerts", dependencies=[Depends(require_role({"viewer", "analyst", "admin"}))])
async def alerts():
    rows = [t.model_dump(mode="json") for t in STATE.transactions if t.is_high_risk]
    return rows[:25]


@app.get("/api/graph", dependencies=[Depends(require_role({"viewer", "analyst", "admin"}))])
async def graph():
    graph_data, insights = build_graph(STATE.transactions)
    return {"graph": graph_data, "accountInsights": [a.model_dump(mode="json") for a in insights]}


@app.get("/api/accounts/risk", dependencies=[Depends(require_role({"viewer", "analyst", "admin"}))])
async def account_risk():
    _, insights = build_graph(STATE.transactions)
    return [a.model_dump(mode="json") for a in insights]


@app.post("/api/simulate", dependencies=[Depends(require_role({"analyst", "admin"}))])
async def simulate():
    senders = ["Alice Johnson", "Bob Smith", "Charlie Brown", "David Miller", "Eve Davis", "Henry Ford", "Liam Neeson"]
    receivers = ["Alice Johnson", "Bob Smith", "Charlie Brown", "David Miller", "Eve Davis", "Henry Ford", "Ivy Chen", "Noah Ark"]
    channels = ["bank_transfer", "upi", "wallet", "card", "cash_in", "crypto"]

    sender = random.choice(senders)
    receiver = random.choice(receivers)
    while receiver == sender:
        receiver = random.choice(receivers)

    new_tx = Transaction(
        id=f"TX{1000 + len(STATE.transactions) + 1}",
        sender=sender,
        receiver=receiver,
        amount=float(random.randint(100, 70000)),
        timestamp=datetime.now(timezone.utc),
        channel=random.choice(channels),  # type: ignore[arg-type]
    )

    updated = enrich_transactions([new_tx] + STATE.transactions)
    STATE.transactions = updated
    STATE.save_all()
    return new_tx.model_dump(mode="json")
