import { Hono } from "hono/tiny";

const workerRoute = new Hono();

workerRoute.get("/", async (ctx) => {
  return ctx.text(`Hello ${ctx.req.header("User-Agent")}`);
});

export default workerRoute;
