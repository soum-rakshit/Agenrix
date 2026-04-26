import { Hono } from "hono/tiny";
import z from "zod";
import { generalLogger } from "~/infrastructure/logger/pino.logger.infrastructure";
import { zGithubRepository } from "~/infrastructure/validation/atoms/github.atom.validation";
import { inngestClient } from "~/infrastructure/workflows/inngest.workflows.infrastructure";
import { analyzeRepositoryEvent } from "~/workflows/agent/repository-analysis.workflow";

const workerRoute = new Hono();

const zAnalyzeRepositoryBody = z.object({
  repository: zGithubRepository,
});

workerRoute.get("/", async (ctx) => {
  return ctx.text(`Hello ${ctx.req.header("User-Agent")}`);
});

workerRoute.post("/", async (ctx) => {
  try {
    const body = await ctx.req.json().catch(() => null);

    const validationResult = zAnalyzeRepositoryBody.safeParse(body);

    if (!validationResult.success) {
      return ctx.json(
        {
          success: false,
          error: {
            message: validationResult.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
          },
        },
        400,
      );
    }

    const { ids } = await inngestClient.send(
      analyzeRepositoryEvent.create(validationResult.data),
    );

    return ctx.json({
      success: true,
      data: {
        eventId: ids,
      },
    });
  } catch (error) {
    generalLogger.error(
      {
        endpoint: `${ctx.req.method} ${new URL(ctx.req.url).pathname}`,
      },
      error instanceof Error ? error.message : "An unexpected error occurred",
    );

    return ctx.json({
      success: false,
      error: { message: "Something went wrong" },
    });
  }
});

export default workerRoute;
