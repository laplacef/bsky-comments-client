import { describe, expect, it } from "vitest";
import { normalizeThread, resolveSpans } from "../src/normalize";
import type { RawThreadNode } from "../src/types";

function linkFacet(byteStart: number, byteEnd: number, uri: string) {
  return {
    index: { byteStart, byteEnd },
    features: [{ $type: "app.bsky.richtext.facet#link", uri }],
  };
}

describe("resolveSpans", () => {
  it("returns the whole text when there are no facets", () => {
    expect(resolveSpans({ text: "plain" })).toEqual([{ text: "plain" }]);
    expect(resolveSpans({ text: "" })).toEqual([]);
    expect(resolveSpans({})).toEqual([]);
  });

  it("splits text around a link facet", () => {
    const text = "see https://example.com now";
    const spans = resolveSpans({ text, facets: [linkFacet(4, 23, "https://example.com")] });
    expect(spans).toEqual([
      { text: "see " },
      { text: "https://example.com", href: "https://example.com" },
      { text: " now" },
    ]);
  });

  it("treats facet ranges as UTF-8 byte offsets, not string indices", () => {
    // "🦋 " is five bytes (four for the emoji, one for the space), so the
    // facet starts at byte 5 even though it starts at string index 3.
    const text = "🦋 https://bsky.app";
    const spans = resolveSpans({ text, facets: [linkFacet(5, 21, "https://bsky.app")] });
    expect(spans).toEqual([
      { text: "🦋 " },
      { text: "https://bsky.app", href: "https://bsky.app" },
    ]);
  });

  it("skips overlapping facets", () => {
    const text = "abcdefgh";
    const spans = resolveSpans({
      text,
      facets: [linkFacet(0, 4, "https://a.example"), linkFacet(2, 6, "https://b.example")],
    });
    expect(spans).toEqual([
      { text: "abcd", href: "https://a.example" },
      { text: "efgh" },
    ]);
  });

  it("ignores facets without features", () => {
    const spans = resolveSpans({
      text: "abc",
      facets: [{ index: { byteStart: 0, byteEnd: 2 }, features: [] }],
    });
    expect(spans).toEqual([{ text: "abc" }]);
  });

  it("builds profile links for mentions and hashtag links for tags", () => {
    const text = "@alice #tag";
    const spans = resolveSpans({
      text,
      facets: [
        {
          index: { byteStart: 0, byteEnd: 6 },
          features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:abc" }],
        },
        {
          index: { byteStart: 7, byteEnd: 11 },
          features: [{ $type: "app.bsky.richtext.facet#tag", tag: "tag" }],
        },
      ],
    });
    expect(spans[0]).toEqual({ text: "@alice", href: "https://bsky.app/profile/did:plc:abc" });
    expect(spans[2]).toEqual({ text: "#tag", href: "https://bsky.app/hashtag/tag" });
  });
});

function rawNode(text: string, replies: RawThreadNode[] = []): RawThreadNode {
  return {
    post: {
      uri: "at://did:plc:abc/app.bsky.feed.post/3kxyz",
      cid: "bafyexample",
      author: { did: "did:plc:abc", handle: "alice.test" },
      record: { text, createdAt: "2026-06-01T12:00:00.000Z" },
      likeCount: 3,
      replyCount: replies.length,
    },
    replies,
  };
}

describe("normalizeThread", () => {
  it("maps replies to comments with URLs derived from handle and rkey", () => {
    const [comment] = normalizeThread({ post: rawNode("root").post, replies: [rawNode("hi")] });
    expect(comment).toMatchObject({
      text: "hi",
      likeCount: 3,
      url: "https://bsky.app/profile/alice.test/post/3kxyz",
      createdAt: "2026-06-01T12:00:00.000Z",
    });
    expect(comment?.author).toMatchObject({
      handle: "alice.test",
      displayName: "@alice.test",
      url: "https://bsky.app/profile/alice.test",
    });
  });

  it("drops blocked and not-found nodes, which carry no post", () => {
    const comments = normalizeThread({
      replies: [{ $type: "app.bsky.feed.defs#blockedPost" }, rawNode("kept")],
    });
    expect(comments).toHaveLength(1);
    expect(comments[0]?.text).toBe("kept");
  });

  it("recurses into nested replies", () => {
    const comments = normalizeThread({
      replies: [rawNode("parent", [rawNode("child", [rawNode("grandchild")])])],
    });
    expect(comments[0]?.replies[0]?.text).toBe("child");
    expect(comments[0]?.replies[0]?.replies[0]?.text).toBe("grandchild");
  });

  it("defaults counts to zero and text to empty", () => {
    const comments = normalizeThread({
      replies: [
        {
          post: {
            uri: "at://did:plc:abc/app.bsky.feed.post/3k",
            cid: "bafy",
            author: { did: "did:plc:abc", handle: "alice.test" },
          },
        },
      ],
    });
    expect(comments[0]).toMatchObject({ text: "", likeCount: 0, replyCount: 0, spans: [] });
  });
});
