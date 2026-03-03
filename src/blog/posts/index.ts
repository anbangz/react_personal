import { BlogPost } from "../types";

import welcomeContent from "./welcome.md";
import trustButVerifyContent from "./the-end-of-trust-but-verify.md";

import portraitImg from "../../static/images/portrait.jpg";
import scoutImg from "../../static/images/amazon-scout.jpg";

// To add a new text post:
//   1. Create src/blog/posts/my-post.md
//   2. Import it here: import myPostContent from './my-post.md';
//   3. Add an entry below with type: 'text' and content: myPostContent

// To add a new photo post:
//   1. Add the image to src/static/images/
//   2. Import it here: import myPhoto from '../../static/images/my-photo.jpg';
//   3. Add an entry below with type: 'photo', imageSrc: myPhoto, and optionally a .md file for caption text

export const blogPosts: BlogPost[] = [
  {
    id: "the-end-of-trust-but-verify",
    title: 'The end of "Trust, but Verify"',
    date: "2026-03-02",
    type: "text" as const,
    content: trustButVerifyContent,
  },
  {
    id: "welcome",
    title: "Welcome",
    date: "2026-02-28",
    type: "text" as const,
    content: welcomeContent,
  },
  {
    id: "photo-placeholder-1",
    title: "Rome",
    date: "2026-03-01",
    type: "photo" as const,
    content: "",
    imageSrc: portraitImg,
    caption: "Placeholder — replace with a real photo",
  },
  {
    id: "photo-placeholder-2",
    title: "Scout",
    date: "2026-03-02",
    type: "photo" as const,
    content: "",
    imageSrc: scoutImg,
    caption: "Placeholder — replace with a real photo",
  },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
