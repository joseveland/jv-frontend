import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GenerateRequest {
  band: string;
  carrier: string;
  duration_minutes: number;
}

@Injectable({ providedIn: 'root' })
export class StressService {
  // TODO: set to backend base URL before deploying, e.g. https://api.yourdomain.com
  private readonly apiUrl = '';

  constructor(private http: HttpClient) {}

  generate(req: GenerateRequest): Observable<ArrayBuffer> {
    return this.http.post(`${this.apiUrl}/generate`, req, { responseType: 'arraybuffer' });
  }
}
