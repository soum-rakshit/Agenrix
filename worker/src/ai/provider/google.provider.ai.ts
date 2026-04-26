import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "~/infrastructure/config/env.config.infrastructure";

export const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});
