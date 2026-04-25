import pino from "pino";
import { env } from "../config/env.config.infrastructure";

const parentLogger = pino({
  level: env.LOG_LEVEL,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const generalLogger = parentLogger.child({ type: "general" });
export const httpLogger = parentLogger.child({ type: "http" });
