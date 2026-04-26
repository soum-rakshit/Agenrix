# @agenrix/worker

Background worker for repository analysis jobs

## Setup

Install dependencies:

```bash
bun install
```

Run the app:

```bash
bun run dev
```

Start the Inngest dev server first when developing locally:

```bash
npx inngest-cli@latest dev
```

Default server address:

```text
http://localhost:3000/v1
```

Inngest dashboard address:

```text
http://localhost:8288
```

## Environment

Required:

- `GOOGLE_GENERATIVE_AI_API_KEY`
- `E2B_API_KEY`

Optional:

- `PORT`
- `LOG_LEVEL`
- `INNGEST_API_BASE_URL`
- `INNGEST_SIGNING_KEY`

`GET /worker/events/:eventId` requires `INNGEST_SIGNING_KEY`. Without it, the route returns `503`.

## API

### `POST /worker`

Dispatch a repository analysis job.

Request body:

```json
{
  "repository": "https://github.com/advtszn/altar"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "eventId": ["01KQ43JX0DEA7P9ZQBKMC6N5J8"]
  }
}
```

Notes:

- The returned value is an Inngest event ID array from `inngestClient.send(...)`.
- This app currently dispatches one event per request, so the array should contain one ID.

Validation error response:

```json
{
  "success": false,
  "error": {
    "message": "repository: Invalid input"
  }
}
```

### `GET /worker/events/:eventId`

Poll job status for a previously dispatched event.

Success response:

```json
{
  "success": true,
  "data": {
    "eventId": "01KQ43JX0DEA7P9ZQBKMC6N5J8",
    "event": {
      "id": "01KQ43JX0DEA7P9ZQBKMC6N5J8",
      "name": "agent/analyze-repository",
      "data": {
        "repository": "https://github.com/advtszn/altar"
      }
    },
    "runId": "01KQ43K123ABCDEF456789XYZ",
    "status": "running",
    "run": {
      "runId": "01KQ43K123ABCDEF456789XYZ",
      "functionId": "repository-analysis",
      "status": "running"
    }
  }
}
```

Possible `status` values:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

If no run exists yet, the route returns `runId: null`, `run: null`, and `status: "queued"`.

Config error response:

```json
{
  "success": false,
  "error": {
    "message": "INNGEST_SIGNING_KEY is not configured"
  }
}
```

## Example flow

Dispatch a job:

```bash
curl -X POST http://localhost:3000/v1/worker \
  -H "Content-Type: application/json" \
  -d '{"repository":"https://github.com/advtszn/altar"}'
```

Poll the event:

```bash
curl http://localhost:3000/v1/worker/events/01KQ43JX0DEA7P9ZQBKMC6N5J8
```
