import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const keys: [string, string][] = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];

type Props = {
  children: ReactNode;
  status?: string;
  onKey: (key: string) => void;
  onGreen?: () => void;
  onRed?: () => void;
  greenLabel?: string;
  redLabel?: string;
};

/** Testing phone: on-screen keypad plus the computer keyboard (digits, * #, Enter = green, Esc = red). */
export function PhoneFrame({ children, status, onKey, onGreen, onRed, greenLabel = "Hamagara / Ohereza", redLabel = "Hagarika" }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  function keyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input, textarea, select")) return;
    if (/^[0-9*#]$/.test(event.key)) { event.preventDefault(); onKey(event.key); }
    else if (event.key === "Enter" && onGreen) { event.preventDefault(); onGreen(); }
    else if ((event.key === "Escape" || event.key === "Backspace") && onRed) { event.preventDefault(); onRed(); }
  }

  return (
    <div className="phone-frame" tabIndex={0} onKeyDown={keyboard} aria-label="Telefoni y'igerageza">
      <div className="phone-speaker" aria-hidden />
      <div className="phone-screen" role="region" aria-live="polite" aria-label="Ecran ya telefoni">
        <div className="phone-statusbar"><span>RW (sim)</span><span>{status}</span><span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div className="phone-display">{children}</div>
      </div>
      <div className="phone-actions">
        <button type="button" className="phone-call" onClick={onGreen} disabled={!onGreen} aria-label={greenLabel}><Phone aria-hidden /></button>
        <button type="button" className="phone-end" onClick={onRed} disabled={!onRed} aria-label={redLabel}><PhoneOff aria-hidden /></button>
      </div>
      <div className="phone-keypad">
        {keys.map(([key, letters]) => (
          <button key={key} type="button" onClick={() => onKey(key)} aria-label={`Kanda ${key}`}>
            <b>{key}</b><small>{letters}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
