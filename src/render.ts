import type { Comment, Span } from "./types";

const CLS = "bsky-comments";

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function link(href: string, text: string, extraRel = ""): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  a.target = "_blank";
  a.rel = extraRel ? `noopener noreferrer ${extraRel}` : "noopener noreferrer";
  a.referrerPolicy = "no-referrer";
  return a;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderSpans(parts: Span[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const part of parts) {
    // Only honour http(s) links; anything else stays plain text.
    if (part.href && /^https?:\/\//i.test(part.href)) {
      const a = link(part.href, part.text, "nofollow ugc");
      a.className = `${CLS}__link`;
      frag.append(a);
    } else {
      frag.append(part.text);
    }
  }
  return frag;
}

function renderComment(c: Comment): HTMLLIElement {
  const item = make("li", `${CLS}__comment`);

  const head = make("div", `${CLS}__head`);
  if (c.author.avatar) {
    const img = make("img", `${CLS}__avatar`);
    img.src = c.author.avatar;
    img.alt = "";
    img.width = 36;
    img.height = 36;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    head.append(img);
  }
  const name = link(c.author.url, c.author.displayName);
  name.className = `${CLS}__author`;
  const handle = make("span", `${CLS}__handle`);
  handle.textContent = `@${c.author.handle}`;
  head.append(name, handle);

  if (c.createdAt) {
    const when = document.createElement("a");
    when.href = c.url;
    when.className = `${CLS}__date`;
    when.target = "_blank";
    when.rel = "noopener noreferrer";
    when.referrerPolicy = "no-referrer";
    const time = document.createElement("time");
    time.dateTime = c.createdAt;
    time.textContent = formatDate(c.createdAt);
    when.append(time);
    head.append(when);
  }

  const body = make("div", `${CLS}__body`);
  body.append(renderSpans(c.spans));

  const meta = link(c.url, `${c.likeCount} likes · ${c.replyCount} replies`);
  meta.className = `${CLS}__meta`;

  item.append(head, body, meta);

  if (c.replies.length) {
    const sub = make("ul", `${CLS}__replies`);
    for (const reply of c.replies) sub.append(renderComment(reply));
    item.append(sub);
  }
  return item;
}

export function renderThread(comments: Comment[]): HTMLUListElement {
  const list = make("ul", `${CLS}__list`);
  for (const c of comments) list.append(renderComment(c));
  return list;
}
