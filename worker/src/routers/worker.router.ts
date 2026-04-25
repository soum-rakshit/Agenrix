import { Hono } from "hono/tiny";
import workerRoute from "~/routes/worker/worker.route";

export const workerRouter = new Hono();

workerRouter.route("/", workerRoute);

export default workerRouter;
