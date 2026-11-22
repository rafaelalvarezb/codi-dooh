import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhook } from "./webhook-signature";

// Test vector from the Standard Webhooks reference implementation.
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const ID = "msg_p5jXN8AQM9LWM0D4loKWxJek";
const TS = 1614265330;
const BODY = '{"test": 2432232314}';
const EXPECTED = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";

describe("Standard Webhooks signature", () => {
  it("matches the reference test vector", () => {
    expect(signWebhook(SECRET, ID, TS, BODY)).toBe(EXPECTED);
  });

  it("accepts a valid signature, also among several (key rotation)", () => {
    const headers = { id: ID, timestamp: String(TS), signature: EXPECTED };
    expect(verifyWebhook(SECRET, headers, BODY, TS + 10)).toBe(true);
    expect(verifyWebhook(SECRET, { ...headers, signature: `v1,AAAA ${EXPECTED}` }, BODY, TS)).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets, stale timestamps and missing headers", () => {
    const headers = { id: ID, timestamp: String(TS), signature: EXPECTED };
    expect(verifyWebhook(SECRET, headers, BODY.replace("2", "3"), TS)).toBe(false);
    expect(verifyWebhook("whsec_" + Buffer.from("otra-clave").toString("base64"), headers, BODY, TS)).toBe(false);
    expect(verifyWebhook(SECRET, headers, BODY, TS + 6 * 60)).toBe(false);
    expect(verifyWebhook(SECRET, { ...headers, signature: null }, BODY, TS)).toBe(false);
    expect(verifyWebhook(SECRET, { ...headers, signature: "v2,abc" }, BODY, TS)).toBe(false);
  });
});
