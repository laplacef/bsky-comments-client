// Raw shapes from the AT Protocol XRPC responses. Only the fields we read.

export interface RawAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface RawFacetFeature {
  $type: string;
  uri?: string;
  did?: string;
  tag?: string;
}

export interface RawFacet {
  index: { byteStart: number; byteEnd: number };
  features: RawFacetFeature[];
}

export interface RawRecord {
  text?: string;
  facets?: RawFacet[];
  createdAt?: string;
}

export interface RawPost {
  uri: string;
  cid: string;
  author: RawAuthor;
  record?: RawRecord;
  replyCount?: number;
  likeCount?: number;
}

export interface RawThreadNode {
  $type?: string;
  post?: RawPost;
  replies?: RawThreadNode[];
}

export interface RawThreadResponse {
  thread: RawThreadNode;
}

// Normalized shapes the renderer consumes.

export interface Span {
  text: string;
  href?: string;
}

export interface Author {
  did: string;
  handle: string;
  displayName: string;
  avatar?: string;
  url: string;
}

export interface Comment {
  uri: string;
  cid: string;
  author: Author;
  text: string;
  spans: Span[];
  createdAt?: string;
  likeCount: number;
  replyCount: number;
  url: string;
  replies: Comment[];
}
