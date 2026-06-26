# Activepieces piece — LoopQuest

An [Activepieces](https://www.activepieces.com) piece for [LoopQuest](https://loopquest.tomphillips.uk) — send AI/automation output for gamified human-in-the-loop review.

## What's in it

- **Create Review Task** — POST content for a human to approve or flag.
- **Get Task Status** — poll a task's status / verdict.
- **New Verdict** (trigger) — fires when a verdict arrives. Copy the trigger's webhook URL into the Create Review Task `callback_url`.

## Auth

A LoopQuest **API key** (Workspaces → API keys) and, if self-hosting, your **Base URL**.

## Develop / submit

```bash
npm install
npm run build        # tsc, typechecks against @activepieces/pieces-framework
```

To publish to the Activepieces marketplace, contribute the piece under `packages/pieces/community/loopquest` in [activepieces/activepieces](https://github.com/activepieces/activepieces) and open a PR (their team reviews). It can also be loaded as a custom/private piece on self-hosted Activepieces.

## License

MIT
