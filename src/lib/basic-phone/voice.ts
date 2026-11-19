export type VoiceErrorKind = "unsupported" | "denied" | "no_device" | "failed";

export class VoiceError extends Error {
  kind: VoiceErrorKind;
  constructor(kind: VoiceErrorKind) {
    super(kind);
    this.kind = kind;
  }
}

export type Recording = { url: string; blob: Blob; seconds: number; mimeType: string };
export type ActiveRecording = { stop: () => Promise<Recording>; cancel: () => void; startedAt: number };

export const MAX_RECORDING_SECONDS = 60;

export function recordingSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

/** Microphone permission is requested here, only when the tester starts a recording. */
export async function startRecording(): Promise<ActiveRecording> {
  if (!recordingSupported()) throw new VoiceError("unsupported");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    throw new VoiceError(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "no_device" : "failed");
  }
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.start();
  const release = () => stream.getTracks().forEach((track) => track.stop());
  return {
    startedAt,
    stop: () => new Promise<Recording>((resolve, reject) => {
      recorder.onstop = () => {
        release();
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { reject(new VoiceError("failed")); return; }
        resolve({ blob, url: URL.createObjectURL(blob), seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)), mimeType: blob.type });
      };
      recorder.stop();
    }),
    cancel: () => { recorder.onstop = release; if (recorder.state !== "inactive") recorder.stop(); else release(); },
  };
}
