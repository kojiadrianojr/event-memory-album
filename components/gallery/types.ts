export interface Reaction {
  id: string;
  postId: string;
  emoji: string;
  guestName: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface EventMoment {
  id: string;
  name: string;
  sortOrder: number;
}

export interface EventPrompt {
  id: string;
  text: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MediaAsset {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  width?: number | null;
  height?: number | null;
  type: "PHOTO" | "VIDEO" | "TEXT" | "AUDIO";
  sortOrder: number;
}

export interface FlatMediaItem {
  post: PostItem;
  media: MediaAsset;
  mediaIndex: number;
}

export interface PostItem {
  id: string;
  eventId: string;
  caption: string | null;
  uploaderName: string;
  takenAt: string | null;
  uploadedAt: string;
  momentId: string | null;
  promptId: string | null;
  moment: EventMoment | null;
  prompt: EventPrompt | null;
  media: MediaAsset[];
  reactions: Reaction[];
  comments: Comment[];
}

/** Primary media asset for single-item posts (text, audio, or first photo). */
export function primaryMedia(post: PostItem): MediaAsset | undefined {
  return post.media[0];
}

export function postDisplayType(post: PostItem): MediaAsset["type"] {
  return primaryMedia(post)?.type ?? "PHOTO";
}

export function isTextPost(post: PostItem): boolean {
  return postDisplayType(post) === "TEXT";
}

export function isAudioPost(post: PostItem): boolean {
  return postDisplayType(post) === "AUDIO";
}

export function isVideoPost(post: PostItem): boolean {
  const visual = post.media.filter(
    (m) => m.type === "PHOTO" || m.type === "VIDEO"
  );
  return visual.length > 0 && visual.every((m) => m.type === "VIDEO");
}

export function isVisualPost(post: PostItem): boolean {
  const type = postDisplayType(post);
  return type === "PHOTO" || type === "VIDEO";
}

export function flattenVisualMedia(posts: PostItem[]): FlatMediaItem[] {
  const items: FlatMediaItem[] = [];
  for (const post of posts) {
    post.media.forEach((media, mediaIndex) => {
      if ((media.type === "PHOTO" || media.type === "VIDEO") && media.url) {
        items.push({ post, media, mediaIndex });
      }
    });
  }
  return items;
}
