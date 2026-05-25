import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';
import { PROJECTS, Project } from '../../projects.config';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgFor, NgSwitch, NgSwitchCase],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  readonly projects: Project[] = PROJECTS;

  get activeProjects(): Project[] {
    return this.projects.filter(p => p.enabled);
  }

  skills = [
    'Python', 'TypeScript', 'Angular',
    'AWS', 'GCP', 'Terraform', 'Async Thinking',
    'FastAPI', 'Flask', 'MongoDB', 'Docker',
    'C / C++', 'Git', 'CI/CD', 'AI Tools'
  ];
}
