import { Component, OnDestroy } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { StressService, StreamMeta } from '../../services/stress.service';

interface Band {
  id: string;
  label: string;
  hz: string;
  goal: string;
  description: string;
  centerHz: number;  // waypoint sent to backend
}

type SessionState = 'idle' | 'loading' | 'playing' | 'error';

// Chunks accumulated before creating one AudioBufferSourceNode
// which means fewer active nodes in the audio graph, less scheduler pressure.
// 100 chunks × 4096 frames / 44100 Hz ≈ 9.3 s per node.
const SCHED_BATCH_CHUNKS = 100;

@Component({
  selector: 'app-stress',
  imports: [NgFor, NgIf],
  templateUrl: './stress.component.html',
  styleUrl: './stress.component.scss'
})
export class StressComponent implements OnDestroy {

  readonly bands: Band[] = [
    {
      id: 'delta',
      label: 'Delta',
      hz: '0.5 – 4 Hz',
      goal: 'Deep sleep',
      description: 'The slowest brainwaves. Promotes deep, restorative sleep and cellular repair.',
      centerHz: 2,
    },
    {
      id: 'theta',
      label: 'Theta',
      hz: '4 – 8 Hz',
      goal: 'Meditation',
      description: 'Linked to REM sleep, deep meditation, and moments of creative insight.',
      centerHz: 6,
    },
    {
      id: 'alpha',
      label: 'Alpha',
      hz: '8 – 14 Hz',
      goal: 'Relaxed focus',
      description: 'Calm alertness. Ideal for unwinding, light meditation, and stress reduction.',
      centerHz: 10,
    },
    {
      id: 'beta',
      label: 'Beta',
      hz: '14 – 30 Hz',
      goal: 'Concentration',
      description: 'Active, engaged thinking. Supports focus, problem-solving, and sustained attention.',
      centerHz: 20,
    },
    {
      id: 'gamma',
      label: 'Gamma',
      hz: '30 – 100 Hz',
      goal: 'Peak cognition',
      description: 'High-frequency bursts associated with peak mental performance and sensory binding.',
      centerHz: 40,
    },
  ];

  readonly durations = [5, 15, 30, 60];

  selectedBand     = 'alpha';
  selectedDuration = 15;

  state: SessionState = 'idle';
  errorMessage = '';
  isPlaying    = false;
  volume       = 0.8;

  activeBand:     Band | null = null;
  activeDuration: number      = 0;

  private audioCtx:       AudioContext | null          = null;
  private gainNode:       GainNode | null              = null;
  private scheduledUntil  = 0;
  private lastNode:       AudioBufferSourceNode | null = null;
  private streamSub:      Subscription | null          = null;
  private streamMeta:     StreamMeta | null            = null;
  private schedBatch:     Float32Array[]               = [];

  constructor(private stressService: StressService) {}

  // ── Session generation ────────────────────────────────────────────────────

  generate(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx   = null;
      this.gainNode   = null;
    }
    this.isPlaying      = false;
    this.scheduledUntil = 0;
    this.lastNode       = null;
    this.streamMeta     = null;
    this.schedBatch     = [];

    this.state        = 'loading';
    this.errorMessage = '';

    const band = this.bands.find(b => b.id === this.selectedBand)!;
    this.activeBand     = band;
    this.activeDuration = this.selectedDuration;

    this.streamSub = this.stressService.stream({
      // carrier_hz, segments_pct, movements, factors, volume, fade, sample_rate, bit_depth
      waypoints: [band.centerHz],
      duration: this.selectedDuration * 60,
    }).subscribe({
      next: (event) => {
        if (event.type === 'meta') {
          this.streamMeta = event.meta;
          // AudioContext created here so sampleRate comes from the server,
          // avoiding per-chunk resampling at chunk boundaries.
          this.audioCtx = new AudioContext({ sampleRate: event.meta.sample_rate });
          this.gainNode = this.audioCtx.createGain();
          this.gainNode.gain.value = this.volume;
          this.gainNode.connect(this.audioCtx.destination);
          // Chrome/Edge suspend AudioContext on focus loss or tab hide.
          // Auto-resume keeps audio playing when the user moves to another window.
          this.audioCtx.addEventListener('statechange', () => {
            if (this.audioCtx?.state === 'suspended' && this.isPlaying) {
              this.audioCtx.resume();
            }
          });

        } else if (event.type === 'chunk' && this.audioCtx && this.gainNode) {
          this.schedBatch.push(event.data);
          if (this.schedBatch.length >= SCHED_BATCH_CHUNKS) {
            this.flushScheduleBatch();
          }

        } else if (event.type === 'end') {
          if (this.schedBatch.length > 0) this.flushScheduleBatch();
          if (this.lastNode) {
            const last = this.lastNode;
            last.onended = () => {
              if (this.state === 'playing') {
                this.state    = 'idle';
                this.isPlaying = false;
              }
            };
          }
        }
      },
      error: () => {
        this.errorMessage = 'Could not reach the audio backend. Make sure the backend is running on localhost:8000.';
        this.state = 'error';
      },
    });
  }

  // Merges all buffered chunks into one AudioBuffer and schedules it.
  // Batching reduces active AudioBufferSourceNode count from ~64 to ~7
  // for a 6-second pull buffer, cutting audio-graph scheduler pressure.
  private flushScheduleBatch(): void {
    const meta   = this.streamMeta!;
    const chunks = this.schedBatch.splice(0);

    const totalFrames = chunks.reduce((sum, c) => sum + c.length, 0) / meta.channels;
    const buf = this.audioCtx!.createBuffer(meta.channels, totalFrames, meta.sample_rate);

    let frameOffset = 0;
    for (const chunk of chunks) {
      const framesInChunk = chunk.length / meta.channels;
      for (let c = 0; c < meta.channels; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < framesInChunk; i++) {
          ch[frameOffset + i] = chunk[i * meta.channels + c];
        }
      }
      frameOffset += framesInChunk;
    }

    const node = this.audioCtx!.createBufferSource();
    node.buffer = buf;
    node.connect(this.gainNode!);

    const now = this.audioCtx!.currentTime;
    if (this.scheduledUntil < now) this.scheduledUntil = now;
    node.start(this.scheduledUntil);
    this.scheduledUntil += buf.duration;
    this.lastNode = node;

    if (this.state === 'loading') {
      this.state    = 'playing';
      this.isPlaying = true;
    }
  }

  reset(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
      this.gainNode = null;
    }
    this.isPlaying      = false;
    this.scheduledUntil = 0;
    this.lastNode       = null;
    this.schedBatch     = [];   // Just holds the chunks until certain ammount arrived so `flushScheduleBatch` can be executed leading better audio response (Less pressure)
    this.streamMeta     = null; // Used to track metadata within this component, and that way `flushScheduleBatch` is able to obtain that initially received metadata from the backend

    this.state          = 'idle';
    this.errorMessage   = '';
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  togglePlay(): void {
    if (!this.audioCtx) return;
    if (this.isPlaying) {
      this.audioCtx.suspend();
      this.isPlaying = false;
    } else {
      this.audioCtx.resume();
      this.isPlaying = true;
    }
  }

  onVolumeChange(event: Event): void {
    this.volume = +(event.target as HTMLInputElement).value;
    if (this.gainNode) this.gainNode.gain.value = this.volume;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  durationLabel(d: number): string {
    return d === 60 ? '1 hour' : `${d} min`;
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
    this.audioCtx?.close();
  }
}
