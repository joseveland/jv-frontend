import { isDevMode } from '@angular/core';

export type ProjectIcon = 'book' | 'qr' | 'headphones';

export interface Project {
  title: string;
  summary: string;
  description: string;
  tags: string[];
  link: string;
  linkLabel: string;
  enabled: boolean;
  icon: ProjectIcon;
}

// Toggle `enabled` here to show/hide a project card on the home page
// and block direct navigation to its route.
export const PROJECTS: Project[] = [
  {
    title: 'Writings',
    summary: 'Blog posts open to any author',
    description: 'A space for thoughts, experiences, and technical knowledge — shared openly by anyone with something worth saying.',
    tags: ['Angular', 'TypeScript', 'AWS', 'CloudFront'],
    link: '/blog',
    linkLabel: 'Read posts',

    enabled: true,
    icon: 'book',
  },
  {
    title: 'QR',
    summary: 'Scan and generate QR codes',
    description: 'Decode any QR code from an image or your camera — or generate one from any text. Fully in-browser, no backend.',
    tags: ['Angular', 'TypeScript', 'Browser API'],
    link: '/qr',
    linkLabel: 'Try it',

    enabled: true,
    icon: 'qr',
  },
  {
    title: 'Stress Relief',
    summary: 'Binaural beat audio on demand',
    description: 'Binaural beat sessions generated on demand. Pick a brainwave target, a carrier sound, and a duration — the backend crafts a precision audio file for your headphones.',
    tags: ['Angular', 'TypeScript', 'Python', 'Audio API'],
    link: '/stress',
    linkLabel: 'Try it',

    enabled: isDevMode(), // Non prod yet
    icon: 'headphones',
  },
];
