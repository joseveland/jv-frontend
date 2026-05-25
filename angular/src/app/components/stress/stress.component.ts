import { Component, OnDestroy } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { StressService } from '../../services/stress.service';

interface Band {
  id: string;
  label: string;
  hz: string;
  goal: string;
  description: string;
}

interface Carrier {
  id: string;
  label: string;
}

type SessionState = 'idle' | 'generating' | 'ready' | 'error';

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
    },
    {
      id: 'theta',
      label: 'Theta',
      hz: '4 – 8 Hz',
      goal: 'Meditation',
      description: 'Linked to REM sleep, deep meditation, and moments of creative insight.',
    },
    {
      id: 'alpha',
      label: 'Alpha',
      hz: '8 – 14 Hz',
      goal: 'Relaxed focus',
      description: 'Calm alertness. Ideal for unwinding, light meditation, and stress reduction.',
    },
    {
      id: 'beta',
      label: 'Beta',
      hz: '14 – 30 Hz',
      goal: 'Concentration',
      description: 'Active, engaged thinking. Supports focus, problem-solving, and sustained attention.',
    },
    {
      id: 'gamma',
      label: 'Gamma',
      hz: '30 – 100 Hz',
      goal: 'Peak cognition',
      description: 'High-frequency bursts associated with peak mental performance and sensory binding.',
    },
  ];

  readonly carriers: Carrier[] = [
    { id: 'none',        label: 'Pure tone'   },
    { id: 'white-noise', label: 'White noise' },
    { id: 'pink-noise',  label: 'Pink noise'  },
    { id: 'brown-noise', label: 'Brown noise' },
    { id: 'rain',        label: 'Rain'        },
    { id: 'ocean',       label: 'Ocean'       },
    { id: 'forest',      label: 'Forest'      },
  ];

  readonly durations = [5, 15, 30, 60];

  selectedBand     = 'alpha';
  selectedCarrier  = 'pink-noise';
  selectedDuration = 15;

  state: SessionState = 'idle';
  errorMessage = '';

  // ── Web Audio API player state ─────────────────────────────────────────────

  isPlaying   = false;
  progress    = 0;       // 0 – 1
  currentTime = 0;       // seconds
  duration    = 0;       // seconds
  volume      = 0.8;

  private audioCtx:    AudioContext | null          = null;
  private gainNode:    GainNode | null              = null;
  private audioBuffer: AudioBuffer | null           = null;
  private sourceNode:  AudioBufferSourceNode | null = null;
  private startedAt   = 0;   // audioCtx.currentTime when last play() was called
  private pausedAt    = 0;   // buffer offset at last pause
  private ticker:     ReturnType<typeof setInterval> | null = null;

  constructor(private stressService: StressService) {}

  // ── Session generation ────────────────────────────────────────────────────

  generate(): void {
    // AudioContext must be created inside a user-gesture handler
    if (!this.audioCtx) {
      this.audioCtx  = new AudioContext();
      this.gainNode  = this.audioCtx.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioCtx.destination);
    }

    this.stopPlayback();
    this.audioBuffer = null;
    this.progress    = 0;
    this.currentTime = 0;
    this.pausedAt    = 0;
    this.state       = 'generating';
    this.errorMessage = '';

    this.stressService.generate({
      band: this.selectedBand,
      carrier: this.selectedCarrier,
      duration_minutes: this.selectedDuration,
    }).subscribe({
      next: async (buffer: ArrayBuffer) => {
        try {
          this.audioBuffer = await this.audioCtx!.decodeAudioData(buffer);
          this.duration    = this.audioBuffer.duration;
          this.state       = 'ready';
          this.play();
        } catch {
          this.errorMessage = 'Failed to decode the audio data.';
          this.state = 'error';
        }
      },
      error: () => {
        this.errorMessage = 'Could not reach the audio backend. Set the API URL in StressService when the backend is ready.';
        this.state = 'error';
      },
    });
  }

  reset(): void {
    this.stopPlayback();
    this.audioBuffer  = null;
    this.progress     = 0;
    this.currentTime  = 0;
    this.pausedAt     = 0;
    this.state        = 'idle';
    this.errorMessage = '';
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  togglePlay(): void {
    this.isPlaying ? this.pause() : this.play();
  }

  play(): void {
    if (!this.audioCtx || !this.audioBuffer || !this.gainNode) return;
    this.audioCtx.resume();

    this.sourceNode = this.audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.gainNode);

    this.startedAt = this.audioCtx.currentTime;
    this.sourceNode.start(0, this.pausedAt);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      // Only treat as natural end if we're still in playing state
      if (this.isPlaying) {
        this.isPlaying   = false;
        this.pausedAt    = 0;
        this.progress    = 0;
        this.currentTime = 0;
        this.stopTicker();
      }
    };

    this.startTicker();
  }

  pause(): void {
    if (!this.sourceNode || !this.audioCtx) return;
    this.pausedAt += this.audioCtx.currentTime - this.startedAt;
    this.sourceNode.onended = null;
    this.sourceNode.stop();
    this.sourceNode = null;
    this.isPlaying  = false;
    this.stopTicker();
  }

  seek(event: MouseEvent): void {
    if (!this.audioBuffer) return;
    const bar   = event.currentTarget as HTMLElement;
    const ratio = Math.max(0, Math.min(1, (event.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth));
    const target = ratio * this.duration;

    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();

    this.pausedAt    = target;
    this.progress    = ratio;
    this.currentTime = target;

    if (wasPlaying) this.play();
  }

  onVolumeChange(event: Event): void {
    this.volume = +(event.target as HTMLInputElement).value;
    if (this.gainNode) this.gainNode.gain.value = this.volume;
  }

  // ── Progress ticker ───────────────────────────────────────────────────────

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => {
      if (!this.audioCtx || !this.isPlaying) return;
      const elapsed = Math.min(
        this.audioCtx.currentTime - this.startedAt + this.pausedAt,
        this.duration,
      );
      this.currentTime = elapsed;
      this.progress    = this.duration > 0 ? elapsed / this.duration : 0;
    }, 250);
  }

  private stopTicker(): void {
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
  }

  private stopPlayback(): void {
    this.stopTicker();
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try { this.sourceNode.stop(); } catch { /* already stopped */ }
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  durationLabel(d: number): string {
    return d === 60 ? '1 hour' : `${d} min`;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.audioCtx?.close();
  }
}
