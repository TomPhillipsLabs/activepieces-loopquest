# Activepieces piece — LoopQuest

An [Activepieces](https://www.activepieces.com) piece for [LoopQuest](https://loopquest.tomphillips.uk) — put a human in the loop on your AI and automation output. **Block** a downstream action until a person approves it (gate), or review quality in the **background** without pausing anything (monitor).

## What's in it

- **Create Review Task** (action) — send content to a human. Pick the game (Swiper, Versus, Sorter, Detective, Fixer, Redact, Grounding) and the mode (gate or monitor); optional timeout + on-timeout fallback. Returns the task `id`.
- **New Verdict** (trigger) — a webhook trigger that fires the moment a review resolves, with the verdict, choice, reason, flags (`escalated`, `timed_out`) and your `external_id`. It **auto-subscribes** the flow's webhook to LoopQuest when enabled and unsubscribes when disabled — no manual URL wiring.
- **Get Task Status** (action) — poll a task's status / verdict on demand.

## Auth

A LoopQuest **API key** (Workspaces → API keys) and, if self-hosting, your **Base URL** (defaults to `https://loopquest.tomphillips.uk`).

## Gate vs monitor

- **Monitor** — Create Review Task and carry on. Reviews happen in the background for quality and audit.
- **Gate** — split the flow: one flow does the work then Create Review Task with **Mode = gate**; a second flow starts from the **New Verdict** trigger and branches — on `verdict === true` run the real action, on a flag or timeout route to a fallback. The **External ID** you set comes back on the verdict so the second flow knows which item to act on.

## How the trigger works

The **New Verdict** trigger registers the flow's webhook URL with LoopQuest (`POST /api/v1/hooks`) in `onEnable` and removes it (`DELETE /api/v1/hooks/{id}`) in `onDisable`. LoopQuest then POSTs every resolved verdict to the flow. Subscriptions are idempotent by URL.

## Develop / submit

```bash
npm install
npm test             # unit tests for the request builder (node --test)
npm run build        # tsc, typechecks against @activepieces/pieces-framework
```

To publish to the Activepieces marketplace, contribute the piece under `packages/pieces/community/loopquest` in [activepieces/activepieces](https://github.com/activepieces/activepieces) and open a PR (their team reviews). It can also be loaded as a custom/private piece on self-hosted Activepieces.

## API endpoints used

| Component | Call |
|-----------|------|
| Create Review Task | `POST /api/v1/tasks` |
| Get Task Status | `GET /api/v1/tasks/{id}` |
| New Verdict — subscribe | `POST /api/v1/hooks` |
| New Verdict — unsubscribe | `DELETE /api/v1/hooks/{id}` |

Full API: https://loopquest.tomphillips.uk/docs · spec: https://loopquest.tomphillips.uk/openapi.json

## License

MIT
