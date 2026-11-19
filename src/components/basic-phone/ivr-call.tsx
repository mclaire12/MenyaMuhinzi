import { useEffect, useMemo, useRef, useState } from "react";
import { PhoneFrame } from "@/components/basic-phone/phone-frame";
import { VoicePanel } from "@/components/basic-phone/voice-panel";
import { answerLessonQuestion, checkIvrAnswer, ivrQuestions, sampleQuestions, saveIvrAttempt, transcribe, type LessonAnswer } from "@/lib/basic-phone/answers";
import { AudioPlayback, speak, stopSpeaking } from "@/lib/basic-phone/audio";
import type { Caller } from "@/lib/basic-phone/farmers";
import { ivrKeys, lessonAudio, partAt, IVR_CALLER_NAME } from "@/lib/basic-phone/ivr";
import { COMPLETION_THRESHOLD, findLesson, lessonRecord, neighbourLesson, recordListening, startListening, type LessonRef } from "@/lib/basic-phone/progress";
import { clock, type CallRequest } from "@/lib/basic-phone/ussd";
import type { Recording } from "@/lib/basic-phone/voice";
import type { ReviewedAnswer } from "@/lib/mock/services/farmer";
import { getLearningState, MockServiceError, useLearningState } from "@/lib/mock/store";
import type { AssessmentQuestion } from "@/lib/mock/types";

type QuizPhase = {
  kind: "quiz";
  questions: AssessmentQuestion[];
  index: number;
  answers: Record<string, string>;
  step: "question" | "feedback" | "result";
  feedback: ReviewedAnswer | null;
  result: { score: number; answered: number; total: number } | null;
  working: boolean;
  error: string;
};

type Phase =
  | { kind: "lesson"; finished: boolean }
  | { kind: "ask"; step: "listen" | "working" | "answer" | "error"; question: string; answer: LessonAnswer | null; error: string }
  | QuizPhase
  | { kind: "noquiz" };

const t = {
  rw: {
    playing: "Isomo rirakina", paused: "Isomo ryahagaze", finished: "Isomo rirangiye", noAudio: "Iri somo ntirifite ijwi. Kanda 3 ku rikurikira cyangwa # usoze.",
    first: "Iri ni isomo rya mbere.", last: "Nta rindi somo rikurikira muri aya masomo.", invalid: "Urufunguzo ntiruzwi. Reba utubuto twemewe.",
    saved: "Isomo ryabitswe nk'iryarangiye.", listen: "Vuga ikibazo cyawe nyuma y'ijwi. Koresha igikoresho cyo gufata amajwi iruhande.",
    working: "Turimo gushaka igisubizo mu isomo…", noQuiz: "Iri somo nta isuzumabumenyi rifite. Kanda * usubire ku isomo.",
    right: "Ni byo!", wrong: "Si byo.", correct: "Igisubizo nyacyo:", score: (s: number, a: number, n: number) => `Amanota: ${s}% · Wasubije ${a}/${n}`,
    saySpoken: "Vuga igisubizo cyawe, hanyuma wohereze.", question: (i: number, n: number) => `Ikibazo ${i}/${n}`,
  },
  en: {
    playing: "Lesson playing", paused: "Lesson paused", finished: "Lesson finished", noAudio: "This lesson has no audio. Press 3 for the next one or # to end.",
    first: "This is the first lesson.", last: "There is no next lesson in this course.", invalid: "Key not recognised. Check the allowed keys.",
    saved: "Lesson saved as completed.", listen: "Say your question after the tone. Use the recording tool beside the phone.",
    working: "Looking for the answer in your lesson…", noQuiz: "No assessment for this course. Press * to return to the lesson.",
    right: "Correct!", wrong: "Not correct.", correct: "Correct answer:", score: (s: number, a: number, n: number) => `Score: ${s}% · Answered ${a}/${n}`,
    saySpoken: "Say your answer, then submit.", question: (i: number, n: number) => `Question ${i}/${n}`,
  },
};

