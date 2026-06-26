import {
  createAction,
  createPiece,
  createTrigger,
  PieceAuth,
  Property,
  TriggerStrategy,
} from "@activepieces/pieces-framework";
import { httpClient, HttpMethod } from "@activepieces/pieces-common";

export const loopquestAuth = PieceAuth.CustomAuth({
  description: "Your LoopQuest API key (Workspaces -> API keys) and deployment URL.",
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

export const createReviewTask = createAction({
  auth: loopquestAuth,
  name: "create_review_task",
  displayName: "Create Review Task",
  description: "Send content to LoopQuest for a human to review (approve or flag).",
  props: {
    content: Property.LongText({ displayName: "Content", required: true }),
    title: Property.ShortText({ displayName: "Title", required: false }),
    module: Property.StaticDropdown({
      displayName: "Module",
      required: false,
      defaultValue: "swiper",
      options: {
        options: [
          { label: "Swiper", value: "swiper" },
          { label: "Detective", value: "detective" },
          { label: "Decoy", value: "decoy" },
          { label: "Arena", value: "arena" },
        ],
      },
    }),
    externalId: Property.ShortText({ displayName: "External ID", required: false }),
    callbackUrl: Property.ShortText({ displayName: "Callback URL", required: false }),
  },
  async run(context) {
    const auth = context.auth as Auth;
    const p = context.propsValue;
    const body: Record<string, unknown> = {
      module: p.module ?? "swiper",
      payload: { content: p.content },
      card: { title: p.title || "Review", body: p.content },
    };
    if (p.externalId) body["external_id"] = p.externalId;
    if (p.callbackUrl) body["callback_url"] = p.callbackUrl;

    const res = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `${base(auth)}/api/v1/tasks`,
      headers: { authorization: `Bearer ${auth.apiKey}`, "content-type": "application/json" },
      body,
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
    taskId: Property.ShortText({ displayName: "Task ID", required: true }),
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
  description: "Fires when a LoopQuest verdict arrives. Copy this trigger's URL into the Create Review Task callback_url.",
  type: TriggerStrategy.WEBHOOK,
  props: {},
  sampleData: { task_id: "…", verdict: true, external_id: "run-1", source: "activepieces" },
  async onEnable() {
    // Passive webhook: the user pastes this trigger's URL as the task callback_url.
  },
  async onDisable() {
    // No subscription to tear down.
  },
  async run(context) {
    return [context.payload.body];
  },
});

export const loopquest = createPiece({
  displayName: "LoopQuest",
  description: "Send AI output for gamified human-in-the-loop review and get a verdict back.",
  auth: loopquestAuth,
  minimumSupportedRelease: "0.20.0",
  logoUrl: "https://loopquest.tomphillips.uk/icon.svg",
  categories: [],
  authors: ["TomPhillipsLabs"],
  actions: [createReviewTask, getTaskStatus],
  triggers: [newVerdict],
});
