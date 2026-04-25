export const OPENCODE_CONFIG = JSON.stringify(
  {
    $schema: "https://opencode.ai/config.json",
    enabled_providers: ["google"],
    provider: {
      google: {
        options: {
          apiKey: "{env:GOOGLE_GENERATIVE_AI_API_KEY}",
        },
      },
    },
    model: "google/gemini-3.1-pro-preview",
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
            "repo-analysis": "allow",
          },
        },
      },
    },
  },
  null,
  2,
);
