import assert from "node:assert/strict";
import test from "node:test";

import { deckLabels } from "../src/shared/i18n/deck.ts";

test("selects localized deck labels", () => {
  assert.equal(deckLabels("zh-CN", "page").next, "下一页");
  assert.equal(deckLabels("zh-CN", "section").next, "下一节");
  assert.equal(deckLabels("en", "page").next, "Next page");
});
