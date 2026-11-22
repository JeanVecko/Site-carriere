"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, Copy, Info, TriangleAlert, X } from "lucide-react";

/*
 * Fenêtres de dialogue du site (confirmation, saisie, message, texte à copier), à la place des fenêtres
 * du navigateur (window.confirm / prompt / alert) qu'on ne peut ni animer ni mettre aux couleurs du site.
 * Utilisation : `if (!(await confirmDialog({ title, message }))) return;`. Le composant <DialogHost /> est
 * placé une seule fois dans la mise en page.
 */

type Tone = "info" | "warning" | "danger" | "success";
type Base = { title: string; message?: string; tone?: Tone };
export type ConfirmOptions = Base & { confirmLabel?: string; cancelLabel?: string };
export type PromptOptions = Base & {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean; // texte obligatoire (au moins minLength caractères)
  minLength?: number;
  multiline?: boolean;
  confirmLabel?: string;
};
export type AlertOptions = Base & { confirmLabel?: string };
export type CopyOptions = Base & { text: string };

type Request =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void }
  | { id: number; kind: "alert"; options: AlertOptions; resolve: () => void }
  | { id: number; kind: "copy"; options: CopyOptions; resolve: () => void };

let queue: Request[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const current = () => queue[0] ?? null;
const serverCurrent = () => null;

function push(request: Omit<Request, "id">) {
  queue = [...queue, { ...request, id: nextId++ } as Request];
  emit();
}
function finish(id: number) {
  queue = queue.filter((entry) => entry.id !== id);
  emit();
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => push({ kind: "confirm", options, resolve }));
}
export function promptDialog(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => push({ kind: "prompt", options, resolve }));
}
export function alertDialog(options: AlertOptions): Promise<void> {
  return new Promise((resolve) => push({ kind: "alert", options, resolve }));
}
export function copyDialog(options: CopyOptions): Promise<void> {
  return new Promise((resolve) => push({ kind: "copy", options, resolve }));
}

const ICONS: Record<Tone, typeof Info> = { info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck };
const EXIT_MS = 180;

export default function DialogHost() {
  const request = useSyncExternalStore(subscribe, current, serverCurrent);
  return request ? <Dialog key={request.id} request={request} /> : null;
}

function Dialog({ request }: { request: Request }) {
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState(request.kind === "prompt" ? request.options.defaultValue ?? "" : "");
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const { options } = request;
  const tone: Tone = options.tone || (request.kind === "copy" ? "info" : request.kind === "alert" ? "info" : "warning");
  const Icon = ICONS[tone];

  const minLength = request.kind === "prompt" ? (request.options.required ? request.options.minLength ?? 1 : 0) : 0;
  const invalid = request.kind === "prompt" && value.trim().length < minLength;

  // Ferme avec l'animation de sortie, puis rend la réponse (et le focus à l'élément qui a ouvert la fenêtre).
  function close(answer: boolean) {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      if (request.kind === "confirm") request.resolve(answer);
      else if (request.kind === "prompt") request.resolve(answer ? value.trim() : null);
      else request.resolve();
      finish(request.id);
      if (opener.current instanceof HTMLElement) opener.current.focus({ preventScroll: true });
    }, EXIT_MS);
  }

  useEffect(() => {
    opener.current = document.activeElement;
    // Action dangereuse : le focus va sur « Annuler » (Entrée ne supprime rien par accident).
    const focusTarget = field.current || (tone === "danger" && cancelButton.current) || confirmButton.current;
    const timer = window.setTimeout(() => {
      focusTarget?.focus();
      if (request.kind === "copy") field.current?.select();
    }, 30);
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      html.style.overflow = previous;
    };
  }, [request.kind, tone]);

  // Échap annule ; Tab reste dans la fenêtre.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(false);
    } else if (event.key === "Tab" && panel.current) {
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("button, input, textarea, [tabindex]:not([tabindex='-1'])")].filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  async function copy() {
    if (request.kind !== "copy") return;
    try {
      await navigator.clipboard.writeText(request.options.text);
      setCopied(true);
    } catch {
      field.current?.select();
    }
  }

  const titleId = `dialog-title-${request.id}`;
  const messageId = `dialog-message-${request.id}`;
  const cancelable = request.kind === "confirm" || request.kind === "prompt";
  const confirmLabel =
    request.kind === "copy" ? "Fermer" : ("confirmLabel" in options && options.confirmLabel) || (request.kind === "alert" ? "D’accord" : "Confirmer");

  return (
    <div className={`cr-dialog-backdrop${closing ? " is-closing" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close(false)} onKeyDown={onKeyDown}>
      <div
        ref={panel}
        className={`cr-dialog tone-${tone}${closing ? " is-closing" : ""}`}
        role={cancelable ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? messageId : undefined}
      >
        <button type="button" className="cr-dialog-close" onClick={() => close(false)} aria-label="Fermer">
          <X size={17} />
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid) close(true);
          }}
        >
          <div className="cr-dialog-head">
            <span className="cr-dialog-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <div>
              <h2 id={titleId}>{options.title}</h2>
              {options.message && (
                <p id={messageId} className="cr-dialog-message">
                  {options.message}
                </p>
              )}
            </div>
          </div>

          {request.kind === "prompt" && (
            <label className="cr-dialog-field">
              {request.options.label && <span>{request.options.label}</span>}
              {request.options.multiline ? (
                <textarea ref={field} rows={4} value={value} placeholder={request.options.placeholder} onChange={(event) => setValue(event.target.value)} maxLength={1000} />
              ) : (
                <input ref={field} type="text" value={value} placeholder={request.options.placeholder} onChange={(event) => setValue(event.target.value)} maxLength={1000} />
              )}
              {request.options.required && minLength > 1 && (
                <small className={invalid && value ? "is-error" : undefined}>Au moins {minLength} caractères.</small>
              )}
            </label>
          )}

          {request.kind === "copy" && (
            <label className="cr-dialog-field">
              <textarea ref={field} rows={6} value={request.options.text} readOnly onFocus={(event) => event.currentTarget.select()} />
            </label>
          )}

          <div className="cr-dialog-actions">
            {cancelable && (
              <button ref={cancelButton} type="button" className="cr-dialog-btn is-ghost" onClick={() => close(false)}>
                {("cancelLabel" in options && options.cancelLabel) || "Annuler"}
              </button>
            )}
            {request.kind === "copy" && (
              <button type="button" className="cr-dialog-btn is-ghost" onClick={() => void copy()}>
                {copied ? <CircleCheck size={16} /> : <Copy size={16} />} {copied ? "Copié" : "Copier"}
              </button>
            )}
            <button ref={confirmButton} type="submit" className={`cr-dialog-btn ${tone === "danger" ? "is-danger" : "is-primary"}`} disabled={invalid}>
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
