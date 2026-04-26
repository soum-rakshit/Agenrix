import { cors } from "hono/cors";
import { Hono } from "hono/tiny";
import { pinoLogger } from "hono-pino";
import { env } from "./infrastructure/config/env.config.infrastructure";
import {
  generalLogger,
  httpLogger,
} from "./infrastructure/logger/pino.logger.infrastructure";
import { setupMiddleware } from "./middlewares/setup.middleware";
import router from "./router";
import { serve } from "inngest/hono";
import { inngestClient } from "./infrastructure/workflows/inngest.workflows.infrastructure";
import { repositoryAnalysisWorkflow } from "./workflows/agent/repository-analysis.workflow";

const app = new Hono();

// configure cors origins later
app.use("*", cors());
app.use("*", setupMiddleware);
app.use(
  "/v1/*",
  pinoLogger({ pino: httpLogger, http: { referRequestIdKey: "requestId", } }),
);

app.route("/v1", router);

app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  serve({ client: inngestClient, functions: [repositoryAnalysisWorkflow] }),
);

const server = Bun.serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: "0.0.0.0",
});

generalLogger.info(
  `Server listening on http://${server.hostname}:${server.port}`,
);
