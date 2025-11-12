// src/app/components/blog-post/blog-post.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogPost } from '../../models/blog-post.model';
import { BlogService } from '../../services/blog.service';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-blog-post',
  imports: [CommonModule, RouterModule, MarkdownModule],
  templateUrl: './blog-post.component.html',
  styleUrls: ['./blog-post.component.scss']
})
export class BlogPostComponent implements OnInit {
  post: BlogPost | undefined;
  recentPosts: BlogPost[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      this.loadPost(slug);
    });

    this.loadRecentPosts();
  }

  loadPost(slug: string): void {
    this.blogService.getPostBySlug(slug).subscribe(post => {
      if (!post) {
        this.router.navigate(['/404']);
        return;
      }
      this.post = post;
    });
  }

  loadRecentPosts(): void {
    this.blogService.getRecentPosts(3).subscribe(posts => {
      this.recentPosts = posts;
    });
  }

  goBack(): void {
    this.location.back();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  navigateToPost(slug: string): void {
    this.router.navigate(['/blog', slug]);
  }

  getAuthorAbout(authorName: string) {
    const author = this.blogService.getAuthor(authorName);
    return author.about;
  }

}
