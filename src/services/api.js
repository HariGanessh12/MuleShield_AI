/**
 * API Service for MuleShield AI
 * Handles all communication with the backend
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const ROLE_KEY = "muleshield_role";

const getRole = () => localStorage.getItem(ROLE_KEY) || "analyst";

export const setApiRole = (role) => {
  localStorage.setItem(ROLE_KEY, role);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Role": getRole(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload?.detail || detail;
    } catch {
      // ignore parse errors for non-JSON responses
    }
    throw new Error(detail);
  }
  return response.json();
};

export const fetchTransactions = async () => {
  return request("/transactions");
};

export const fetchRiskAnalysis = async () => {
  return request("/risk-analysis");
};

export const fetchAlerts = async () => {
  return request("/alerts");
};

export const fetchGraph = async () => {
  return request("/graph");
};

export const fetchAccountRisk = async () => {
  return request("/accounts/risk");
};

export const simulateTransaction = async () => {
  return request("/simulate", { method: "POST" });
};
