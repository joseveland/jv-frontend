import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Backend contract — class GenerateRequest(BaseModel) in the FastAPI app.
// Fields sent today are marked (✓); the rest hit their backend defaults.
//
//   carrier_hz:    float  = 220.0   — carrier tone frequency in Hz
//   waypoints:     float[]          — binaural beat Hz per segment          (✓)
//   duration:      float            — total session length in SECONDS, ≤3600 (✓)
//   segments_pct:  float[]  = []   — relative length of each waypoint segment
//   movements:     str[]    = []   — envelope shape per segment (e.g. "linear")
//   factors:       float[]  = []   — intensity factor per segment
//   volume:        float    = 80.0 — output gain 0–100
//   fade:          bool     = true — fade-in / fade-out
//   sample_rate:   int      = 44100
//   bit_depth:     str      = "PCM_16"  — "PCM_16" | "PCM_24" | "FLOAT"
export interface StreamRequest {
  waypoints: number[];   // [centerHz] — single-element for now
  duration: number;      // seconds
}

export interface StreamMeta {
  sample_rate:  number;
  channels:     number;
  total_frames: number;
  chunk_frames: number;  // frames per binary chunk (e.g. 4096)
}

// Wire protocol (pull-based):
//   1. Client → Server  JSON  GenerateRequest
//   2. Server → Client  JSON  { type:"meta", sample_rate, channels, total_frames, chunk_frames }
//   3. Client → Server  JSON  { type:"next", count:N }   ← pull N chunks
//   4. Server → Client  binary × N                       ← interleaved float32 PCM, no header
//      Steps 3-4 repeat until done.
//   5. Server → Client  JSON  { type:"end" }             ← no more chunks
//   Client may also send { type:"stop" } at any time to abort.
export type StreamEvent =
  | { type: 'meta';  meta: StreamMeta }
  | { type: 'chunk'; data: Float32Array }
  | { type: 'end' };

// Seconds of audio to keep buffered ahead of the playhead.
const TARGET_BUFFER_S = 6;

@Injectable({ providedIn: 'root' })
export class StressService {
  private readonly wsUrl = 'ws://localhost:8000/stream';

  stream(req: StreamRequest): Observable<StreamEvent> {
    return new Observable(observer => {
      const ws = new WebSocket(this.wsUrl);
      ws.binaryType = 'arraybuffer';

      let pending = 0;   // chunks requested but not yet received
      let batch   = 0;   // computed once from meta
      let done    = false;

      const pull = (count: number) => {
        if (done || ws.readyState !== WebSocket.OPEN) return;
        pending += count;
        ws.send(JSON.stringify({ type: 'next', count }));
      };

      ws.onopen = () => ws.send(JSON.stringify(req));

      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          const msg = JSON.parse(ev.data);

          if (msg.type === 'meta') {
            const meta: StreamMeta = {
              sample_rate:  msg.sample_rate,
              channels:     msg.channels,
              total_frames: msg.total_frames,
              chunk_frames: msg.chunk_frames,
            };
            observer.next({ type: 'meta', meta });
            // Compute batch size to cover TARGET_BUFFER_S seconds, minimum 4 chunks
            const chunkDuration = meta.chunk_frames / meta.sample_rate;
            batch = Math.max(4, Math.ceil(TARGET_BUFFER_S / chunkDuration));
            pull(batch);

          } else if (msg.type === 'end') {
            done = true;
            observer.next({ type: 'end' });
            observer.complete();
          }

        } else {
          pending--;
          observer.next({ type: 'chunk', data: new Float32Array(ev.data as ArrayBuffer) });
          // Refill when in-flight drops below half the batch so the audio buffer
          // never drains while waiting for the next pull to come back.
          if (!done && pending < Math.floor(batch / 2)) pull(batch - pending);
        }
      };

      ws.onerror = () => observer.error(new Error('WebSocket connection failed'));

      ws.onclose = (ev) => {
        if (!ev.wasClean && !observer.closed) {
          observer.error(new Error('WebSocket closed unexpectedly'));
        }
      };

      return () => {
        done = true;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'stop' }));
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    });
  }
}
