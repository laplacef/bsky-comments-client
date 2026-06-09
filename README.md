# bsky-comments-client

A zero-dependency web component that renders a [Bluesky](https://bsky.app) post's
replies as a comment thread on any website. It works on its own against Bluesky's
public API, and it can point at a self-hosted proxy so that a reader's IP address
never reaches Bluesky.

## Why

Most "Bluesky comments" widgets fetch the thread straight from the reader's
browser, which discloses every reader's IP to Bluesky. This component supports
that direct mode, but it also speaks to an optional proxy that mirrors the same
read endpoints. Point the component at your proxy and the browser only ever talks
to your origin. Same markup, one extra attribute.

The component ships no runtime dependencies, injects no inline styles, and builds
its DOM from text nodes, so it slots into a strict Content Security Policy.

## Install

From a CDN, pinned to a version and with Subresource Integrity:

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bsky-comments-client@0.1.0/dist/bsky-comments.css"
  integrity="sha384-…" crossorigin="anonymous">
<script type="module"
  src="https://cdn.jsdelivr.net/npm/bsky-comments-client@0.1.0/dist/bsky-comments.min.js"
  integrity="sha384-…" crossorigin="anonymous"></script>
```

> [!NOTE]
> Replace each `integrity` hash with the one published for the version you pin.
> Loading versionless or hash-less CDN URLs trusts the CDN not to alter the file.
> Under a strict CSP, self-hosting (below) avoids the third-party origin entirely
> and is the recommended path.

Or from npm, to self-host or bundle:

```sh
npm install bsky-comments-client
```

```js
import "bsky-comments-client";
```

The package also ships a minified IIFE build (`dist/bsky-comments.min.js`) for a
plain `<script>` tag, and the stylesheet at `bsky-comments-client/style.css`.

## Usage

Make a Bluesky post that links to your page, then drop its URL into the component:

```html
<bsky-comments post="https://bsky.app/profile/you.bsky.social/post/3abc..."></bsky-comments>
```

The post's replies become the comment thread. To comment, a reader replies to your
post on Bluesky.

### Direct vs proxy mode

Without an `endpoint`, the component fetches from `public.api.bsky.app` directly.
This needs no infrastructure, but each reader's browser contacts Bluesky.

```html
<!-- Direct: real-time, reveals the reader's IP to Bluesky -->
<bsky-comments post="..."></bsky-comments>

<!-- Proxy: real-time, reader's IP only reaches your origin -->
<bsky-comments post="..." endpoint="https://comments.example.com"></bsky-comments>
```

In proxy mode the component sends the same requests to `endpoint` instead. The
proxy is expected to mirror `com.atproto.identity.resolveHandle` and
`app.bsky.feed.getPostThread` under an `/xrpc/` path, cache the responses, and
rewrite avatar URLs to itself if you want avatars private too.

## Attributes

| Attribute  | Values                          | Default    | Description |
|------------|---------------------------------|------------|-------------|
| `post`     | Bluesky post URL or `at://` URI | (required) | The post whose replies are shown |
| `endpoint` | proxy base URL                  | (none)     | When set, requests go here instead of Bluesky |
| `trigger`  | `button`, `auto`, `visible`     | `button`   | When to fetch: on click, on load, or when scrolled into view |
| `sort`     | `likes`, `newest`, `oldest`     | `likes`    | Order of replies |
| `depth`    | integer                         | `6`        | How deep to fetch nested replies |

`button` is the default so that, in direct mode, a reader only contacts Bluesky if
they choose to load comments.

## Theming

The component renders into the light DOM with `bsky-comments__*` classes and reads
its colors from custom properties, so host CSS applies directly. Override any of:

```css
.bsky-comments__root {
  --bskyc-fg: #111;
  --bskyc-muted: #667;
  --bskyc-link: #0645ad;
  --bskyc-border: #e3e3e3;
  --bskyc-avatar-bg: #d9d9d9;
}
```

A `prefers-color-scheme: dark` block ships defaults for dark mode.

## Content Security Policy

The component needs no script or style relaxation (`script-src 'self'`,
`style-src 'self'`). It only adds a fetch origin and an image origin, which differ
by mode:

```
# Direct mode
connect-src https://public.api.bsky.app;
img-src https://cdn.bsky.app;

# Proxy mode (avatars mirrored by the proxy)
connect-src https://comments.example.com;
img-src 'self' https://comments.example.com;
```

## Privacy

- Requests are sent with `credentials: omit` and `referrerPolicy: no-referrer`.
- No cookies are set or read.
- Reply text is inserted as text nodes; rich-text links are resolved to `<a>`
  elements restricted to `http(s)` and marked `rel="nofollow ugc"`.
- In direct mode, avatars and the thread fetch contact Bluesky. In proxy mode,
  with a proxy that mirrors avatars, the browser contacts only your origin.

## Browser support

Any browser with custom elements, `fetch`, and `IntersectionObserver` (all
evergreen browsers). No polyfills are bundled.

## Building from source

```sh
npm install
npm run build      # esbuild bundles to dist/, tsc emits type declarations
npm run typecheck
```

Open `examples/index.html` through a local static server to try it against a live
post.

## License

MIT, © 2026 Francisco Laplace. See [LICENSE](./LICENSE).
