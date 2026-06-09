import type { Author, Comment, RawFacetFeature, RawPost, RawRecord, RawThreadNode, Span } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function featureHref(features: RawFacetFeature[]): string | undefined {
  for (const f of features) {
    if (f.$type === "app.bsky.richtext.facet#link" && f.uri) return f.uri;
    if (f.$type === "app.bsky.richtext.facet#mention" && f.did) return `https://bsky.app/profile/${f.did}`;
    if (f.$type === "app.bsky.richtext.facet#tag" && f.tag) return `https://bsky.app/hashtag/${encodeURIComponent(f.tag)}`;
  }
  return undefined;
}

// Facet ranges are UTF-8 byte offsets, not string indices, so slice the encoded
// bytes and decode each run back to text.
export function resolveSpans(record: RawRecord): Span[] {
  const text = record.text ?? "";
  const facets = (record.facets ?? []).filter((f) => f.index && f.features?.length);
  if (facets.length === 0) return text ? [{ text }] : [];

  const bytes = encoder.encode(text);
  const ordered = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  const spans: Span[] = [];
  let cursor = 0;

  for (const facet of ordered) {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart < cursor) continue; // skip overlapping facets
    if (byteStart > cursor) spans.push({ text: decoder.decode(bytes.slice(cursor, byteStart)) });
    const slice = decoder.decode(bytes.slice(byteStart, byteEnd));
    const href = featureHref(facet.features);
    spans.push(href ? { text: slice, href } : { text: slice });
    cursor = byteEnd;
  }
  if (cursor < bytes.length) spans.push({ text: decoder.decode(bytes.slice(cursor)) });
  return spans;
}

function toAuthor(raw: RawPost["author"]): Author {
  return {
    did: raw.did,
    handle: raw.handle,
    displayName: raw.displayName || `@${raw.handle}`,
    avatar: raw.avatar,
    url: `https://bsky.app/profile/${raw.handle || raw.did}`,
  };
}

// notFoundPost and blockedPost nodes carry no `post`; drop them.
function toComment(node: RawThreadNode): Comment | null {
  const post = node.post;
  if (!post) return null;
  const author = toAuthor(post.author);
  const rkey = post.uri.split("/").pop() ?? "";
  return {
    uri: post.uri,
    cid: post.cid,
    author,
    text: post.record?.text ?? "",
    spans: resolveSpans(post.record ?? {}),
    createdAt: post.record?.createdAt,
    likeCount: post.likeCount ?? 0,
    replyCount: post.replyCount ?? 0,
    url: `${author.url}/post/${rkey}`,
    replies: (node.replies ?? []).map(toComment).filter((c): c is Comment => c !== null),
  };
}

export function normalizeThread(root: RawThreadNode): Comment[] {
  return (root.replies ?? []).map(toComment).filter((c): c is Comment => c !== null);
}
