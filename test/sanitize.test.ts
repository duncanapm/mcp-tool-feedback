import { expect, test } from "vitest";
import { defaultSanitize } from "../src/sanitize.js";

test("defaultSanitize redacts API key prefixes", () => {
  const samples = [
    "prefix sk-abc123def456ghi789jkl suffix",
    "prefix pk_live_abc123def456ghi789 suffix",
    "prefix ghp_abc123def456ghi789jkl suffix",
    "prefix xoxb-1234-5678-abc123def456 suffix",
    "prefix AKIA1234567890ABCDEF suffix",
  ];

  for (const sample of samples) {
    const result = defaultSanitize(sample);
    const secret = sample.replace("prefix ", "").replace(" suffix", "");

    expect(result).toContain("[redacted]");
    expect(result).not.toContain(secret);
    expect(result).toContain("prefix ");
    expect(result).toContain(" suffix");
  }
});

test("defaultSanitize redacts bearer tokens", () => {
  const secret = "Authorization: Bearer abc123def456ghi789jkl";
  const result = defaultSanitize(secret);

  expect(result).toContain("[redacted]");
  expect(result).not.toContain("abc123def456ghi789jkl");
});

test("defaultSanitize redacts email addresses", () => {
  const samples = [
    "contact me at duncan@example.com please",
    "contact me at name+tag@example.co.uk please",
    "contact me at under_score@sub.example.com please",
  ];

  for (const sample of samples) {
    const result = defaultSanitize(sample);
    const email = sample.replace("contact me at ", "").replace(" please", "");

    expect(result).toContain("[redacted]");
    expect(result).not.toContain(email);
    expect(result).toContain("contact me at ");
    expect(result).toContain(" please");
  }
});

test("defaultSanitize redacts long hex strings", () => {
  const longHex = "a".repeat(40);
  const shortHex = "a".repeat(39);
  const result = defaultSanitize(`long=${longHex} short=${shortHex}`);

  expect(result).toContain("[redacted]");
  expect(result).not.toContain(longHex);
  expect(result).toContain(shortHex);
});

test("defaultSanitize redacts token query parameters", () => {
  const tokenUrl = "https://example.com/api?token=secret123abc&foo=bar";
  const apiKeyUrl = "https://example.com/api?api_key=secret123abc&foo=bar";
  const keyUrl = "https://example.com/api?key=secret123abc&foo=bar";

  for (const url of [tokenUrl, apiKeyUrl, keyUrl]) {
    const result = defaultSanitize(url);

    expect(result).toContain("[redacted]");
    expect(result).not.toContain("secret123abc");
    expect(result).toContain("foo=bar");
  }
});

test("defaultSanitize preserves non-matching text", () => {
  const text =
    "We discussed the roadmap this morning and agreed to ship the first version next week.";
  const result = defaultSanitize(text);

  expect(result).toBe(text);
});

test("defaultSanitize handles empty strings", () => {
  expect(defaultSanitize("")).toBe("");
});
