// src/app/components/blog-list/blog-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BlogPost } from '../../models/blog-post.model';
import { BlogService } from '../../services/blog.service';

@Component({
  selector: 'app-blog-list',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './blog-list.component.html',
  styleUrls: ['./blog-list.component.scss'],
})
export class BlogListComponent implements OnInit {
  blogPosts: BlogPost[] = [];
  filteredPosts: BlogPost[] = [];
  searchTerm: string = '';
  selectedTag: string = '';

  constructor(
    private blogService: BlogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBlogPosts();
  }

  loadBlogPosts(): void {
    this.blogService.getAllPosts().subscribe(posts => {
      this.blogPosts = posts;
      this.filteredPosts = posts;
    });
  }

  onSearchChange(): void {
    this.filterPosts();
  }

  onTagSelect(tag: string): void {
    this.selectedTag = this.selectedTag === tag ? '' : tag;
    this.filterPosts();
  }

  filterPosts(): void {
    this.filteredPosts = this.blogPosts.filter(post => {
      const matchesSearch = !this.searchTerm ||
        post.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesTag = !this.selectedTag ||
        post.tags.some(tag => tag.toLowerCase() === this.selectedTag.toLowerCase());

      return matchesSearch && matchesTag;
    });
  }

  navigateToPost(slug: string): void {
    this.router.navigate(['/blog', slug]);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
