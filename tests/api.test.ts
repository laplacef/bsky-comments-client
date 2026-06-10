import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchThread, parsePostRef, resolveUri } from "../src/api";

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parsePostRef", () => {
  it("parses at:// URIs", () => {
    expect(parsePostRef("at://did:plc:abc/app.bsky.feed.post/3kxyz")).toEqual({
      actor: "did:plc:abc",
      rkey: "3kxyz",
    });
  });

  it("parses bsky.app post URLs", () => {
    expect(parsePostRef("https://bsky.app/profile/alice.test/post/3kxyz")).toEqual({
      actor: "alice.test",
      rkey: "3kxyz",
    });
  });

  it("stops the rkey at query and fragment", () => {
    expect(parsePostRef("https://bsky.app/profile/alice.test/post/3kxyz?ref=share").rkey).toBe("3kxyz");
    expect(parsePostRef("at://did:plc:abc/app.bsky.feed.post/3kxyz#frag").rkey).toBe("3kxyz");
  });

  it("rejects non-post references", () => {
    expect(() => parsePostRef("https://bsky.app/profile/alice.test")).toThrow(/Not a Bluesky post/);
    expect(() => parsePostRef("at://did:plc:abc/app.bsky.feed.like/3k")).toThrow();
    expect(() => parsePostRef("")).toThrow();
  });
});

describe("resolveUri", () => {
  it("passes DID actors through without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      resolveUri("at://did:plc:abc/app.bsky.feed.post/3k", "https://proxy.example"),
    ).resolves.toBe("at://did:plc:abc/app.bsky.feed.post/3k");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves handles through the given base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ did: "did:plc:abc" }));
    vi.stubGlobal("fetch", fetchMock);
    const uri = await resolveUri("https://bsky.app/profile/alice.test/post/3k", "https://proxy.example");
    expect(uri).toBe("at://did:plc:abc/app.bsky.feed.post/3k");
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toMatch(/^https:\/\/proxy\.example\/xrpc\/com\.atproto\.identity\.resolveHandle\?/);
    expect(url).toContain("handle=alice.test");
  });
});

describe("fetchThread", () => {
  it("fetches from the public API by default, depth 6, without credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ thread: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchThread("at://did:plc:abc/app.bsky.feed.post/3k");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/^https:\/\/public\.api\.bsky\.app\/xrpc\/app\.bsky\.feed\.getPostThread\?/);
    expect(String(url)).toContain("depth=6");
    expect(init).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });
  });

  it("uses the endpoint with trailing slashes stripped", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ thread: {} }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchThread("at://did:plc:abc/app.bsky.feed.post/3k", {
      endpoint: "https://comments.example.com//",
      depth: 2,
    });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toMatch(/^https:\/\/comments\.example\.com\/xrpc\//);
    expect(url).toContain("depth=2");
  });

  it("throws when the API responds non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await expect(fetchThread("at://did:plc:abc/app.bsky.feed.post/3k")).rejects.toThrow(/responded 502/);
  });
});
