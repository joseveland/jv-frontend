import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { routes } from './app.routes';

import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';   // Represents that service for making HTTP requests

import { MarkdownModule } from 'ngx-markdown';
import { HttpClientModule } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),  // Routes out of the box already, configurable in `app.routes.ts`
    provideHttpClient(),    // `HttpClient` service (Using an external `rxjs` library under the hood)
    importProvidersFrom(HttpClientModule, MarkdownModule.forRoot()),
  ]
};
