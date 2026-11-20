"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CircleCheck,
  Eye,
  FileBarChart,
  KeyRound,
  LogIn,
  LogOut,
  MousePointerClick,
  Percent,
  Send,
  TriangleAlert,
} from "lucide-react";
import {
  CONTACT_EMAIL,
  RECRUITER_TOKEN_KEY,
  apiRequest,
  decodeEntities,
  detailHref,
  formatDate,
  recruiterHeaders,
} from "../lib/api";

const AUTH_EVENT = "carrieres-recruteur-auth";

type Offer = {
  id: number | string;
  title: string;
  category: string;
  company: string;
  location: string;
  contract_type: string;
  deadline: string | null;
  featured?: boolean;
  featured_until?: string | null;
  created_at: string;
  views: number;
  apply_clicks: number;
  hidden: boolean;
};
type Space = { email: string; organization: string; contact: string; offers: Offer[] };

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function readToken() {
  try {
    return localStorage.getItem(RECRUITER_TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setRecruiterToken(token: string | null) {
  try {
    if (token) localStorage.setItem(RECRUITER_TOKEN_KEY, token);
    else localStorage.removeItem(RECRUITER_TOKEN_KEY);
  } catch {
    // stockage indisponible
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function useRecruiterToken() {
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  return { token, hydrated };
}

const number = (value: number) => Number(value || 0).toLocaleString("fr-FR");
const rate = (views: number, applies: number) => (views ? `${Math.round((applies / views) * 100)} %` : "—");

/** Espace recruteur : connexion, puis statistiques des offres rattachées à la société. */
export default function RecruiterSpace() {
  const { token, hydrated } = useRecruiterToken();
  const [notice, setNotice] = useState("");
  if (!hydrated) return <div className="rec-wrap"><p className="rec-muted">Chargement…</p></div>;
  return token ? (
    <RecruiterDashboard
      onExpired={(message) => {
        setNotice(message);
        setRecruiterToken(null);
      }}
    />
  ) : (
    <RecruiterLogin notice={notice} />
  );
}

function RecruiterLogin({ notice }: { notice: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await apiRequest<{ token: string }>("/recruiter/login", {
        method: "POST",
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") }),
      });
      setRecruiterToken(result.token);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rec-wrap rec-narrow">
      <form className="rec-card" onSubmit={login}>
        <h2>
          <LogIn size={20} /> Connexion
        </h2>
        {notice && <p className="rec-alert">{notice}</p>}
        <label className="rec-field">
          <span>E-mail</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="rec-field">
          <span>Mot de passe</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && (
          <p className="rec-alert" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <button className="pub-btn pub-btn-gold pub-btn-block" type="submit" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
        <p className="rec-muted">
          Mot de passe oublié ? Demandez un nouveau lien d’accès à{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Nouveau lien d’accès à mon espace recruteur")}`}>{CONTACT_EMAIL}</a>.
        </p>
      </form>
      <p className="rec-muted rec-center">
        L’espace recruteur est ouvert sur invitation aux entreprises qui publient avec nous.{" "}
        <Link href="/recruteurs">Publier une offre sur Carrières RDC</Link>
      </p>
    </div>
  );
}

function RecruiterDashboard({ onExpired }: { onExpired: (message: string) => void }) {
  const [space, setSpace] = useState<Space | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setSpace(await apiRequest<Space>("/recruiter/me", { headers: recruiterHeaders() }));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Espace indisponible.";
      if (/session|authentification|compte|suspendu|réservé/i.test(message)) return onExpired(message);
      setError(message);
    }
  }, [onExpired]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (error) {
    return (
      <div className="rec-wrap">
        <p className="rec-alert" role="alert">
          <TriangleAlert size={16} /> {error}
        </p>
      </div>
    );
  }
  if (!space) return <div className="rec-wrap"><p className="rec-muted">Chargement de votre espace…</p></div>;

  const views = space.offers.reduce((total, offer) => total + Number(offer.views || 0), 0);
  const applies = space.offers.reduce((total, offer) => total + Number(offer.apply_clicks || 0), 0);
  const online = space.offers.filter((offer) => !offer.hidden).length;

  return (
    <div className="rec-wrap">
      <div className="rec-head">
        <div>
          <span className="rec-eyebrow">Espace recruteur</span>
          <h2>{space.organization}</h2>
          <p className="rec-muted">
            Connecté{space.contact ? ` : ${space.contact}` : ""} ({space.email})
          </p>
        </div>
        <button type="button" className="pub-btn pub-btn-outline" onClick={() => setRecruiterToken(null)}>
          <LogOut size={16} /> Déconnexion
        </button>
      </div>

      <section className="rec-kpis" aria-label="Résultats de vos offres">
        <div><BriefcaseBusiness size={20} /><strong>{online}</strong><span>offre{online > 1 ? "s" : ""} en ligne sur {space.offers.length}</span></div>
        <div><Eye size={20} /><strong>{number(views)}</strong><span>consultations</span></div>
        <div><MousePointerClick size={20} /><strong>{number(applies)}</strong><span>clics sur « Postuler »</span></div>
        <div><Percent size={20} /><strong>{rate(views, applies)}</strong><span>des visiteurs ont cliqué</span></div>
      </section>

      <section className="rec-card rec-flush">
        <h2 className="rec-card-title">Vos offres</h2>
        {space.offers.length === 0 ? (
          <p className="rec-muted rec-pad">
            Aucune offre n’est encore rattachée à votre espace. Dès que nous publierons une offre pour vous, elle apparaîtra
            ici avec ses statistiques.
          </p>
        ) : (
          <div className="rec-table-wrap">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Offre</th>
                  <th>Date limite</th>
                  <th className="rec-num">Vues</th>
                  <th className="rec-num">Clics</th>
                  <th className="rec-actions">Détail</th>
                </tr>
              </thead>
              <tbody>
                {space.offers.map((offer) => (
                  <tr key={String(offer.id)}>
                    <td>
                      <strong>{decodeEntities(offer.title)}</strong>
                      <small>
                        Publiée le {formatDate(offer.created_at)} ·{" "}
                        <em className={offer.hidden ? "rec-off" : "rec-on"}>{offer.hidden ? "Retirée du site" : "En ligne"}</em>
                        {offer.featured && offer.featured_until && <> · <em className="rec-featured">★ À la une jusqu’au {formatDate(offer.featured_until)}</em></>}
                      </small>
                    </td>
                    <td className="rec-labeled" data-label="Date limite">{offer.deadline ? formatDate(offer.deadline) : "Non précisée"}</td>
                    <td className="rec-num rec-labeled" data-label="Vues">{number(offer.views)}</td>
                    <td className="rec-num rec-labeled" data-label="Clics">
                      {number(offer.apply_clicks)}
                      <small>{rate(offer.views, offer.apply_clicks)}</small>
                    </td>
                    <td className="rec-actions">
                      <Link className="pub-btn pub-btn-gold rec-btn-sm" href={`/espace-recruteur/bilan?id=${encodeURIComponent(String(offer.id))}`}>
                        <FileBarChart size={15} /> Bilan
                      </Link>
                      {!offer.hidden && (
                        <Link className="pub-btn pub-btn-outline rec-btn-sm" href={detailHref(offer)} target="_blank">
                          <Eye size={15} /> Voir
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rec-grid">
        <ProposalForm />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProposalForm() {
  const [state, setState] = useState<{ status: "idle" | "pending" | "ok" | "error"; text: string }>({ status: "idle", text: "" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setState({ status: "pending", text: "" });
    try {
      await apiRequest("/recruiter/proposals", {
        method: "POST",
        headers: recruiterHeaders(),
        body: JSON.stringify({ title: values.get("title"), details: values.get("details") }),
      });
      form.reset();
      setState({ status: "ok", text: "Merci ! Nous vérifions votre offre et la publions dans les meilleurs délais." });
    } catch (submitError) {
      setState({ status: "error", text: submitError instanceof Error ? submitError.message : "Envoi impossible." });
    }
  }

  return (
    <form className="rec-card" onSubmit={submit}>
      <h2 className="rec-card-title">
        <Send size={18} /> Proposer une nouvelle offre
      </h2>
      <label className="rec-field">
        <span>Intitulé du poste *</span>
        <input name="title" type="text" required maxLength={160} placeholder="Ex. Comptable senior" />
      </label>
      <label className="rec-field">
        <span>Détails *</span>
        <textarea
          name="details"
          required
          minLength={20}
          rows={6}
          placeholder="Lieu, type de contrat, missions, profil recherché, date limite et manière de postuler…"
        />
      </label>
      <p className="rec-muted">Vous avez l’avis en PDF ou en Word ? Envoyez-le aussi par e-mail ou WhatsApp.</p>
      {state.text && (
        <p className={state.status === "ok" ? "rec-success" : "rec-alert"} role="status">
          {state.status === "ok" ? <CircleCheck size={16} /> : <TriangleAlert size={16} />} {state.text}
        </p>
      )}
      <button className="pub-btn pub-btn-gold" type="submit" disabled={state.status === "pending"}>
        {state.status === "pending" ? "Envoi…" : "Envoyer à Carrières RDC"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [state, setState] = useState<{ status: "idle" | "pending" | "ok" | "error"; text: string }>({ status: "idle", text: "" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (values.get("password") !== values.get("confirm")) {
      setState({ status: "error", text: "Les deux nouveaux mots de passe ne sont pas identiques." });
      return;
    }
    setState({ status: "pending", text: "" });
    try {
      await apiRequest("/recruiter/password", {
        method: "POST",
        headers: recruiterHeaders(),
        body: JSON.stringify({ current: values.get("current"), password: values.get("password") }),
      });
      form.reset();
      setState({ status: "ok", text: "Mot de passe modifié." });
    } catch (submitError) {
      setState({ status: "error", text: submitError instanceof Error ? submitError.message : "Modification impossible." });
    }
  }

  return (
    <form className="rec-card" onSubmit={submit}>
      <h2 className="rec-card-title">
        <KeyRound size={18} /> Changer mon mot de passe
      </h2>
      <label className="rec-field">
        <span>Mot de passe actuel</span>
        <input name="current" type="password" required autoComplete="current-password" />
      </label>
      <label className="rec-field">
        <span>Nouveau mot de passe (8 caractères minimum)</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label className="rec-field">
        <span>Confirmer le nouveau mot de passe</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      {state.text && (
        <p className={state.status === "ok" ? "rec-success" : "rec-alert"} role="status">
          {state.status === "ok" ? <CircleCheck size={16} /> : <TriangleAlert size={16} />} {state.text}
        </p>
      )}
      <button className="pub-btn pub-btn-outline" type="submit" disabled={state.status === "pending"}>
        {state.status === "pending" ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

/** Lien d'accès envoyé par l'administrateur : le recruteur choisit son mot de passe, puis entre dans son espace. */
export function RecruiterActivate({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState(token ? "" : "Lien incomplet. Ouvrez le lien reçu en entier, ou demandez-en un nouveau.");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirm")) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await apiRequest<{ token: string }>("/recruiter/activate", {
        method: "POST",
        body: JSON.stringify({ token, password: values.get("password") }),
      });
      setRecruiterToken(result.token);
      router.replace("/espace-recruteur");
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Activation impossible.");
      setPending(false);
    }
  }

  return (
    <div className="rec-wrap rec-narrow">
      <form className="rec-card" onSubmit={submit}>
        <h2>
          <KeyRound size={20} /> Choisissez votre mot de passe
        </h2>
        <p className="rec-muted">Il vous servira à vous connecter à votre espace recruteur, avec votre adresse e-mail.</p>
        <label className="rec-field">
          <span>Mot de passe (8 caractères minimum)</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" disabled={!token} />
        </label>
        <label className="rec-field">
          <span>Confirmer le mot de passe</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" disabled={!token} />
        </label>
        {error && (
          <p className="rec-alert" role="alert">
            <TriangleAlert size={16} /> {error}
          </p>
        )}
        <button className="pub-btn pub-btn-gold pub-btn-block" type="submit" disabled={pending || !token}>
          {pending ? "Activation…" : "Activer mon espace"}
        </button>
        <p className="rec-muted">
          Lien expiré ? Demandez-en un nouveau à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </form>
    </div>
  );
}
