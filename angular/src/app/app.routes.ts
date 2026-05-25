import { Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { BlogListComponent } from './components/blog-list/blog-list.component';
import { BlogPostComponent } from './components/blog-post/blog-post.component';
import { QrComponent } from './components/qr/qr.component';
import { StressComponent } from './components/stress/stress.component';
import { projectEnabledGuard } from './guards/project-enabled.guard';

export const routes: Routes = [
  { path: '',           component: HomeComponent },
  { path: 'blog',       component: BlogListComponent, canActivate: [projectEnabledGuard] },
  { path: 'blog/:slug', component: BlogPostComponent, canActivate: [projectEnabledGuard] },
  { path: 'qr',         component: QrComponent,       canActivate: [projectEnabledGuard] },
  { path: 'stress',     component: StressComponent,   canActivate: [projectEnabledGuard] },
  { path: '**',         redirectTo: '/' },
];
