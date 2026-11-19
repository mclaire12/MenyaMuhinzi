import { Mic, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_RECORDING_SECONDS, recordingSupported, startRecording, VoiceError, type ActiveRecording, type Recording } from "@/lib/basic-phone/voice";

const voiceErrors: Record<VoiceError["kind"], string> = {
  unsupported: "Iyi mudasobwa ntishobora gufata amajwi. Andika ikibazo hasi.",
  denied: "Wanze ko mikoro ikoreshwa. Yemerere mu igenamiterere rya mudasobwa, cyangwa wandike hasi.",
  no_device: "Nta mikoro ibonetse. Andika ikibazo hasi.",
  failed: "Gufata amajwi byanze. Ongera ugerageze cyangwa wandike.",
};

type Props = {
  title: string;
  prompt: string;
  samples?: string[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (text: string, recording: Recording | null) => void;
};

/** Records the farmer's voice with the browser microphone; the tester types what was said (mock transcription). */
export function VoicePanel({ title, prompt, samples = [], busy, submitLabel, onSubmit }: Props) {
  const [active, setActive] = useState<ActiveRecording | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [starting, setStarting] = useState(false);
  const activeRef = useRef<ActiveRecording | null>(null);

  const stop = useCallback(async () => {
    const current = activeRef.current;
    if (!current) return;
    activeRef.current = null;
    setActive(null);
    try {
      setRecording(await current.stop());
    } catch {
      setError(voiceErrors.failed);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - active.startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_RECORDING_SECONDS) void stop();
    }, 250);
    return () => clearInterval(timer);
  }, [active, stop]);

  useEffect(() => () => { activeRef.current?.cancel(); }, []);

  async function start() {
    setError("");
    setStarting(true);
    try {
      const next = await startRecording();
      activeRef.current = next;
      setActive(next);
      setSeconds(0);
      setRecording(null);
    } catch (problem) {
      setError(voiceErrors[problem instanceof VoiceError ? problem.kind : "failed"]);
    } finally {
      setStarting(false);
    }
  }

  function discard() {
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setSeconds(0);
  }

  const empty = !text.trim();

  return (
    <section className="voice-panel" aria-label={title}>
      <h3>{title}</h3>
      <p className="sim-note">{prompt}</p>
      <div className="voice-row">
        {active ? (
          <Button type="button" variant="destructive" onClick={() => void stop()}><Square aria-hidden />Hagarika gufata ({seconds}s)</Button>
        ) : (
          <Button type="button" onClick={() => void start()} disabled={starting || busy || !recordingSupported()}><Mic aria-hidden />{starting ? "Turasaba mikoro…" : recording ? "Ongera ufate amajwi" : "Tangira gufata amajwi"}</Button>
        )}
        {active && <span className="rec-dot" aria-live="polite">Birafata amajwi…</span>}
        {!recordingSupported() && <span className="sim-note">Gufata amajwi ntibishoboka hano.</span>}
      </div>
      {recording && (
        <div className="voice-row">
          <audio controls src={recording.url} aria-label="Umva ijwi wafashe" />
          <span className="sim-note">{recording.seconds}s</span>
          <Button type="button" variant="ghost" size="sm" onClick={discard}><Trash2 aria-hidden />Siba</Button>
        </div>
      )}
      {error && <p className="voice-error" role="alert">{error}</p>}
      <label className="voice-transcript">
        <span>Ibyo umuhinzi yavuze (andika cyangwa ukosore) · <em>mock transcription, nta ASR nyayo</em></span>
        <textarea rows={2} value={text} onChange={(event) => setText(event.target.value)} placeholder="Andika ikibazo cyangwa igisubizo…" />
      </label>
      {samples.length > 0 && (
        <div className="voice-samples" aria-label="Ingero z'ibibazo">
          {samples.map((sample) => <button key={sample} type="button" onClick={() => setText(sample)}>{sample}</button>)}
        </div>
      )}
      {empty && recording && <p className="sim-note">Andika ibyo umuhinzi yavuze mbere yo kohereza.</p>}
      <Button type="button" onClick={() => onSubmit(text, recording)} disabled={busy || empty || !!active}>{busy ? "Biri gutunganywa…" : submitLabel}</Button>
    </section>
  );
}
