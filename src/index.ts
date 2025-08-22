import "dotenv/config";
import express from "express";
import { logger } from "./lib/logger.js";
import kakaoRouter from "./routes/kakao.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// Add better error handling
app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err }, "Express error");
  res.status(500).json({ error: "Internal server error" });
});

app.get("/health", (_req, res) => {
  logger.info("Health check requested");
  res.status(200).send("ok");
});

app.get("/", (_req, res) => {
  logger.info("Root endpoint requested");
  res.status(200).send("KakaoTalk Translate Bot is running!");
});

app.use("/kakao", kakaoRouter);

const port = Number(process.env.PORT) || 3000;

// Add better startup logging
logger.info({ port, env: process.env.NODE_ENV }, "Starting KakaoTalk translate bot");

app.listen(port, () => {
  logger.info({ port }, "KakaoTalk translate bot running");
});

// Add process error handlers
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  process.exit(1);
});
