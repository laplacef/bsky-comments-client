import { BskyComments } from "./element";

export { BskyComments } from "./element";
export { fetchThread, resolveUri, parsePostRef } from "./api";
export type { ThreadOptions, PostRef } from "./api";
export { normalizeThread, resolveSpans } from "./normalize";
export { renderThread } from "./render";
export type { Comment, Author, Span } from "./types";

if (typeof customElements !== "undefined" && !customElements.get("bsky-comments")) {
  customElements.define("bsky-comments", BskyComments);
}
