import test from "node:test";
import assert from "node:assert/strict";
import { loadLocale, saveLocale, localeStorageKey, localizeError } from "../src/i18n.ts";

test("English is the default and an explicit UI language survives reload", () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(loadLocale(storage), "en");
  saveLocale(storage, "zh-TW");
  assert.equal(loadLocale(storage), "zh-TW");
  saveLocale(storage, "en");
  assert.equal(loadLocale(storage), "en");
  storage.setItem(localeStorageKey, "invalid");
  assert.equal(loadLocale(storage), "en");
});

test("blocked browser storage does not prevent switching languages", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadLocale(blocked), "en");
  assert.doesNotThrow(() => saveLocale(blocked, "zh-TW"));
});

test("errors can change language without mutating provider diagnostics", () => {
  const error = "連線已中斷，請重試。";
  assert.match(localizeError(error, "en").message, /connection was lost/);
  assert.equal(localizeError(error, "zh-TW").message, error);
  const diagnostic = "Provider HTTP 429: try later";
  assert.equal(localizeError(diagnostic, "en").details, diagnostic);
  assert.equal(localizeError(diagnostic, "zh-TW").details, diagnostic);
});
