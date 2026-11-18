"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { apiRequest } from "../lib/api";

// Confirme ou supprime une alerte à partir du lien reçu par e-mail. L'action est faite par le navigateur
// (et non à l'ouverture du lien par un antivirus de messagerie, qui n'exécute pas le JavaScript).
export default function AlertTokenAction({ action, token }: { action: "confirm" | "unsubscribe"; token: string }) {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; text: string }>({ status: "loading", text: "" });

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ summary?: string }>(`/alerts/${action}`, { method: "POST", body: JSON.stringify({ token }) })
      .then((result) => {
        if (cancelled) return;
        setState({
          status: "ok",
          text:
            action === "confirm"
              ? `Votre alerte est active${result.summary ? ` (${result.summary})` : ""}. Vous recevrez les nouvelles publications par e-mail, au plus une fois par jour.`
              : "Vous êtes désabonné : vous ne recevrez plus d’alertes de Carrières RDC.",
        });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", text: error instanceof Error ? error.message : "Une erreur est survenue." });
      });
    return () => {
      cancelled = true;
    };
  }, [action, token]);

  const Icon = state.status === "loading" ? LoaderCircle : state.status === "ok" ? CircleCheck : TriangleAlert;
  return (
    <div className={`pub-alert-result is-${state.status}`} role="status">
      <Icon size={22} className={state.status === "loading" ? "adm-spin" : undefined} aria-hidden="true" />
      <p>{state.status === "loading" ? "Un instant…" : state.text}</p>
      {state.status !== "loading" && (
        <div className="pub-about-cta-buttons">
          <Link className="pub-btn pub-btn-navy" href="/offres">
            Voir les offres
          </Link>
          {(action === "unsubscribe" || state.status === "error") && (
            <Link className="pub-btn pub-btn-outline" href="/alertes">
              Créer une alerte
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
