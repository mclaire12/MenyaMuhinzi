import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IvrCall } from "@/components/basic-phone/ivr-call";
import { PhoneFrame } from "@/components/basic-phone/phone-frame";
import { logChannelSession } from "@/lib/basic-phone/answers";
import { identifyCaller, rememberLanguage, type Caller } from "@/lib/basic-phone/farmers";
import { IVR_CALLER_NAME } from "@/lib/basic-phone/ivr";
import { findLesson, lessonRecord } from "@/lib/basic-phone/progress";
import { clock, expireUssd, isExpired, renderUssd, respondUssd, startUssd, USSD_CODE, ussdIdleMs, USSD_MAX_CHARS, type CallRequest, type UssdEffect, type UssdSession } from "@/lib/basic-phone/ussd";
import { getAdminState } from "@/lib/admin/store";
import { getLearningState, useLearningState } from "@/lib/mock/store";

const SIM_KEY = "mm-phone-sim-v1";
const RING_MS = 30_000;

type SimState =
  | { mode: "home"; dial: string; message: string }
  | { mode: "ussd"; session: UssdSession; reply: string }
  | { mode: "ringing"; request: CallRequest; caller: Caller; since: number }
  | { mode: "call"; request: CallRequest; caller: Caller; callId: string }
  | { mode: "dropped"; request: CallRequest; caller: Caller };

type Saved = { phone: string | null; state: SimState };

const home = (message = ""): SimState => ({ mode: "home", dial: "", message });

function restore(phone: string | null): SimState {
  if (typeof window === "undefined") return home();
  try {
    const saved = JSON.parse(localStorage.getItem(SIM_KEY) ?? "") as Saved;
    if (saved.phone !== phone) return home();
    const state = saved.state;
    if (state.mode === "call") return { mode: "dropped", request: state.request, caller: state.caller };
    if (state.mode === "ussd" && isExpired(state.session)) return { ...state, session: expireUssd(state.session) };
    return state;
  } catch {
    return home();
  }
}

export function clearPhoneSimulator() {
  if (typeof window !== "undefined") localStorage.removeItem(SIM_KEY);
}

type Props = { phone: string | null; speed: number; voice: boolean };

