import {
  createAction,
  createPiece,
  createTrigger,
  PieceAuth,
  Property,
  TriggerStrategy,
} from "@activepieces/pieces-framework";
import { PieceCategory } from "@activepieces/shared";
import { httpClient, HttpMethod } from "@activepieces/pieces-common";
import { buildTaskBody } from "./body.js";

export const loopquestAuth = PieceAuth.CustomAuth({
  description: "Your LoopQuest API key (Workspaces → API keys) and, if self-hosting, your deployment URL.",
  required: true,
  props: {
    apiKey: PieceAuth.SecretText({ displayName: "API Key", required: true }),
    baseUrl: Property.ShortText({
      displayName: "Base URL",
      required: false,
      defaultValue: "https://loopquest.tomphillips.uk",
    }),
  },
});

type Auth = { apiKey: string; baseUrl?: string };

const base = (auth: Auth) => (auth.baseUrl || "https://loopquest.tomphillips.uk").replace(/\/+$/, "");
const authHeaders = (auth: Auth) => ({ authorization: `Bearer ${auth.apiKey}`, "content-type": "application/json" });

export const createReviewTask = createAction({
  auth: loopquestAuth,
  name: "create_review_task",
  displayName: "Create Review Task",
  description:
    "Send AI/automation output to a human. Gate a downstream step until it's approved, or monitor quality in the background.",
  props: {
    content: Property.LongText({ displayName: "Content", required: true, description: "The output a human should review." }),
    title: Property.ShortText({ displayName: "Title", required: false }),
    module: Property.StaticDropdown({
      displayName: "Game",
      required: false,
      defaultValue: "swiper",
      description: "How the reviewer sees the item.",
      options: {
        options: [
          { label: "Swiper — approve or reject", value: "swiper" },
          { label: "Versus — pick the better of two", value: "versus" },
          { label: "Sorter — bucket into categories", value: "sorter" },
          { label: "Detective — spot the problem", value: "detective" },
          { label: "Fixer — correct the output", value: "fixer" },
          { label: "Redact — mask sensitive text", value: "redact" },
          { label: "Grounding — verify a claim against a source", value: "grounding" },
        ],
      },
    }),
    mode: Property.StaticDropdown({
      displayName: "Mode",
      required: false,
      defaultValue: "monitor",
      description: "Gate blocks a downstream step until a human approves (pair with the New Verdict trigger). Monitor reviews in the background.",
      options: {
        options: [
          { label: "Monitor — review in the background", value: "monitor" },
          { label: "Gate — block until a human approves", value: "gate" },
        ],
      },
    }),
    claim: Property.LongText({ displayName: "Claim", required: false, description: "Grounding only: the statement to verify." }),
    sourceText: Property.LongText({ displayName: "Source text", required: false, description: "Grounding only: the reference the claim is checked against." }),
    timeoutSeconds: Property.Number({ displayName: "Timeout (seconds)", required: false, description: "Gate only: apply the fallback if no one reviews in time (30–2592000)." }),
    onTimeout: Property.StaticDropdown({
      displayName: "On timeout",
      required: false,
      description: "Gate only: what to do if the timeout is hit. Defaults to escalate (fail-closed).",
      options: {
        options: [
          { label: "Escalate — flag for a human", value: "escalate" },
          { label: "Reject — treat as a flag", value: "reject" },
          { label: "Approve — treat as approved", value: "approve" },
        ],
      },
    }),
    source: Property.ShortText({ displayName: "Source", required: false, defaultValue: "activepieces" }),
    externalId: Property.ShortText({ displayName: "External ID", required: false, description: "Your own id — echoed back in the verdict for correlation." }),
    callbackUrl: Property.ShortText({ displayName: "Callback URL", required: false, description: "Optional single webhook for this task's verdict. Leave blank if you use the New Verdict trigger." }),
    reviewsRequired: Property.Number({ displayName: "Reviewers required", required: false }),
  },
  async run(context) {
    const auth = context.auth as Auth;
    const res = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${base(auth)}/api/v1/tasks`,
      headers: authHeaders(auth),
      body: buildTaskBody(context.propsValue as Record<string, unknown>),
    });
    return res.body;
  },
});

export const getTaskStatus = createAction({
  auth: loopquestAuth,
  name: "get_task_status",
  displayName: "Get Task Status",
  description: "Check a LoopQuest task's status / verdict.",
  props: {
    taskId: Property.ShortText({ displayName: "Task ID", required: true, description: "The id returned by Create Review Task." }),
  },
  async run(context) {
    const auth = context.auth as Auth;
    const res = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `${base(auth)}/api/v1/tasks/${context.propsValue.taskId}`,
      headers: { authorization: `Bearer ${auth.apiKey}` },
    });
    return res.body;
  },
});

export const newVerdict = createTrigger({
  auth: loopquestAuth,
  name: "new_verdict",
  displayName: "New Verdict",
  description:
    "Fires the moment a human reviewer resolves a task — approve, flag, escalate or timeout. Use it to resume a gated action or act on a monitored review.",
  type: TriggerStrategy.WEBHOOK,
  props: {},
  sampleData: {
    task_id: "00000000-0000-0000-0000-000000000000",
    external_id: "order-42",
    module: "swiper",
    source: "activepieces",
    verdict: true,
    choice: null,
    reason: null,
    escalated: false,
    timed_out: false,
    reviewed_at: "2026-01-01T00:00:00Z",
  },
  // Auto-subscribe: register this flow's webhook URL with LoopQuest on enable,
  // remove it on disable. Idempotent by URL server-side.
  async onEnable(context) {
    const auth = context.auth as Auth;
    const res = await httpClient.sendRequest<{ id: string }>({
      method: HttpMethod.POST,
      url: `${base(auth)}/api/v1/hooks`,
      headers: authHeaders(auth),
      body: { url: context.webhookUrl },
    });
    await context.store.put("hookId", res.body.id);
  },
  async onDisable(context) {
    const auth = context.auth as Auth;
    const hookId = await context.store.get<string>("hookId");
    if (hookId) {
      await httpClient.sendRequest({
        method: HttpMethod.DELETE,
        url: `${base(auth)}/api/v1/hooks/${hookId}`,
        headers: { authorization: `Bearer ${auth.apiKey}` },
      });
    }
  },
  async run(context) {
    return [context.payload.body];
  },
});

export const loopquest = createPiece({
  displayName: "LoopQuest",
  description: "Human-in-the-loop review for AI output — gate an automation until a person approves, or monitor its quality in the background.",
  auth: loopquestAuth,
  minimumSupportedRelease: "0.20.0",
  logoUrl: "https://loopquest.tomphillips.uk/icon.svg",
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE, PieceCategory.PRODUCTIVITY],
  authors: ["TomPhillipsLabs"],
  actions: [createReviewTask, getTaskStatus],
  triggers: [newVerdict],
});
