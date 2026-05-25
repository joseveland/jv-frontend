import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PROJECTS } from '../projects.config';

export const projectEnabledGuard: CanActivateFn = (route) => {
  const path = '/' + route.url.map(s => s.path).join('/');
  const project = PROJECTS.find(p => path === p.link || path.startsWith(p.link + '/'));

  if (project && !project.enabled) {
    return inject(Router).createUrlTree(['/']);
  }
  return true;
};
