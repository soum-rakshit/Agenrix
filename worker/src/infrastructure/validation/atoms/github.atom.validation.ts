import z from "zod";

export const zGithubRepository = z.url().superRefine((val, ctx) => {
  if (!val.startsWith("https://github.com/")) {
    ctx.addIssue({ code: "custom", message: "Invalid github repository url" });
  }
});
