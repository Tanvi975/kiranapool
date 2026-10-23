// Live backend integration is enabled by default. Set VITE_USE_MOCK_DATA=true only for an offline UI demo.
export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, "").replace(/\/api$/i, "");
