// src/app/services/blog.service.ts - Simplified Version
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, map } from 'rxjs';
import { BlogPost, BlogAuthor } from '../models/blog-post.model';


@Injectable({
  providedIn: 'root'
})
export class BlogService {

  private postsMetadata = [
    {
      slug: 'welcome-to-my-personal-blog',
      title: 'Welcome',
      excerpt: 'A brief introduction to my journey and what you can expect from this blog.',
      publishedDate: '2025-01-02',
      tags: ['welcome', 'introduction', 'blogging'],
      readTime: 2,
      author: 'Jose V'
    },
    {
      slug: 'getting-started-with-angular',
      title: 'Angular Basics',
      excerpt: 'My journey learning Angular and tips for beginners.',
      publishedDate: '2025-03-03',
      tags: ['angular', 'web-development', 'tutorial'],
      readTime: 5,
      author: 'Jose V'
    }
  ];

  private postsAuthors: [BlogAuthor] = [
    {
      name: 'Jose V',
      about: 'Learning and exploration passionate.',
    },
  ];

  constructor(private http: HttpClient) {}

  private loadMarkdownContent(slug: string): Observable<string> {
    return this.http.get(`/assets/blog-posts/${slug}.md`, { responseType: 'text' });
  }

  getAllPosts(): Observable<BlogPost[]> {
    const postObservables = this.postsMetadata.map(metadata =>
      this.loadMarkdownContent(metadata.slug).pipe(
        map(content => ({
          ...metadata,
          id: metadata.slug,
          content: content
        } as BlogPost))
      )
    );
    return forkJoin(postObservables);
  }

  getPostBySlug(slug: string): Observable<BlogPost | undefined> {
    const metadata = this.postsMetadata.find(post => post.slug === slug);
    if (!metadata) {
      return of(undefined);
    }

    return this.loadMarkdownContent(slug).pipe(
      map(content => ({
        ...metadata,
        id: metadata.slug,
        content: content
      } as BlogPost))
    );
  }

  getPostsByTag(tag: string): Observable<BlogPost[]> {
    return this.getAllPosts().pipe(
      map(posts => posts.filter(post =>
        post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      ))
    );
  }

  getRecentPosts(limit: number = 3): Observable<BlogPost[]> {
    return this.getAllPosts().pipe(
      map(posts => [...posts]
        .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
        .slice(0, limit)
      )
    );
  }

  getTags(): Observable<string[]> {
    const allTags = this.postsMetadata.flatMap(post => post.tags);
    return of([...new Set(allTags)]);
  }

  getAuthor(authorName: string): BlogAuthor {
    const metadata = this.postsAuthors.find(
      author => author.name === authorName
    )
    return metadata ? {...metadata} as BlogAuthor : { name: authorName, about: '' };
  }

}
