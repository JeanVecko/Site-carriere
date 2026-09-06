"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, saveSession } from "../lib/api";

export default function InvitationAccept() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [status, setStatus] = useState("Vérification de votre invitation...");
  const [busy, setBusy] = useState(false);

  const accept = useCallback(async (invitationToken: string, newPassword = "") => {
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string; token: string; role: "recruteur"; email: string }>("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: invitationToken, password: newPassword }),
      });
      saveSession({ token: result.token, role: result.role, email: result.email });
      setStatus(result.message);
      setTimeout(() => router.push("/dashboard/recruteur"), 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invitation invalide ou expirée.";
      if (message.includes("mot de passe") && !newPassword) {
        setNeedsPassword(true);
        setStatus("Créez votre mot de passe pour rejoindre cette organisation.");
      } else {
        setStatus(message);
      }
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get("token") || "";
    startTransition(() => setToken(invitationToken));
    if (invitationToken) {
      window.setTimeout(() => accept(invitationToken), 0);
    } else {
      startTransition(() => setStatus("Lien d’invitation manquant."));
    }
  }, [accept]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token) accept(token, password);
  }

  return (
    <main className="invitation-page">
      <section className="invitation-card">
        <h1>Invitation recruteur</h1>
        <p>{status}</p>
        {needsPassword && (
          <form onSubmit={submit} className="invitation-form">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe *"
              minLength={6}
              required
              className="access-input"
              autoFocus
            />
            <button type="submit" className="pill-button pill-button-primary" disabled={busy}>
              {busy ? "Validation..." : "Rejoindre l’organisation"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
