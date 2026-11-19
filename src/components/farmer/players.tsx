import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LessonScene } from "@/lib/learning";

function clock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VideoStage({ scenes }: { scenes: LessonScene[] }) {
  const total = Math.max(1, scenes.reduce((sum, scene) => sum + scene.seconds, 0));
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setElapsed((value) => {
        if (value + 1 >= total) { setPlaying(false); return total; }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, total]);
  let cursor = elapsed;
  let scene = scenes[0];
  for (const item of scenes) {
    if (cursor <= item.seconds) { scene = item; break; }
    cursor -= item.seconds;
    scene = item;
  }
  if (!scene) return null;
  return <div className="sim-player">
    <p className="sim-note">Amashusho y'igerageza. Ntabwo ari videwo nyayo.</p>
    <div className="sim-screen"><b>{scene.title}</b><span>{scene.visual}</span><p className="subtitle-line">{scene.subtitle}</p></div>
    <div className="sim-controls"><Button type="button" size="lg" onClick={() => { if (elapsed >= total) setElapsed(0); setPlaying((value) => !value); }}>{playing ? <Pause aria-hidden /> : <Play aria-hidden />}{playing ? "Hagarika" : "Kina"}</Button><span>{clock(elapsed)} / {clock(total)}</span></div>
    <span className="fac-bar" aria-hidden><span style={{ width: `${Math.round((elapsed / total) * 100)}%` }} /></span>
  </div>;
}

export function AudioStage({ title, narration, minutes }: { title: string; narration: string; minutes: number }) {
  const total = Math.max(30, minutes * 60);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setElapsed((value) => {
        const step = Math.max(1, Math.round(total / 40));
        if (value + step >= total) { setPlaying(false); return total; }
        return value + step;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, total]);
  return <div className="sim-player">
    <p className="sim-note">Ijwi ry'igerageza. Ntabwo ari amajwi nyayo.</p>
    <b>{title}</b>
    <div className="sim-controls"><Button type="button" size="lg" onClick={() => { if (elapsed >= total) setElapsed(0); setPlaying((value) => !value); }}>{playing ? <Pause aria-hidden /> : <Play aria-hidden />}{playing ? "Hagarika" : "Umva"}</Button><span>{clock(Math.min(elapsed, total))} / {clock(total)}</span></div>
    <span className="fac-bar" aria-label="Aho ijwi rigeze"><span style={{ width: `${Math.round((Math.min(elapsed, total) / total) * 100)}%` }} /></span>
    <p className="whitespace-pre-line text-lg leading-relaxed">{narration}</p>
  </div>;
}