const failureText = (error: unknown, en: boolean) => {
  const code = error instanceof MockServiceError ? error.message : "";
  if (code === "transcription_failed") return en ? "We could not understand the recording. Try again or type it." : "Ntitwumvise neza ijwi. Ongera ugerageze cyangwa wandike.";
  if (code === "course_unavailable") return en ? "This course is no longer available." : "Iri somo ntirikiboneka.";
  return en ? "The answer service is not available now. Press 8 to try again or * for the lesson." : "Serivisi y'ibisubizo ntiboneka ubu. Kanda 8 wongere, cyangwa * usubire ku isomo.";
};

type Props = {
  caller: Caller;
  request: CallRequest;
  speed: number;
  voice: boolean;
  onEnd: (detail: string) => void;
};

export function IvrCall({ caller, request, speed, voice, onEnd }: Props) {
  const lang = caller.language;
  const words = t[lang];
  const learning = useLearningState();
  const [ref, setRef] = useState<LessonRef>({ courseId: request.courseId, moduleId: request.moduleId, lessonId: request.lessonId });
  const [startAt, setStartAt] = useState(request.resumeAt);
  const [position, setPosition] = useState(request.resumeAt);
  const [playing, setPlaying] = useState(false);
  const [lessonStarted, setLessonStarted] = useState(request.mode === "lesson");
  const [notice, setNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [answerTick, setAnswerTick] = useState(0);
  const player = useRef<AudioPlayback | null>(null);
  const speedRef = useRef(speed);
  const { course, module, lesson } = findLesson(learning, ref);
  const audio = useMemo(() => (course && lesson ? lessonAudio(getLearningState(), course, lesson, lang) : null), [course, lesson, lang]);
  const [phase, setPhase] = useState<Phase>(() => (request.mode === "assessment" ? quizStart(request.courseId) : { kind: "lesson", finished: false }));

  function quizStart(courseId: string): Phase {
    const questions = ivrQuestions(getLearningState(), courseId);
    if (!questions.length) return { kind: "noquiz" };
    return { kind: "quiz", questions, index: 0, answers: {}, step: "question", feedback: null, result: null, working: false, error: "" };
  }

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    speedRef.current = speed;
    player.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (!audio || !lessonStarted) return;
    let lastBucket = -1;
    const save = (at: number) => {
      if (recordListening(caller.learnerId, ref, at, audio.duration)) setNotice(t[lang].saved);
    };
    const playback = new AudioPlayback({
      duration: audio.duration,
      startAt,
      speed: speedRef.current,
      url: audio.url,
      onTick: (at) => {
        setPosition(at);
        const bucket = Math.floor(at / 10);
        if (bucket !== lastBucket) { lastBucket = bucket; save(at); }
      },
      onEnd: () => {
        setPlaying(false);
        save(audio.duration);
        setPhase({ kind: "lesson", finished: true });
      },
    });
    player.current = playback;
    startListening(caller.learnerId, ref, startAt, audio.duration);
    setPosition(startAt);
    playback.play();
    setPlaying(true);
    return () => {
      save(playback.current);
      playback.destroy();
      player.current = null;
      stopSpeaking();
    };
  }, [audio, lessonStarted, startAt, ref, caller.learnerId, lang]);

  const partIndex = audio ? audio.parts.indexOf(partAt(audio, position)) : -1;
  const part = audio && partIndex >= 0 ? audio.parts[partIndex] : null;

  useEffect(() => {
    if (!voice || !playing || !part) return;
    speak(part.text, lang);
  }, [voice, playing, part, lang]);

  useEffect(() => {
    if (!playing) stopSpeaking();
  }, [playing]);

  const answerText = phase.kind === "ask" && phase.step === "answer" ? phase.answer?.answer ?? "" : "";
  useEffect(() => {
    if (voice && answerText) speak(answerText, lang);
  }, [voice, answerText, answerTick, lang]);

  const quizQuestion = phase.kind === "quiz" && phase.step === "question" ? phase.questions[phase.index] ?? null : null;
  useEffect(() => {
    if (voice && quizQuestion) speak(`${quizQuestion.question} ${quizQuestion.options.map((option, i) => `${i + 1}: ${option}`).join(". ")}`, lang);
  }, [voice, quizQuestion, answerTick, lang]);

  function pause() {
    player.current?.pause();
    setPlaying(false);
    if (audio && player.current) recordListening(caller.learnerId, ref, player.current.current, audio.duration);
  }

  function resume() {
    if (!lessonStarted) { setLessonStarted(true); return; }
    player.current?.play();
    setPlaying(true);
  }

  function replay() {
    setNotice("");
    setPhase({ kind: "lesson", finished: false });
    if (!lessonStarted) { setStartAt(0); setLessonStarted(true); return; }
    player.current?.seek(0);
    player.current?.play();
    setPlaying(true);
  }

  function move(step: 1 | -1) {
    const next = neighbourLesson(getLearningState(), ref, step);
    if (!next) { setNotice(step === 1 ? words.last : words.first); return; }
    const record = lessonRecord(getLearningState(), caller.learnerId, next.lessonId);
    setNotice("");
    setPhase({ kind: "lesson", finished: false });
    setStartAt(record?.status === "in_progress" ? record.positionSec ?? 0 : 0);
    setRef(next);
    setLessonStarted(true);
  }

  function backToLesson() {
    setNotice("");
    const finished = !!audio && position >= audio.duration;
    setPhase({ kind: "lesson", finished });
    if (!finished) resume();
  }

  function hangUp() {
    stopSpeaking();
    const at = player.current?.current ?? position;
    player.current?.pause();
    if (audio && lessonStarted) recordListening(caller.learnerId, ref, at, audio.duration);
    onEnd(`${lesson?.title ?? "—"} · ${clock(at)}/${clock(audio?.duration ?? 0)} · ${clock(elapsed)} call`);
  }

  async function ask(text: string, recording: Recording | null) {
    if (!course || !lesson || !module) return;
    setPhase({ kind: "ask", step: "working", question: text, answer: null, error: "" });
    try {
      const transcript = await transcribe(recording, text);
      const answer = await answerLessonQuestion({ learnerId: caller.learnerId, question: transcript.text, language: lang, crop: course.crop, courseId: course.id, moduleId: module.id, lessonId: lesson.id });
      setPhase({ kind: "ask", step: "answer", question: transcript.text, answer, error: "" });
    } catch (error) {
      setPhase({ kind: "ask", step: "error", question: text, answer: null, error: failureText(error, lang === "en") });
    }
  }

  function chooseAnswer(quiz: QuizPhase, value: string) {
    const question = quiz.questions[quiz.index];
    if (!question) return;
    setPhase({ ...quiz, answers: { ...quiz.answers, [question.id]: value }, feedback: checkIvrAnswer(question, value), step: "feedback", working: false, error: "" });
  }

  async function spokenAnswer(quiz: QuizPhase, text: string, recording: Recording | null) {
    setPhase({ ...quiz, working: true, error: "" });
    try {
      const transcript = await transcribe(recording, text);
      chooseAnswer(quiz, transcript.text);
    } catch (error) {
      setPhase({ ...quiz, working: false, error: failureText(error, lang === "en") });
    }
  }

  function nextQuestion(quiz: QuizPhase) {
    if (quiz.index + 1 < quiz.questions.length) { setPhase({ ...quiz, index: quiz.index + 1, step: "question", feedback: null }); return; }
    const graded = saveIvrAttempt(caller.learnerId, ref.courseId, quiz.answers, quiz.questions);
    setPhase({ ...quiz, step: "result", feedback: null, result: { score: graded.score, answered: Object.keys(quiz.answers).length, total: quiz.questions.length } });
  }

  function press(key: string) {
    if (key === "#") { hangUp(); return; }
    setNotice("");
    if (phase.kind === "lesson") {
      if (!audio) { if (key === "3") move(1); else if (key === "2") move(-1); else setNotice(words.noAudio); return; }
      if (key === "1") { if (phase.finished) replay(); else if (playing) pause(); else resume(); }
      else if (key === "0") { if (phase.finished) move(1); else replay(); }
      else if (key === "2") move(-1);
      else if (key === "3") move(1);
      else if (key === "8") { pause(); setPhase({ kind: "ask", step: "listen", question: "", answer: null, error: "" }); }
      else if (key === "9") { pause(); setPhase(quizStart(ref.courseId)); }
      else setNotice(words.invalid);
      return;
    }
    if (phase.kind === "ask") {
      if (key === "*") backToLesson();
      else if (key === "8" && phase.step !== "working") setPhase({ kind: "ask", step: "listen", question: "", answer: null, error: "" });
      else if (key === "0" && phase.step === "answer") setAnswerTick((value) => value + 1);
      else setNotice(words.invalid);
      return;
    }
    if (phase.kind === "noquiz") { if (key === "*" || key === "0") backToLesson(); else setNotice(words.invalid); return; }
    if (key === "*") { backToLesson(); return; }
    if (phase.step === "question") {
      const question = phase.questions[phase.index];
      if (key === "0") { setAnswerTick((value) => value + 1); return; }
      const choice = Number(key);
      if (question && question.kind !== "short" && choice >= 1 && choice <= question.options.length) chooseAnswer(phase, String(choice - 1));
      else setNotice(words.invalid);
    } else if (phase.step === "feedback") {
      if (key === "0") nextQuestion(phase); else setNotice(words.invalid);
    } else if (key === "0") setPhase(quizStart(ref.courseId));
    else setNotice(words.invalid);
  }

  const legend = phase.kind === "lesson" ? ivrKeys[lang][phase.finished ? "finished" : "lesson"]
    : phase.kind === "ask" ? ivrKeys[lang].answer
      : phase.kind === "noquiz" ? ivrKeys[lang].feedback.filter((item) => item.key !== "0")
        : ivrKeys[lang][phase.step === "question" ? "question" : phase.step === "feedback" ? "feedback" : "result"];
  const duration = audio?.duration ?? 0;
  const pct = duration ? Math.min(100, (position / duration) * 100) : 0;
  const currentQuestion = phase.kind === "quiz" ? phase.questions[phase.index] ?? null : null;

  return (
    <div className="phone-stage">
      <PhoneFrame status={clock(elapsed)} onKey={press} onRed={hangUp} redLabel="Soza ikiganiro">
        <div className="ivr-screen">
          <p className="ivr-caller">{IVR_CALLER_NAME}</p>
          <p className="ivr-sub">{lesson?.title ?? "—"}</p>
          {phase.kind === "lesson" && (
            audio ? <>
              <div className="ivr-bar" aria-hidden><span style={{ width: `${pct}%` }} /></div>
              <p className="ivr-time">{clock(position)} / {clock(duration)}</p>
              <p className="ivr-state">{phase.finished ? words.finished : playing ? words.playing : words.paused}</p>
              {part && <p className="ivr-line">“{part.text}”</p>}
            </> : <p className="ivr-line">{words.noAudio}</p>
          )}
          {phase.kind === "ask" && <>
            {phase.step === "listen" && <p className="ivr-line">{words.listen}</p>}
            {phase.step === "working" && <p className="ivr-state">{words.working}</p>}
            {phase.step === "answer" && phase.answer && <p className="ivr-line ivr-answer">{phase.answer.answer}</p>}
            {phase.step === "error" && <p className="ivr-line" role="alert">{phase.error}</p>}
          </>}
          {phase.kind === "noquiz" && <p className="ivr-line">{words.noQuiz}</p>}
          {phase.kind === "quiz" && currentQuestion && phase.step !== "result" && <>
            <p className="ivr-state">{words.question(phase.index + 1, phase.questions.length)}</p>
            <p className="ivr-line">{currentQuestion.question}</p>
            {phase.step === "question" && (currentQuestion.kind === "short"
              ? <p className="ivr-sub">{phase.working ? words.working : words.saySpoken}</p>
              : <ol className="ivr-options">{currentQuestion.options.map((option, i) => <li key={option}>{i + 1}. {option}</li>)}</ol>)}
            {phase.step === "feedback" && phase.feedback && <>
              <p className={phase.feedback.ok ? "ivr-ok" : "ivr-bad"}>{phase.feedback.ok ? words.right : words.wrong}</p>
              {!phase.feedback.ok && <p className="ivr-sub">{words.correct} {phase.feedback.correct}</p>}
              {phase.feedback.explanation && <p className="ivr-sub">{phase.feedback.explanation}</p>}
            </>}
          </>}
          {phase.kind === "quiz" && phase.step === "result" && phase.result && <p className="ivr-state">{words.score(phase.result.score, phase.result.answered, phase.result.total)}</p>}
          {notice && <p className="ivr-notice" role="status">{notice}</p>}
          <p className="ivr-keys">{legend.map((item) => `${item.key} ${item.label}`).join(" · ")}</p>
        </div>
      </PhoneFrame>

      <div className="phone-tools">
        <section className="tool-card">
          <h3>Ikiganiro cya IVR (igerageza)</h3>
          <p className="sim-note">Ntabwo ari IVR nyayo: ijwi ni iry'igerageza rivuye mu mwandiko w'isomo wemejwe{audio?.source === "file" ? " (dosiye y'ijwi yemewe)" : ""}.</p>
          <dl className="tool-facts">
            <dt>Isomo</dt><dd>{course?.title ?? "—"}</dd>
            <dt>Igice</dt><dd>{module?.title ?? "—"}</dd>
            <dt>Aho ugeze</dt><dd>{clock(position)} / {clock(duration)} ({Math.round(pct)}%)</dd>
            <dt>Kurangiza</dt><dd>Ugeze kuri {Math.round(COMPLETION_THRESHOLD * 100)}% by'isomo</dd>
            <dt>Imiterere</dt><dd>{lessonRecord(learning, caller.learnerId, ref.lessonId)?.status === "completed" ? "Ryarangiye (ryabitswe)" : lessonStarted ? "Riri kwigwa" : "Ntiriratangira"}</dd>
          </dl>
        </section>
        <section className="tool-card">
          <h3>Kanda kuri telefoni</h3>
          <div className="key-legend">
            {legend.map((item) => (
              <button key={item.key} type="button" onClick={() => press(item.key === "1-4" ? "1" : item.key)} disabled={item.key === "1-4"}>
                <b>{item.key}</b>{item.label}
              </button>
            ))}
          </div>
        </section>
        {phase.kind === "ask" && phase.step !== "answer" && (
          <VoicePanel title="Baza ikibazo (urufunguzo 8)" prompt="Isomo ryahagaze. Fata amajwi y'ikibazo, hanyuma wandike ibyo umuhinzi yavuze." samples={sampleQuestions} busy={phase.step === "working"} submitLabel="Ohereza ikibazo" onSubmit={(text, recording) => void ask(text, recording)} />
        )}
        {phase.kind === "ask" && phase.step === "answer" && phase.answer && (
          <section className="tool-card">
            <h3>Igisubizo cy'igerageza</h3>
            <p className="sim-note">Ikibazo: {phase.question}</p>
            <p className="tool-answer">{phase.answer.answer}</p>
            <p className="sim-note">{phase.answer.canAnswer && phase.answer.source ? `Isoko: isomo "${phase.answer.source.lessonTitle}"` : "Nta gisubizo kiri mu isomo — byoherejwe ku mufashamyumvire."} · Ntabwo ari AI nyayo.</p>
          </section>
        )}
        {phase.kind === "quiz" && phase.step === "question" && currentQuestion?.kind === "short" && (
          <VoicePanel key={currentQuestion.id} title="Igisubizo kivuzwe" prompt="Fata amajwi y'igisubizo, hanyuma wandike ibyo umuhinzi yavuze." busy={phase.working} submitLabel="Ohereza igisubizo" onSubmit={(text, recording) => void spokenAnswer(phase, text, recording)} />
        )}
        {phase.kind === "quiz" && phase.error && <p className="voice-error" role="alert">{phase.error}</p>}
      </div>
    </div>
  );
}
