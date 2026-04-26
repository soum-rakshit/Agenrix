import { Hono } from "hono/tiny";
import eventsWorkerRoute from "~/routes/worker/events.worker.route";
import workerRoute from "~/routes/worker/worker.route";

export const workerRouter = new Hono();

workerRouter.route("/", workerRoute);
workerRouter.route("/events", eventsWorkerRoute);

export default workerRouter;
