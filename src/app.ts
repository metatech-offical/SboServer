import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import helmet from "helmet";

import { Server } from "socket.io";
import mainSocket from "./sockets/main";

import router from "./routers";
import webhookRouter from "./webhooks/index.webhook";

import { swaggerOptions } from "./config/swagger";
import { CORS_ORIGINS, MONGODB_URI, PORT, MONGO_MAX_POOL_SIZE, MONGO_MIN_POOL_SIZE } from "./config/environment";
import { API_BASE_URL } from "./config/router";
import logger, { morganStream } from "./config/logger";
import redisClient from "./config/redis";
import "./cron/trending.cron";
import { getMetrics, httpRequestDurationSeconds, httpRequestTotal } from "./monitoring/metrics";

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = CORS_ORIGINS.split(",");

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
// const ALLOWED_ORIGINS = ["http://localhost:3000"];
console.log("ALLOWED_ORIGINS=====================>", ALLOWED_ORIGINS);

app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use("/webhook", webhookRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  morgan("combined", {
    stream: morganStream,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins if "*" is in the list
      if (ALLOWED_ORIGINS.includes("*")) {
        callback(null, true);
      } else if (ALLOWED_ORIGINS.includes(origin ?? "") || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const swaggerSpecs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.get("/", (req, res) => {
  res.status(200).send("Hello from App!");
});

app.use(API_BASE_URL, router);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err && err.error && err.error.isJoi) {
      return res.status(400).json({
        type: err.type,
        message: err.error.toString(),
      });
    }

    logger.error(`Error: ${err.message}`);
    res.status(500).send("Internal Server Error");
  }
);

//-------------------------------- monitoring section --------------------------------
// -- matrics middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const diffNs = Number(end - start);
    const diffSeconds = diffNs / 1e9;

    const route = (req.route && req.route.path) || req.path || "unknown";

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDurationSeconds.observe(labels, diffSeconds);
    httpRequestTotal.inc(labels);
  });

  next();
});

// --- Health endpoint ---
app.get("/healthz", (req, res) => {
  // later we can add checks for DB/Redis if needed
  res.status(200).json({ status: "ok" });
});

// --- Metrics endpoint ---
app.get("/metrics", async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (err) {
    res.status(500).send("Error collecting metrics");
  }
});
//-------------------------------- monitoring section --------------------------------

mainSocket(io);

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close(() => console.log("HTTP server closed"));
  await mongoose.connection.close();
  console.log("MongoDB connection closed");

  await redisClient.quit();
  console.log("Redis connection closed");

  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: MONGO_MAX_POOL_SIZE,
      minPoolSize: MONGO_MIN_POOL_SIZE,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    });
    // Bind 0.0.0.0 so Railway public networking can reach the process
    server.listen(PORT, "0.0.0.0", () => {
      console.log("App started on " + PORT);
    });
  } catch (error) {
    console.log(error);
  }
};
