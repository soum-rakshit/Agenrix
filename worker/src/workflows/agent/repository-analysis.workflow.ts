import Sandbox from "e2b";
import { eventType, NonRetriableError, staticSchema } from "inngest";
import { OPENCODE_CONFIG } from "~/constants/opencode-config.constants";
import { RepositoryAnalysisSkill } from "~/ai/skills/repository-analysis.skill.ai";
import { env } from "~/infrastructure/config/env.config.infrastructure";
import { generalLogger } from "~/infrastructure/logger/pino.logger.infrastructure";
import { zGithubRepository } from "~/infrastructure/validation/atoms/github.atom.validation";
import { inngestClient } from "~/infrastructure/workflows/inngest.workflows.infrastructure";
import { google } from "~/ai/provider/google.provider.ai";
import z from "zod";
import { generateText, Output } from "ai";

type IAnalyzeRepositoryEventParams = {
  repository: string;
};

type JsonLineCapture = {
  buffer: string;
};

type OpencodeEvent = {
  type: string;
  sessionID?: string;
  part?: {
    text?: string;
    tool?: string;
    reason?: string;
    cost?: number;
    tokens?: {
      total: number;
      input: number;
      output: number;
      reasoning?: number;
    };
  };
};

function captureJsonLines(
  capture: JsonLineCapture,
  data: string,
  onLine: (line: string) => void,
) {
  capture.buffer += data;

  const lines = capture.buffer.split("\n");
  capture.buffer = lines.pop() ?? "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    try {
      JSON.parse(trimmedLine);
      onLine(trimmedLine);
    } catch {
      // OpenCode can emit non-JSON setup output before the event stream starts.
    }
  }
}

function finalizeJsonLines(
  capture: JsonLineCapture,
  onLine: (line: string) => void,
) {
  const trailingLine = capture.buffer.trim();

  if (!trailingLine) {
    return;
  }

  try {
    JSON.parse(trailingLine);
    onLine(trailingLine);
  } catch {
    // Ignore trailing non-JSON output.
  }
}

function getTextPart(line: string) {
  const event = JSON.parse(line) as OpencodeEvent;

  if (event.type === "text" && event.part?.text) {
    return event.part.text;
  }

  return null;
}

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
      const skillPath = `${repositoryPath}/.opencode/skills/repository-analysis/SKILL.md`;
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

        generalLogger.info(
          { skillPath },
          "Writing repository analysis skill config",
        );
        await sandbox.files.write(
          skillPath,
          repositoryAnalysisSkill.skillMarkdown,
        );

        generalLogger.info({ opencodeConfigPath }, "Writing OpenCode config");
        await sandbox.files.write(opencodeConfigPath, OPENCODE_CONFIG);
      });

      const agentAnalysis = await step.run(
        "run repository analysis",
        async () => {
          const sandbox = await Sandbox.connect(sandboxId);
          const stdoutCapture: JsonLineCapture = { buffer: "" };
          const textParts: string[] = [];

          generalLogger.info(
            "Running OpenCode repository analysis skill with plan agent",
          );
          const result = await sandbox.commands.run(
            'opencode run --agent plan --format json "Load the repository-analysis skill and analyze this repository for AI agent implementation patterns using static analysis only. Follow the skill\'s output format exactly."',
            {
              cwd: repositoryPath,
              onStdout: (data) => {
                // todo: also send the data to a backend webhook to ingest the agent logss
                captureJsonLines(stdoutCapture, String(data), (line) => {
                  const text = getTextPart(line);

                  if (text) {
                    textParts.push(text);
                  }
                });
              },
              onStderr: (data) => {
                // todo: send the data to a backend webhook to ingest the agent logss
              },
              timeoutMs: 600_000,
            },
          );

          if (result.exitCode !== 0) {
            throw new Error(result.stderr || result.error || "OpenCode run failed");
          }

          finalizeJsonLines(stdoutCapture, (line) => {
            const text = getTextPart(line);

            if (text) {
              textParts.push(text);
            }
          });

          const rawAnalysis = textParts.join(" ").trim();

          if (!rawAnalysis) {
            throw new Error(
              "OpenCode completed without returning analysis text",
            );
          }

          return rawAnalysis;
        },
      );

      await step.run("kill the spawned sandbox", async () => {
        const killed = await Sandbox.kill(sandboxId);

        if (!killed) {
          generalLogger.warn({ sandboxId }, "Failed to kill sandbox");
        }

        return { killed };
      });

      const result = await step.run(
        "perform post-analysis normalization",
        async () => {
          const zAgentAnalysisSchema = z.object({
            classification: z.enum(["AGENT", "POSSIBLE_AGENT", "NOT_AGENT"]),
            confidence: z.enum(["high", "medium", "low"]),
            agentSignals: z.array(z.string()),
            evidenceFiles: z.array(z.string()),
            frameworksDetected: z.array(z.string()),
            reasoning: z.string(),
          });

          const { output } = await generateText({
            model: google("gemini-2.5-flash"),
            output: Output.object({ schema: zAgentAnalysisSchema }),
            system:
              "Convert the provided repository analysis report into structured data. Preserve the original meaning, do not add new claims, and use empty arrays when a list section is missing.",
            prompt: [
              "Parse this repository analysis report into the requested schema:",
              agentAnalysis || "",
            ].join("\n\n"),
          });

          return output;
        },
      );


      // todo: send the output to the backend webhook url

      await step.run("send-to-backend", async () => {
        const backendPayload = {
          agent_id: "repository-analyzer-bot", // Mandatory

          event: {
            action: "repository_analysis",
            // Include evidence files here for quick SQL-side filtering if needed
            files_altered: result?.evidenceFiles || []
          },

          data_shared: [
            {
              item: "repository_scan_report",
              classification: result?.classification || "NOT_AGENT",
              // Storing the detailed audit results in metadata for NoSQL storage
              metadata: {
                agent_signals: result?.agentSignals || [],
                evidence_files: result?.evidenceFiles || [],
                reasoning: result?.reasoning || "No reasoning provided",
                frameworks: result?.frameworksDetected || []
              }
            }
          ]
        };

        const response = await fetch(`${env.BACKEND_API_URL}/log_agent_work`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        return await response.json();
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
