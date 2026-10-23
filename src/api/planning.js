import { USE_MOCK_DATA } from "./config";
import { apiRequest } from "./client";
import { demoPlan } from "../mocks/demoData";

export async function generatePlan(payload = {}) {
  if (USE_MOCK_DATA) return demoPlan;
  return apiRequest("/api/plans/preview", { method: "POST", body: JSON.stringify(payload) });
}
export async function getLatestPlan() {
  if (USE_MOCK_DATA) return demoPlan;
  return apiRequest("/api/plans/latest");
}
export async function resetDemo() {
  throw new Error("Demo reset endpoint is not available in the backend.");
}
