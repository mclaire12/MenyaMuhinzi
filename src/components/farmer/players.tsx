import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type LessonTrack = { title: string; text: string; audio: string; image: string; fallbackImage: string };

function clock(total: number) {
  const safe = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function sentencesOf(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

function sentenceIndex(sentences: string[], time: number, duration: number) {
  if (!duration) return 0;
  const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0) || 1;
  const at = (time / duration) * total;
  let cursor = 0;
  for (let index = 0; index < sentences.length; index += 1) {
    cursor += sentences[index]!.length;
    if (at <= cursor) return index;
  }
  return sentences.length - 1;
}

function kinyarwandaVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((voice) => voice.lang.toLowerCase().startsWith("rw")) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("sw")) ?? null;
}

function useLessonTrack(track: LessonTrack) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentences = useMemo(() => sentencesOf(track.text), [track.text]);
  const [fileOk, setFileOk] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [spoken, setSpoken] = useState(0);
  const spokenRef = useRef(0);

  useEffect(() => {
    setFileOk(true);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setSpoken(0);
    spokenRef.current = 0;
    window.speechSynthesis?.cancel();
  }, [track.audio, track.text]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); audioRef.current?.pause(); }, []);

  function speakFrom(index: number) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const sentence = sentences[index];
    if (!sentence) { setPlaying(false); return; }
    spokenRef.current = index;
    setSpoken(index);
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "rw-RW";
    const voice = kinyarwandaVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.onend = () => {
      const next = spokenRef.current + 1;
      if (next < sentences.length) speakFrom(next);
      else setPlaying(false);
    };
    synth.speak(utterance);
  }

  function toggle() {
    if (!fileOk) {
      if (playing) { window.speechSynthesis?.cancel(); setPlaying(false); return; }
      const start = spoken >= sentences.length - 1 && !playing ? 0 : spoken;
      setPlaying(true);
      speakFrom(start);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    if (audio.currentTime >= (audio.duration || 0) - 0.2) audio.currentTime = 0;
    void audio.play();
    setPlaying(true);
  }

  function replay() {
    window.speechSynthesis?.cancel();
    setSpoken(0);
    spokenRef.current = 0;
    if (!fileOk) { setPlaying(true); speakFrom(0); return; }
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
    setPlaying(true);
  }

  function seek(next: number) {
    if (!fileOk) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = next;
    setTime(next);
  }

  const index = fileOk ? sentenceIndex(sentences, time, duration) : spoken;
  return { audioRef, sentences, fileOk, setFileOk, playing, time, duration, setTime, setDuration, setPlaying, index, toggle, replay, seek };
}

function Controls({ playing, time, duration, onToggle, onReplay, onSeek, seekable, playLabel }: { playing: boolean; time: number; duration: number; onToggle: () => void; onReplay: () => void; onSeek: (value: number) => void; seekable: boolean; playLabel: string }) {
  return (
    <div className="lesson-controls">
      <Button type="button" size="lg" onClick={onToggle}>{playing ? <Pause aria-hidden /> : <Play aria-hidden />}{playing ? "Hagarika" : playLabel}</Button>
      <Button type="button" size="lg" variant="outline" onClick={onReplay}><RotateCcw aria-hidden />Subiramo</Button>
      <input aria-label="Aho ijwi rigeze" type="range" min={0} max={duration || 0} step={0.1} value={Math.min(time, duration || 0)} disabled={!seekable || !duration} onChange={(event) => onSeek(Number(event.target.value))} />
      <span>{clock(time)} / {clock(duration)}</span>
    </div>
  );
}

export function VideoStage({ track }: { track: LessonTrack }) {
  const voice = useLessonTrack(track);
  const [image, setImage] = useState(track.image);
  useEffect(() => setImage(track.image), [track.image]);
  const caption = voice.sentences[voice.index] ?? track.title;
  return (
    <div className="lesson-stage">
      <div className={voice.playing ? "lesson-video is-playing" : "lesson-video"}>
        <img src={image} alt="" onError={() => setImage(track.fallbackImage)} />
        <p className="lesson-caption">{caption}</p>
      </div>
      <audio
        ref={voice.audioRef}
        src={track.audio}
        preload="auto"
        onError={() => voice.setFileOk(false)}
        onLoadedMetadata={(event) => voice.setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => voice.setTime(event.currentTarget.currentTime)}
        onEnded={() => voice.setPlaying(false)}
        onPlay={() => voice.setPlaying(true)}
        onPause={() => voice.setPlaying(false)}
      />
      <Controls playing={voice.playing} time={voice.fileOk ? voice.time : voice.index} duration={voice.fileOk ? voice.duration : voice.sentences.length} onToggle={voice.toggle} onReplay={voice.replay} onSeek={voice.seek} seekable={voice.fileOk} playLabel="Reba" />
    </div>
  );
}

export function AudioStage({ track }: { track: LessonTrack }) {
  const voice = useLessonTrack(track);
  return (
    <div className="lesson-stage">
      <div className="lesson-listen">
        <img src={track.image} alt="" onError={(event) => { event.currentTarget.src = track.fallbackImage; }} />
        <div>
          <b>{track.title}</b>
          <div className="lesson-transcript">
            {voice.sentences.map((sentence, index) => <p key={sentence} className={index === voice.index && voice.playing ? "is-said" : index < voice.index ? "is-past" : ""}>{sentence}</p>)}
          </div>
        </div>
      </div>
      <audio
        ref={voice.audioRef}
        src={track.audio}
        preload="auto"
        onError={() => voice.setFileOk(false)}
        onLoadedMetadata={(event) => voice.setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => voice.setTime(event.currentTarget.currentTime)}
        onEnded={() => voice.setPlaying(false)}
        onPlay={() => voice.setPlaying(true)}
        onPause={() => voice.setPlaying(false)}
      />
      <Controls playing={voice.playing} time={voice.fileOk ? voice.time : voice.index} duration={voice.fileOk ? voice.duration : voice.sentences.length} onToggle={voice.toggle} onReplay={voice.replay} onSeek={voice.seek} seekable={voice.fileOk} playLabel="Umva" />
    </div>
  );
}
