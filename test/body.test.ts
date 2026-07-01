import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTaskBody } from "../src/body.ts";

test("wraps content and maps correlation fields", () => {
  const body = buildTaskBody({ content: "ship it?", title: "Deploy gate", module: "detective", externalId: "run-9", callbackUrl: "https://x.test/hook" });
  assert.equal(body["module"], "detective");
  assert.deepEqual(body["payload"], { content: "ship it?", body: "ship it?" });
  assert.deepEqual(body["card"], { title: "Deploy gate", body: "ship it?" });
  assert.equal(body["external_id"], "run-9");
  assert.equal(body["callback_url"], "https://x.test/hook");
});

test("defaults module + mode and omits unset fields", () => {
  const body = buildTaskBody({ content: "hi" });
  assert.equal(body["module"], "swiper");
  assert.equal(body["mode"], "monitor");
  assert.equal("external_id" in body, false);
  assert.equal("timeout_seconds" in body, false);
});

test("carries gate options and grounding fields", () => {
  const body = buildTaskBody({ content: "x", module: "grounding", mode: "gate", timeoutSeconds: 3600, onTimeout: "escalate", claim: "Flood is covered.", sourceText: "Policy excludes flood." });
  assert.equal(body["mode"], "gate");
  assert.equal(body["timeout_seconds"], 3600);
  assert.equal(body["on_timeout"], "escalate");
  assert.deepEqual(body["payload"], { content: "x", body: "x", claim: "Flood is covered.", source: "Policy excludes flood." });
});