/** Testing tool only: imitates a feature phone dialling USSD and receiving IVR lesson calls. */
export function PhoneSimulator({ phone, speed, voice }: Props) {
  const learning = useLearningState();
  const [sim, setSim] = useState<SimState>(() => restore(phone));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    localStorage.setItem(SIM_KEY, JSON.stringify({ phone, state: sim } satisfies Saved));
  }, [phone, sim]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiredSession = sim.mode === "ussd" && isExpired(sim.session, now) ? sim.session : null;
  useEffect(() => {
    if (!expiredSession) return;
    logChannelSession("ussd", expiredSession.phone, "timeout", `Idle timeout after: ${expiredSession.steps.join(" > ")}`);
    setSim({ mode: "ussd", session: expireUssd(expiredSession), reply: "" });
  }, [expiredSession]);

  const ringingSince = sim.mode === "ringing" ? sim.since : null;
  useEffect(() => {
    if (ringingSince === null || now - ringingSince < RING_MS) return;
    logChannelSession("ivr", phone ?? "unknown", "failed", "Missed call: not answered");
    setSim(home("Wabuze guhamagarwa na MenyaMuhinzi. Ongera ukande *675# usabe isomo."));
  }, [ringingSince, now, phone]);

  const callingSession = sim.mode === "ussd" && sim.session.status === "ended" && sim.session.call ? sim.session : null;
  useEffect(() => {
    const request = callingSession?.call;
    const caller = callingSession?.caller;
    if (!callingSession || !request || !caller) return;
    const timer = setTimeout(() => {
      if (getAdminState().channels.ivrStatus === "disabled") { logChannelSession("ivr", caller.phone, "failed", "IVR service switched off by the administrator"); setSim(home("Guhamagarwa ntibishoboka ubu: serivisi ya IVR yahagaritswe.")); return; }
      setSim({ mode: "ringing", request, caller: { ...caller, language: callingSession.lang }, since: Date.now() });
    }, 2500);
    return () => clearTimeout(timer);
  }, [callingSession]);

  const applyEffects = useCallback((session: UssdSession, effects: UssdEffect[]) => {
    effects.forEach((effect) => {
      if (effect.kind === "language" && session.caller) rememberLanguage(session.caller, effect.lang);
      if (effect.kind === "ended") logChannelSession("ussd", session.phone, effect.reason === "timeout" ? "timeout" : "completed", `${effect.reason === "call" ? "Requested IVR call" : "Exited"}: ${session.steps.join(" > ")}`);
    });
  }, []);

  function dial() {
    if (sim.mode !== "home") return;
    const code = sim.dial.trim();
    if (!code) { setSim(home(`Andika ${USSD_CODE} hanyuma ukande buto y'icyatsi.`)); return; }
    if (code !== USSD_CODE) { setSim(home(`Kode "${code}" ntizwi. Gerageza ${USSD_CODE}.`)); return; }
    if (getAdminState().channels.ussdStatus === "disabled") { logChannelSession("ussd", phone ?? "no caller id", "failed", "USSD service switched off by the administrator"); setSim(home("Serivisi ya USSD ntiboneka ubu. Ongera ugerageze nyuma.")); return; }
    const identification = identifyCaller(getAdminState(), getLearningState(), phone);
    const session = startUssd(identification, phone ?? "");
    if (session.status === "ended") logChannelSession("ussd", phone ?? "no caller id", "failed", `Caller rejected: ${identification.kind}`);
    setSim({ mode: "ussd", session, reply: "" });
  }

  function send() {
    if (sim.mode !== "ussd") return;
    if (sim.session.status !== "active") { setSim(home()); return; }
    if (!sim.reply.trim()) return;
    const { session, effects } = respondUssd(sim.session, sim.reply, getLearningState());
    applyEffects(session, effects);
    if (session.status === "expired") logChannelSession("ussd", session.phone, "timeout", `Idle timeout after: ${session.steps.join(" > ")}`);
    setSim({ mode: "ussd", session, reply: "" });
  }

  function cancelUssd() {
    if (sim.mode !== "ussd") return;
    if (sim.session.status === "active") logChannelSession("ussd", sim.session.phone, "completed", `Cancelled by farmer: ${sim.session.steps.join(" > ")}`);
    if (sim.session.status === "ended" && sim.session.call && sim.session.caller) {
      if (getAdminState().channels.ivrStatus === "disabled") { logChannelSession("ivr", sim.session.phone, "failed", "IVR service switched off by the administrator"); setSim(home("Guhamagarwa ntibishoboka ubu: serivisi ya IVR yahagaritswe.")); return; }
      setSim({ mode: "ringing", request: sim.session.call, caller: { ...sim.session.caller, language: sim.session.lang }, since: Date.now() });
      return;
    }
    setSim(home());
  }

  function reject() {
    if (sim.mode !== "ringing") return;
    logChannelSession("ivr", sim.caller.phone, "failed", "Incoming lesson call rejected");
    const identification = identifyCaller(getAdminState(), getLearningState(), phone);
    const session = startUssd(identification, phone ?? "");
    if (session.status !== "active") { setSim({ mode: "ussd", session, reply: "" }); return; }
    setSim({ mode: "ussd", reply: "", session: { ...session, lang: sim.caller.language, screen: { id: "lesson", ref: sim.request }, history: [{ id: "main" }], notice: sim.caller.language === "en" ? "Call rejected." : "Wanze guhamagarwa." } });
  }

  function key(value: string) {
    setSim((current) => {
      if (current.mode === "home") return { ...current, dial: (current.dial + value).slice(0, 20), message: "" };
      if (current.mode === "ussd" && current.session.status === "active") return { ...current, reply: (current.reply + value).slice(0, 12) };
      return current;
    });
  }

  if (sim.mode === "call") {
    return <IvrCall key={sim.callId} caller={sim.caller} request={sim.request} speed={speed} voice={voice} onEnd={(detail) => {
      logChannelSession("ivr", sim.caller.phone, "completed", detail);
      setSim(home("Ikiganiro kirangiye. Aho wari ugeze harabitswe."));
    }} />;
  }

  if (sim.mode === "ringing" || sim.mode === "dropped") {
    const { course, lesson } = findLesson(learning, sim.request);
    const accept = () => {
      const record = lessonRecord(getLearningState(), sim.caller.learnerId, sim.request.lessonId);
      const resumeAt = sim.mode === "dropped" && record?.status === "in_progress" ? record.positionSec ?? 0 : sim.request.resumeAt;
      setSim({ mode: "call", request: { ...sim.request, resumeAt }, caller: sim.caller, callId: `call-${Date.now().toString(36)}` });
    };
    return (
      <div className="phone-stage">
        <PhoneFrame status={sim.mode === "ringing" ? "Irahamagara" : "Cyacitse"} onKey={() => undefined} onGreen={accept} onRed={sim.mode === "ringing" ? reject : () => setSim(home())} greenLabel="Akira" redLabel="Wanga">
          <div className={sim.mode === "ringing" ? "incoming ringing" : "incoming"}>
            <p className="sim-note">{sim.mode === "ringing" ? "Uri guhamagarwa…" : "Ikiganiro cyacitse"}</p>
            <p className="ivr-caller">{IVR_CALLER_NAME}</p>
            <p className="ivr-sub">Kuri: {sim.caller.phone}</p>
            <p className="ivr-sub">{course?.title ?? "—"}</p>
            <p className="ivr-line">{lesson?.title ?? "—"}{sim.request.mode === "assessment" ? " · isuzumabumenyi" : ""}</p>
            {sim.mode === "dropped" && <p className="ivr-notice">Page yongeye gufungurwa. Aho wari ugeze harabitswe. Kanda icyatsi wongere uhamagarwe.</p>}
            {sim.mode === "ringing" && <p className="ivr-keys">Icyatsi = akira · Umutuku = wanga ({Math.max(0, Math.ceil((RING_MS - (now - sim.since)) / 1000))}s)</p>}
          </div>
        </PhoneFrame>
        <div className="phone-tools">
          <section className="tool-card">
            <h3>{sim.mode === "ringing" ? "Guhamagarwa kwa IVR kw'igerageza" : "Ikiganiro cyacitse"}</h3>
            <dl className="tool-facts">
              <dt>Uhamagara</dt><dd>{IVR_CALLER_NAME}</dd>
              <dt>Umuhinzi</dt><dd>{sim.caller.name} · {sim.caller.phone}</dd>
              <dt>Isomo</dt><dd>{course?.title ?? "—"}</dd>
              <dt>Isomo rito</dt><dd>{lesson?.title ?? "—"}</dd>
              <dt>Imiterere</dt><dd>{sim.mode === "ringing" ? "Irahamagara" : "Yacitse (refresh)"}</dd>
            </dl>
            <div className="tool-row">
              <Button type="button" onClick={accept}>Akira</Button>
              <Button type="button" variant="outline" onClick={sim.mode === "ringing" ? reject : () => setSim(home())}>{sim.mode === "ringing" ? "Wanga (subira kuri USSD)" : "Funga"}</Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (sim.mode === "ussd") {
    const session = sim.session;
    const active = session.status === "active";
    const text = active ? renderUssd(session, learning).text : session.endText;
    const remaining = Math.max(0, ussdIdleMs() - (now - session.lastInputAt));
    return (
      <div className="phone-stage">
        <PhoneFrame status="USSD" onKey={key} onGreen={send} onRed={cancelUssd} greenLabel={active ? "Ohereza" : "OK"} redLabel={active ? "Hagarika" : "Funga"}>
          <div className="ussd-dialog" role="dialog" aria-label="USSD">
            <pre className="ussd-text">{text}</pre>
            {active ? (
              <form className="ussd-reply" onSubmit={(event) => { event.preventDefault(); send(); }}>
                <input aria-label="Igisubizo" inputMode="numeric" value={sim.reply} onChange={(event) => setSim({ ...sim, reply: event.target.value.slice(0, 12) })} autoFocus />
                <div className="ussd-buttons"><button type="button" onClick={cancelUssd}>Hagarika</button><button type="submit">Ohereza</button></div>
              </form>
            ) : (
              <div className="ussd-buttons"><button type="button" onClick={cancelUssd}>OK</button></div>
            )}
          </div>
        </PhoneFrame>
        <div className="phone-tools">
          <section className="tool-card">
            <h3>Isomo rya USSD (igerageza)</h3>
            <dl className="tool-facts">
              <dt>Kode</dt><dd>{USSD_CODE} (iy'igerageza, si iyemewe)</dd>
              <dt>Inyuguti</dt><dd>{text.length}/{USSD_MAX_CHARS}</dd>
              <dt>Ururimi</dt><dd>{session.lang === "en" ? "English" : "Kinyarwanda"}</dd>
              <dt>Imiterere</dt><dd>{active ? `Irakora · igihe gisigaye ${clock(remaining / 1000)}` : session.status === "expired" ? "Igihe cyashize" : session.call ? "Irangiye · MenyaMuhinzi iraguhamagara" : "Irangiye"}</dd>
              <dt>Inzira</dt><dd>{session.steps.join(" › ")}</dd>
            </dl>
            <div className="tool-row">
              {active && <Button type="button" variant="outline" onClick={() => setSim({ ...sim, session: { ...session, lastInputAt: 0 } })}>Igerageza: igihe kirangire</Button>}
              <Button type="button" variant="outline" onClick={() => setSim(home())}>Tangira bushya</Button>
            </div>
            <p className="sim-note">Andika umubare ukoresheje utubuto cyangwa clavier, hanyuma ukande buto y'icyatsi. 0 = subira inyuma · 00 = ahabanza.</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-stage">
      <PhoneFrame status={phone ? "Ifite umurongo" : "Nta nimero"} onKey={key} onGreen={dial} onRed={() => setSim({ ...sim, dial: sim.dial.slice(0, -1) })} greenLabel="Hamagara" redLabel="Siba">
        <div className="dialer">
          <p className="sim-note">{phone ?? "Nta nimero (caller ID ntiboneka)"}</p>
          <p className="dialer-number" aria-live="polite">{sim.dial || " "}</p>
          {sim.message && <p className="ivr-notice">{sim.message}</p>}
        </div>
      </PhoneFrame>
      <div className="phone-tools">
        <section className="tool-card">
          <h3>Tangira igerageza</h3>
          <ol className="tool-steps">
            <li>Kanda <b>{USSD_CODE}</b> ku tubuto twa telefoni (cyangwa ukande hano hasi).</li>
            <li>Kanda buto y'<b>icyatsi</b> kugira ngo uhamagare.</li>
            <li>Hitamo ururimi, igihingwa, isomo n'isomo rito, hanyuma ukande <b>1</b> wumve isomo.</li>
            <li>MenyaMuhinzi iraguhamagara: akira, wumve isomo, ukoreshe 1, 0, 2, 3, 8, 9 na #.</li>
          </ol>
          <Button type="button" variant="outline" onClick={() => setSim({ mode: "home", dial: USSD_CODE, message: "" })}>Andika {USSD_CODE}</Button>
        </section>
      </div>
    </div>
  );
}
