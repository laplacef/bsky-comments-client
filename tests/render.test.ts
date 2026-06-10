// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderThread } from "../src/render";
import type { Comment } from "../src/types";

function comment(over: Partial<Comment> = {}): Comment {
  return {
    uri: "at://did:plc:abc/app.bsky.feed.post/3kxyz",
    cid: "bafyexample",
    author: {
      did: "did:plc:abc",
      handle: "alice.test",
      displayName: "Alice",
      url: "https://bsky.app/profile/alice.test",
    },
    text: "",
    spans: [],
    likeCount: 2,
    replyCount: 0,
    url: "https://bsky.app/profile/alice.test/post/3kxyz",
    replies: [],
    ...over,
  };
}

describe("renderThread", () => {
  it("renders http(s) span links as guarded anchors", () => {
    const list = renderThread([
      comment({ spans: [{ text: "a link", href: "https://example.com/x" }] }),
    ]);
    const a = list.querySelector(".bsky-comments__link");
    expect(a).not.toBeNull();
    expect(a?.getAttribute("href")).toBe("https://example.com/x");
    expect(a?.textContent).toBe("a link");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer nofollow ugc");
    expect(a?.getAttribute("target")).toBe("_blank");
  });

  it("renders non-http(s) hrefs as plain text, never anchors", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "vbscript:x"]) {
      const list = renderThread([comment({ spans: [{ text: "payload", href }] })]);
      expect(list.querySelector(".bsky-comments__link"), href).toBeNull();
      expect(list.querySelector(".bsky-comments__body")?.textContent).toBe("payload");
    }
  });

  it("renders text content as text nodes, not markup", () => {
    const list = renderThread([comment({ spans: [{ text: "<img src=x onerror=alert(1)>" }] })]);
    expect(list.querySelector(".bsky-comments__body img")).toBeNull();
    expect(list.querySelector(".bsky-comments__body")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("renders the avatar only when present", () => {
    const withAvatar = renderThread([
      comment({ author: { ...comment().author, avatar: "https://proxy.example/avatar/img/avatar/plain/d/c" } }),
    ]);
    const img = withAvatar.querySelector(".bsky-comments__avatar");
    expect(img?.getAttribute("src")).toBe("https://proxy.example/avatar/img/avatar/plain/d/c");
    expect(img?.getAttribute("alt")).toBe("");

    const without = renderThread([comment()]);
    expect(without.querySelector(".bsky-comments__avatar")).toBeNull();
  });

  it("renders the posted date as a time element linking to the post", () => {
    const list = renderThread([comment({ createdAt: "2026-06-01T12:00:00.000Z" })]);
    const time = list.querySelector(".bsky-comments__date time");
    expect(time?.getAttribute("datetime")).toBe("2026-06-01T12:00:00.000Z");
    expect(list.querySelector(".bsky-comments__date")?.getAttribute("href")).toBe(comment().url);

    const undated = renderThread([comment()]);
    expect(undated.querySelector(".bsky-comments__date")).toBeNull();
  });

  it("nests replies as sublists", () => {
    const list = renderThread([comment({ replies: [comment({ text: "child" })] })]);
    expect(list.querySelectorAll(".bsky-comments__comment")).toHaveLength(2);
    expect(list.querySelector(".bsky-comments__replies .bsky-comments__comment")).not.toBeNull();
  });
});
