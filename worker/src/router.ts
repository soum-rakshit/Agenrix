import { Hono } from "hono/tiny";
import workerRouter from "./routers/worker.router";

const router = new Hono();

router.route("/worker", workerRouter);

export default router