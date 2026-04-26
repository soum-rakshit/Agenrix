import { Hono } from "hono/tiny";
import { inngestSdk } from "~/infrastructure/workflows/inngest.workflows.infrastructure";

const eventsWorkerRoute = new Hono();

eventsWorkerRoute.get("/:eventId", async (ctx) => {
  const eventId = ctx.req.param("eventId");

  try {
    const [eventResponse, eventRunsResponse] = await Promise.all([
      inngestSdk.getEvent(eventId),
      inngestSdk.getEventRuns(eventId),
    ]);

    const latestRun = eventRunsResponse.data[0] ?? null;
    const runResponse = latestRun
      ? await inngestSdk.getRun(latestRun.runId)
      : null;
    const run = runResponse?.data ?? latestRun;

    const status = !run
      ? "queued"
      : ["completed", "failed", "cancelled"].includes(run.status)
        ? run.status
        : run.status === "running"
          ? "running"
          : "queued";

    return ctx.json({
      success: true,
      data: {
        eventId,
        event: eventResponse.data,
        runId: run?.runId ?? null,
        status,
        run,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("not configured") ? 503 : 500;

    return ctx.json(
      {
        success: false,
        error: { message },
      },
      status,
    );
  }
});

export default eventsWorkerRoute;
