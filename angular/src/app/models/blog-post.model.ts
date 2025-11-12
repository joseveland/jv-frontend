// src/app/models/blog-post.model.ts
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  publishedDate: string;
  lastUpdated?: string;
  tags: string[];
  readTime: number;
  featuredImage?: string;
  author: string;
  slug: string;
}

export interface BlogAuthor {
  name: string;
  about: string;
}
