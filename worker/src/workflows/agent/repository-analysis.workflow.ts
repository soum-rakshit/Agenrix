import Sandbox from "e2b";
import { eventType, NonRetriableError, staticSchema } from "inngest";
import { OPENCODE_CONFIG } from "~/constants/opencode-config.constants";
import { RepositoryAnalysisSkill } from "~/harness/skills/repository-analysis.skill";
import { env } from "~/infrastructure/config/env.config.infrastructure";
import { generalLogger } from "~/infrastructure/logger/pino.logger.infrastructure";
import { zGithubRepository } from "~/infrastructure/validation/atoms/github.atom.validation";
import { inngestClient } from "~/infrastructure/workflows/inngest.workflows.infrastructure";

type IAnalyzeRepositoryEventParams = {
  repository: string;
};

export const analyzeRepositoryEvent = eventType("agent/analyze-repository", {
  schema: staticSchema<IAnalyzeRepositoryEventParams>(),
});

export const repositoryAnalysisWorkflow = inngestClient.createFunction(
  {
    id: "repository-analysis",
    triggers: analyzeRepositoryEvent,
  },
  async ({ event, step, attempt, maxAttempts }) => {
    try {
      const repository = await step.run("validate repository", async () => {
        const repositoryResult = zGithubRepository.safeParse(
          event.data.repository,
        );

        if (!repositoryResult.success) {
          throw new NonRetriableError(repositoryResult.error.message);
        }

        return repositoryResult.data;
      });

      const repositoryAnalysisSkill = new RepositoryAnalysisSkill();
      const repositoryPath = "/home/user/repo";
      const skillPath = `${repositoryPath}/.opencode/skills/repo-analysis/SKILL.md`;
      const opencodeConfigPath = `${repositoryPath}/opencode.json`;

      const sandboxId = await step.run("create sandbox", async () => {
        generalLogger.info("Creating E2B sandbox...");

        const sandbox = await Sandbox.create("opencode", {
          envs: {
            GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY,
          },
          timeoutMs: 600_000,
          apiKey: env.E2B_API_KEY,
        });

        return sandbox.sandboxId;
      });

      await step.run("prepare sandbox repository", async () => {
        const sandbox = await Sandbox.connect(sandboxId);

        generalLogger.info(
          { path: repositoryPath },
          "Cloning repository into sandbox",
        );
        await sandbox.git.clone(repository, {
          path: repositoryPath,
          depth: 1,
        });

        generalLogger.info({ skillPath }, "Writing repo analysis skill config");
        await sandbox.files.write(
          skillPath,
          repositoryAnalysisSkill.skillMarkdown,
        );

        generalLogger.info({ opencodeConfigPath }, "Writing OpenCode config");
        await sandbox.files.write(opencodeConfigPath, OPENCODE_CONFIG);
      });

      const result = await step.run("run repository analysis", async () => {
        const sandbox = await Sandbox.connect(sandboxId);

        generalLogger.info(
          "Running OpenCode repo analysis skill with plan agent",
        );
        return sandbox.commands.run(
          `opencode run --agent plan --format json "Load the \`repository-analysis\` skill and analyze this repository for AI agent implementation patterns using static analysis only. Follow the skill's output format exactly."`,
          {
            cwd: repositoryPath,
            onStdout: (data) => {
              // todo: send the data to a backend webhook to ingest the agent logss
            },
            onStderr: (data) => {
              // todo: send the data to a backend webhook to ingest the agent logss
            },
            timeoutMs: 600_000,
          },
        );
      });

      return result;
    } catch (error) {
      generalLogger.error(
        {
          message: "Failed to enrich lead",
          attempt,
          maxAttempts,
        },
        error instanceof Error ? error.message : "Something went wrong",
      );

      throw error;
    }
  },
);
