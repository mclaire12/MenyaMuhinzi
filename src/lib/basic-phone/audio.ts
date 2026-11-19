/**
 * Mock IVR audio. A timer stands in for the telecom media stream; when an approved
 * recording URL exists it is played instead. Speech uses the browser voice only as a
 * clearly labelled testing aid, never as production text-to-speech.
 */
export type PlaybackOptions = {
  duration: number;
  startAt: number;
  speed: number;
  url: string | null;
  onTick: (position: number) => void;
  onEnd: () => void;
};

export class AudioPlayback {
  private position: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private element: HTMLAudioElement | null = null;
  private options: PlaybackOptions;

  constructor(options: PlaybackOptions) {
    this.options = options;
    this.position = Math.min(options.startAt, options.duration);
    if (options.url && typeof Audio !== "undefined") {
      this.element = new Audio(options.url);
      this.element.currentTime = this.position;
      this.element.ontimeupdate = () => { this.position = this.element?.currentTime ?? this.position; options.onTick(this.position); };
      this.element.onended = () => options.onEnd();
    }
  }

  get current() {
    return this.position;
  }

  get playing() {
    return this.element ? !this.element.paused : this.timer !== null;
  }

  play() {
    if (this.element) { void this.element.play(); return; }
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.position = Math.min(this.options.duration, this.position + 0.25 * this.options.speed);
      this.options.onTick(this.position);
      if (this.position >= this.options.duration) { this.pause(); this.options.onEnd(); }
    }, 250);
  }

  pause() {
    if (this.element) { this.element.pause(); return; }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  seek(position: number) {
    this.position = Math.max(0, Math.min(this.options.duration, position));
    if (this.element) this.element.currentTime = this.position;
    this.options.onTick(this.position);
  }

  setSpeed(speed: number) {
    this.options = { ...this.options, speed };
  }

  destroy() {
    this.pause();
    if (this.element) { this.element.ontimeupdate = null; this.element.onended = null; this.element = null; }
  }
}

export const browserVoiceAvailable = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, lang: "rw" | "en") {
  if (!browserVoiceAvailable()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "en" ? "en-US" : "rw-RW";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (browserVoiceAvailable()) window.speechSynthesis.cancel();
}
