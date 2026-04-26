import { Inngest } from "inngest";
import { env } from "~/infrastructure/config/env.config.infrastructure";

export const inngestClient = new Inngest({ id: "@agenrix/worker" });

type InngestApiResponse<T> = {
  data: T;
};

type InngestEvent = {
  id: string;
  name: string;
  data?: Record<string, unknown>;
  createdAt?: string;
};

type InngestRun = {
  runId: string;
  functionId: string;
  status: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
};

async function inngestFetch<T>(path: string) {
  if (!env.INNGEST_SIGNING_KEY) {
    throw new Error("INNGEST_SIGNING_KEY is not configured");
  }

  const response = await fetch(`${env.INNGEST_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${env.INNGEST_SIGNING_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Inngest API request failed with status ${response.status}`);
  }

  return (await response.json()) as InngestApiResponse<T>;
}

export const inngestSdk = {
  getEvent(eventId: string) {
    return inngestFetch<InngestEvent>(`/v2/events/${eventId}`);
  },
  getEventRuns(eventId: string) {
    return inngestFetch<InngestRun[]>(`/v2/events/${eventId}/runs`);
  },
  getRun(runId: string) {
    return inngestFetch<InngestRun>(`/v2/runs/${runId}`);
  },
};
