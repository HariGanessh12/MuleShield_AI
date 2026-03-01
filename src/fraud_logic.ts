/**
 * MuleShield AI - Fraud Detection Logic
 */

export interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: string;
  riskScore?: number;
  isHighRisk?: boolean;
  reasons?: string[];
}

/**
 * Calculates the risk score for a transaction based on history.
 * Rules:
 * - Amount > 50,000 -> +60 risk ("High transaction amount")
 * - More than 3 transactions by same sender -> +40 risk ("High frequency transactions")
 * - Same sender to 3+ different receivers -> +20 risk ("Multiple receiver pattern")
 * - Circular transaction (A -> B and B -> A) -> +30 risk ("Circular transaction detected")
 * - Cap risk at 100
 * - Mark transaction as isHighRisk if risk >= 60
 */
export function calculateRisk(transaction: Transaction, history: Transaction[]): { riskScore: number; isHighRisk: boolean; reasons: string[] } {
  let risk = 0;
  const reasons: string[] = [];

  // Rule 1: High amount
  if (transaction.amount > 50000) {
    risk += 60;
    reasons.push("High transaction amount");
  }

  // Rule 2: Frequency check
  const senderTransactions = history.filter(t => t.sender === transaction.sender);
  if (senderTransactions.length >= 3) {
    risk += 40;
    reasons.push("High frequency transactions");
  }

  // Rule 3: Multiple receiver pattern
  const uniqueReceivers = new Set(senderTransactions.map(t => t.receiver));
  if (uniqueReceivers.size >= 3) {
    risk += 20;
    reasons.push("Multiple receiver pattern");
  }

  // Rule 4: Circular transaction detected
  const isCircular = history.some(t => t.sender === transaction.receiver && t.receiver === transaction.sender);
  if (isCircular) {
    risk += 30;
    reasons.push("Circular transaction detected");
  }

  // Cap at 100
  const finalRisk = Math.min(risk, 100);
  
  return {
    riskScore: finalRisk,
    isHighRisk: finalRisk >= 60,
    reasons
  };
}
