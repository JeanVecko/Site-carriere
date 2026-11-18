"use client";

import { useState } from "react";
import { BellRing, CircleCheck, TriangleAlert } from "lucide-react";
import { apiRequest, CONTRACT_TYPES } from "../lib/api";

const CITIES = ["Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Kolwezi", "Matadi", "Mbuji-Mayi", "Kananga", "Bunia", "Uvira", "Kalemie"];

/**
 * Formulaire d'alerte emploi : le visiteur choisit ses critères et reçoit les nouvelles publications par e-mail
 * (au plus une fois par jour), après avoir confirmé son adresse.
 */
export default function AlertSignup() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Offre d’emploi");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setStatus("sending");
    setMessage("");
    try {
      await apiRequest("/alerts", { method: "POST", body: JSON.stringify(values) });
      setStatus("sent");
      setMessage(`Presque fini : ouvrez l’e-mail envoyé à ${String(values.email)} et cliquez sur le lien pour activer votre alerte.`);
      form.reset();
      setCategory("Offre d’emploi");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "L’alerte n’a pas pu être créée. Réessayez.");
    }
  }

  return (
    <form className="pub-alert-form" onSubmit={handleSubmit}>
      <label className="pub-alert-field pub-alert-email">
        <span>Votre e-mail *</span>
        <input name="email" type="email" required placeholder="exemple@gmail.com" autoComplete="email" />
      </label>
      <label className="pub-alert-field pub-alert-category">
        <span>Je cherche</span>
        <select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="Offre d’emploi">Des offres d’emploi</option>
          <option value="Annonce">Des annonces (formations, événements…)</option>
          <option value="Appel d’offre">Des appels d’offres</option>
          <option value="">Toutes les publications</option>
        </select>
      </label>
      <label className="pub-alert-field pub-alert-city">
        <span>Ville</span>
        <input name="city" type="text" list="alert-cities" placeholder="Toutes les villes" maxLength={60} />
        <datalist id="alert-cities">
          {CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </label>
      {category === "Offre d’emploi" && (
        <label className="pub-alert-field">
          <span>Type de contrat</span>
          <select name="contract_type" defaultValue="">
            <option value="">Tous</option>
            {CONTRACT_TYPES.filter((type) => type !== "Autre").map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      )}
      <label className="pub-alert-field pub-alert-keywords">
        <span>Mots-clés</span>
        <input name="keywords" type="text" placeholder="Ex. comptable, logistique, ONG" maxLength={80} />
      </label>
      <div className="pub-alert-actions">
        <button className="pub-btn pub-btn-gold" type="submit" disabled={status === "sending"}>
          <BellRing size={16} /> {status === "sending" ? "Envoi…" : "Créer mon alerte"}
        </button>
        <small>Gratuit · au plus un e-mail par jour · désabonnement en un clic</small>
      </div>
      {message && (
        <p className={`pub-alert-feedback ${status === "sent" ? "is-ok" : "is-error"}`} role="status">
          {status === "sent" ? <CircleCheck size={16} /> : <TriangleAlert size={16} />} {message}
        </p>
      )}
    </form>
  );
}
