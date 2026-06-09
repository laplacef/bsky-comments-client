import { fetchThread } from "./api";
import { normalizeThread } from "./normalize";
import { renderThread } from "./render";
import type { Comment } from "./types";

const CLS = "bsky-comments";

type Trigger = "button" | "auto" | "visible";
type Sort = "likes" | "newest" | "oldest";

function sortComments(comments: Comment[], by: Sort): Comment[] {
  const rank = (a: Comment, b: Comment): number => {
    if (by === "likes") return b.likeCount - a.likeCount;
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return by === "oldest" ? ta - tb : tb - ta;
  };
  const out = [...comments].sort(rank);
  for (const c of out) c.replies = sortComments(c.replies, by);
  return out;
}

export class BskyComments extends HTMLElement {
  static observedAttributes = ["post", "endpoint", "trigger", "sort", "depth"];

  private loaded = false;
  private observer: IntersectionObserver | null = null;

  connectedCallback(): void {
    this.paint();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.loaded = false;
      this.paint();
    }
  }

  private get trigger(): Trigger {
    const t = this.getAttribute("trigger");
    return t === "auto" || t === "visible" ? t : "button";
  }

  private get sortOrder(): Sort {
    const s = this.getAttribute("sort");
    return s === "newest" || s === "oldest" ? s : "likes";
  }

  private paint(): void {
    this.observer?.disconnect();
    this.replaceChildren();
    this.classList.add(`${CLS}__root`);
    if (!this.getAttribute("post")) return;

    const thread = document.createElement("div");
    thread.className = `${CLS}__thread`;
    this.append(thread);

    if (this.trigger === "auto") {
      void this.load();
    } else if (this.trigger === "visible") {
      this.observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.observer?.disconnect();
          void this.load();
        }
      });
      this.observer.observe(this);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${CLS}__load`;
      button.textContent = "Load comments";
      button.addEventListener("click", () => void this.load());
      this.append(button);
    }
  }

  private setStatus(message: string): void {
    let el = this.querySelector<HTMLParagraphElement>(`.${CLS}__status`);
    if (message === "") {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("p");
      el.className = `${CLS}__status`;
      el.setAttribute("role", "status");
      this.append(el);
    }
    el.textContent = message;
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    const post = this.getAttribute("post");
    if (!post) return;
    const endpoint = this.getAttribute("endpoint") ?? undefined;
    const parsedDepth = Number(this.getAttribute("depth"));
    const depth = Number.isFinite(parsedDepth) && parsedDepth > 0 ? parsedDepth : undefined;
    const thread = this.querySelector(`.${CLS}__thread`);

    this.querySelector(`.${CLS}__load`)?.remove();
    this.setStatus("Loading comments…");

    try {
      const data = await fetchThread(post, { endpoint, depth });
      const comments = sortComments(normalizeThread(data.thread), this.sortOrder);
      this.setStatus("");
      if (!thread) return;
      thread.append(this.replyLink(post, "Reply on Bluesky"));
      if (comments.length === 0) {
        const empty = document.createElement("p");
        empty.className = `${CLS}__empty`;
        empty.textContent = "No comments yet.";
        thread.append(empty);
      } else {
        thread.append(renderThread(comments));
      }
    } catch {
      this.setStatus("Comments are unavailable right now.");
      thread?.append(this.replyLink(post, "View discussion on Bluesky"));
    }
  }

  private replyLink(href: string, text: string): HTMLAnchorElement {
    const a = document.createElement("a");
    a.href = href;
    a.className = `${CLS}__reply`;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.referrerPolicy = "no-referrer";
    return a;
  }
}
