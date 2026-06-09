import type { RawThreadResponse } from "./types";

const DIRECT_BASE = "https://public.api.bsky.app";

export interface ThreadOptions {
  // Proxy base URL. When set, requests go here instead of straight to Bluesky,
  // so a reader's IP never reaches Bluesky. The proxy mirrors the two XRPC read
  // endpoints used below.
  endpoint?: string;
  depth?: number;
}

export interface PostRef {
  actor: string; // handle or DID
  rkey: string;
}

export function parsePostRef(input: string): PostRef {
  const at = input.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)/);
  if (at) return { actor: at[1], rkey: at[2] };
  const web = input.match(/profile\/([^/]+)\/post\/([^/?#]+)/);
  if (web) return { actor: web[1], rkey: web[2] };
  throw new Error(`Not a Bluesky post reference: ${input}`);
}

function get(base: string, nsid: string, params: Record<string, string>): Promise<unknown> {
  const url = `${base}/xrpc/${nsid}?${new URLSearchParams(params)}`;
  return fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" }).then((res) => {
    if (!res.ok) throw new Error(`${nsid} responded ${res.status}`);
    return res.json();
  });
}

// getPostThread wants an at:// URI. A web URL may carry a handle, which has to
// be resolved to a DID first.
export async function resolveUri(input: string, base: string): Promise<string> {
  const { actor, rkey } = parsePostRef(input);
  if (actor.startsWith("did:")) return `at://${actor}/app.bsky.feed.post/${rkey}`;
  const data = (await get(base, "com.atproto.identity.resolveHandle", { handle: actor })) as { did: string };
  return `at://${data.did}/app.bsky.feed.post/${rkey}`;
}

export async function fetchThread(input: string, opts: ThreadOptions = {}): Promise<RawThreadResponse> {
  const base = opts.endpoint ? opts.endpoint.replace(/\/+$/, "") : DIRECT_BASE;
  const uri = await resolveUri(input, base);
  return get(base, "app.bsky.feed.getPostThread", {
    uri,
    depth: String(opts.depth ?? 6),
  }) as Promise<RawThreadResponse>;
}
