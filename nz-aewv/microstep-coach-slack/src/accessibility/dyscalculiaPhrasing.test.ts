import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDurationForDisplay,
  formatTextForDyscalculiaSupport
} from "./dyscalculiaPhrasing";

test("keeps default duration format when dyscalculia mode is disabled", () => {
  assert.equal(formatDurationForDisplay(10, false), "10 min");
});

test("formats duration as chunked blocks when dyscalculia mode is enabled", () => {
  assert.equal(formatDurationForDisplay(10, true), "one ten-minute block");
  assert.equal(
    formatDurationForDisplay(30, true),
    "two blocks of fifteen minutes"
  );
  assert.equal(
    formatDurationForDisplay(40, true),
    "four blocks of ten minutes"
  );
});

test("rewrites quantity and time expressions into plain-language phrasing", () => {
  assert.equal(
    formatTextForDyscalculiaSupport("Upload 2 receipts in 10 min.", true),
    "Upload two receipts in one ten-minute block."
  );
  assert.equal(
    formatTextForDyscalculiaSupport("Finish 1 section in 2 hours.", true),
    "Finish one section in eight blocks of fifteen minutes."
  );
});

test("returns original text when dyscalculia mode is disabled", () => {
  const input = "Upload 2 receipts in 10 min.";
  assert.equal(formatTextForDyscalculiaSupport(input, false), input);
});
