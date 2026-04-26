export const OPENCODE_CONFIG = JSON.stringify(
  {
    $schema: "https://opencode.ai/config.json",
    autoupdate: false,
    snapshot: false,
    enabled_providers: ["google"],
    provider: {
      google: {
        options: {
          apiKey: "{env:GOOGLE_GENERATIVE_AI_API_KEY}",
          timeout: 120000,
          chunkTimeout: 30000,
        },
      },
    },
    model: "google/gemini-3.1-pro-preview",
    watcher: {
      ignore: [".git/**", "node_modules/**", "dist/**"],
    },
    agent: {
      plan: {
        permission: {
          edit: "deny",
          bash: {
            "*": "allow",
          },
          webfetch: "deny",
          skill: {
            "*": "deny",
            "repository-analysis": "allow",
          },
        },
      },
    },
  },
  null,
  2,
);
