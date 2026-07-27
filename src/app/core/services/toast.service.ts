import { Injectable, signal } from '@angular/core';
import { Toast, ToastType } from '../models/toast.model';

const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 5_000,
  info: 5_000,
  warning: 7_000,
  error: 8_000,
};

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
  pauses: Set<'hover' | 'focus'>;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private readonly timers = new Map<number, ToastTimer>();
  private readonly recentMessages = new Map<string, number>();
  private nextId = 1;

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  warning(message: string): void { this.show(message, 'warning'); }
  info(message: string): void { this.show(message, 'info'); }

  show(message: string, type: ToastType, duration = TOAST_DURATIONS[type]): void {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;

    const duplicateKey = `${type}:${normalizedMessage}`;
    const now = Date.now();
    if (now - (this.recentMessages.get(duplicateKey) ?? 0) < 2_000) return;
    this.recentMessages.set(duplicateKey, now);

    const toast: Toast = { id: this.nextId++, message: normalizedMessage, type, duration };
    const removed = this.toasts().slice(2);
    removed.forEach(item => this.clearTimer(item.id));
    this.toasts.set([toast, ...this.toasts().slice(0, 2)]);
    this.timers.set(toast.id, {
      handle: null,
      remaining: duration,
      startedAt: now,
      pauses: new Set(),
    });
    this.startTimer(toast.id);
    this.pruneDuplicateHistory(now);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.toasts.update(items => items.filter(item => item.id !== id));
  }

  pause(id: number, reason: 'hover' | 'focus'): void {
    const timer = this.timers.get(id);
    if (!timer || timer.pauses.has(reason)) return;
    timer.pauses.add(reason);
    if (timer.handle !== null) {
      clearTimeout(timer.handle);
      timer.handle = null;
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
    }
  }

  resume(id: number, reason: 'hover' | 'focus'): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    timer.pauses.delete(reason);
    if (timer.pauses.size === 0 && timer.handle === null) this.startTimer(id);
  }

  private startTimer(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.pauses.size > 0) return;
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remaining);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer && timer.handle !== null) clearTimeout(timer.handle);
    this.timers.delete(id);
  }

  private pruneDuplicateHistory(now: number): void {
    this.recentMessages.forEach((timestamp, key) => {
      if (now - timestamp >= 2_000) this.recentMessages.delete(key);
    });
  }
}
