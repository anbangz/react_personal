export type PostType = "text" | "photo";

export interface BlogPost {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  type: PostType;
  content: string; // raw markdown string imported from .md file
  imageSrc?: string; // only for type: 'photo'
  caption?: string; // optional subtitle shown below the photo
}
