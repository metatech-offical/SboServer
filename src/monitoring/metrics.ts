// src/monitoring/metrics.ts
// @ts-ignore - prom-client type definitions have module resolution issues
import client = require("prom-client");

const register = new client.Registry();

// Collect default Node.js metrics (CPU, memory, event loop lag)
client.collectDefaultMetrics({
  register,
  prefix: "app_", // optional prefix to avoid name clashes
});

// HTTP request duration histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5], // adjust if you want
});

// Total HTTP requests counter
export const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// General error counter (you can increment this in error handlers)
export const appErrorCounter = new client.Counter({
  name: "app_errors_total",
  help: "Total number of application errors",
  labelNames: ["type"],
});

// Register custom metrics
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(appErrorCounter);

// Helper to expose metrics
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export { register };
