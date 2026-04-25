import { createMiddleware } from "hono/factory";
import { ulid } from "ulid";

export const setupMiddleware = createMiddleware<{
  Variables: {
    requestId: string;
  };
}>(async (ctx, next) => {
  const requestId = ulid();
  ctx.set("requestId", requestId);
  ctx.header("X-Request-Id", requestId);

  await next();
});
