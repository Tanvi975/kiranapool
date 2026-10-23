import { USE_MOCK_DATA } from "./config";
import { apiRequest } from "./client";
import { demoOrders, demoShops, demoRiders } from "../mocks/demoData";

const list = (result) => Array.isArray(result) ? result : result?.data || result?.orders || result?.shops || result?.riders || [];

export async function getOrders() {
  if (USE_MOCK_DATA) return demoOrders;
  return list(await apiRequest("/api/orders"));
}
export async function getShops() {
  if (USE_MOCK_DATA) return demoShops;
  return list(await apiRequest("/api/shops"));
}
export async function getRiders() {
  if (USE_MOCK_DATA) return demoRiders;
  return list(await apiRequest("/api/riders"));
}
