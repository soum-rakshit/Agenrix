import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
  server: {
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    PORT: z.coerce.number().default(3000),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string(),
    E2B_API_KEY: z.string(),
    INNGEST_DEV: z.coerce.number().default(1),
    INNGEST_API_BASE_URL: z.url().default("http://127.0.0.1:8288"),
    INNGEST_SIGNING_KEY: z.string().optional(),
    BACKEND_API_URL: z.url().default("http://127.0.0.1:8000"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
