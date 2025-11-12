// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { BlogListComponent } from './components/blog-list/blog-list.component';
import { BlogPostComponent } from './components/blog-post/blog-post.component';

export const routes: Routes = [
  { path: '', redirectTo: '/blog', pathMatch: 'full', },
  { path: 'blog', component: BlogListComponent, },
  { path: 'blog/:slug', component: BlogPostComponent, },
  // { path: 'about', component: ..., },
  // { path: 'contact', component: ..., },
  { path: '**', redirectTo: '/blog' },
];
