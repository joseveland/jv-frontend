import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

type Mode = 'upload' | 'camera' | 'generate';

@Component({
  selector: 'app-qr',
  imports: [NgIf, FormsModule],
  templateUrl: './qr.component.html',
  styleUrl: './qr.component.scss'
})
export class QrComponent implements OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('video')  videoRef!: ElementRef<HTMLVideoElement>;

  mode: Mode = 'upload';
  result: string | null = null;
  error: string | null = null;
  cameraActive = false;
  dragOver = false;

  generateText = '';
  generatedQr: string | null = null;

  private stream: MediaStream | null = null;
  private rafId: number | null = null;

  setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.stopCamera();
    this.result = null;
    this.error = null;
    this.generatedQr = null;
    this.mode = mode;
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.decodeFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.decodeFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(): void {
    this.dragOver = false;
  }

  private decodeFile(file: File): void {
    this.result = null;
    this.error = null;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      this.result = code?.data ?? null;
      if (!this.result) this.error = 'No QR code found in the image.';
    };
    img.src = objectUrl;
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  async startCamera(): Promise<void> {
    this.result = null;
    this.error = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cameraActive = true;
      this.tick();
    } catch {
      this.error = 'Camera access denied or not available on this device.';
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.videoRef.nativeElement.srcObject = null;
  }

  private tick(): void {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        this.result = code.data;
        this.stopCamera();
        return;
      }
    }
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  // ── Generate ──────────────────────────────────────────────────────────────

  async generateQr(): Promise<void> {
    if (!this.generateText.trim()) return;
    this.generatedQr = null;
    try {
      this.generatedQr = await QRCode.toDataURL(this.generateText.trim(), {
        width: 320,
        margin: 2,
        color: { dark: '#1a3a32', light: '#f2f8f6' },
      });
    } catch {
      this.generatedQr = null;
    }
  }

  downloadQr(): void {
    if (!this.generatedQr) return;
    const a = document.createElement('a');
    a.href = this.generatedQr;
    a.download = 'qr-code.png';
    a.click();
  }

  // ── Result ────────────────────────────────────────────────────────────────

  get isUrl(): boolean {
    if (!this.result) return false;
    try { new URL(this.result); return true; } catch { return false; }
  }

  copy(): void {
    if (this.result) navigator.clipboard.writeText(this.result);
  }

  reset(): void {
    this.result = null;
    this.error = null;
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
