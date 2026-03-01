/**
 * API Service for MuleShield AI
 * Handles all communication with the backend
 */

const BASE_URL = "/api";

export const fetchTransactions = async () => {
  const response = await fetch(`${BASE_URL}/transactions`);
  if (!response.ok) throw new Error("Failed to fetch transactions");
  return response.json();
};

export const fetchRiskAnalysis = async () => {
  const response = await fetch(`${BASE_URL}/risk-analysis`);
  if (!response.ok) throw new Error("Failed to fetch risk analysis");
  return response.json();
};

export const fetchAlerts = async () => {
  const response = await fetch(`${BASE_URL}/alerts`);
  if (!response.ok) throw new Error("Failed to fetch alerts");
  return response.json();
};

export const fetchGraph = async () => {
  const response = await fetch(`${BASE_URL}/graph`);
  if (!response.ok) throw new Error("Failed to fetch graph data");
  return response.json();
};

export const simulateTransaction = async () => {
  const response = await fetch(`${BASE_URL}/simulate`, { method: "POST" });
  if (!response.ok) throw new Error("Failed to simulate transaction");
  return response.json();
};
