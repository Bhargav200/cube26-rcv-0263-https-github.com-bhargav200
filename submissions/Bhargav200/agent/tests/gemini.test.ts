import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectUnit } from "../lib/inspect";
import { GeminiProvider } from "../lib/vision/gemini";
import { goodObs, po } from "./helpers";

const jpeg = () => sharp({ create: { width: 400, height: 300, channels: 3, background: "#468" } }).jpeg().toBuffer();

function mockFetch(status: number, body: unknown) {
  const spy = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ok = (text: string, finishReason = "STOP") => ({ candidates: [{ content: { parts: [{ text }] }, finishReason }] });

afterEach(() => vi.unstubAllGlobals());

describe("GeminiProvider", () => {
  it("sends one request with the image, the key in a header (never the URL), and no PO data", async () => {
    const spy = mockFetch(200, ok(JSON.stringify(goodObs())));
    const res = await new GeminiProvider("gemini-test", "k-123").observe(await jpeg(), ["carton", "unit"]);
    expect(res.observation.product_type).toBe("water bottle");
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0];
    expect(url).not.toContain("k-123");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k-123");
    const sent = String(init.body);
    expect(sent).toContain("inlineData");
    for (const leak of [po.sku, po.product_title, po.spec_variant]) expect(sent).not.toContain(leak);
  });

  it.each([
    ["missing key", () => new GeminiProvider("m", ""), () => mockFetch(200, {}), /GEMINI_API_KEY/],
    ["rate limit", () => new GeminiProvider("m", "k"), () => mockFetch(429, { error: { message: "quota" } }), /HTTP 429/],
    ["cut off", () => new GeminiProvider("m", "k"), () => mockFetch(200, ok('{"photo_q', "MAX_TOKENS")), /stopped early/],
    ["wrong shape", () => new GeminiProvider("m", "k"), () => mockFetch(200, ok('{"photo_quality":"great"}')), /schema/],
  ])("%s → pending record, not a crash", async (_name, make, mock, why) => {
    mock();
    const rec = await inspectUnit({ po, provider: make(), operator_id: "o", photos: [{ role: "unit", ref: "x.jpg", bytes: await jpeg() }] });
    expect(rec.status).toBe("pending");
    expect(rec.model.error).toMatch(why);
    expect(rec.overall).not.toBe("ACCEPT");
  });
});
