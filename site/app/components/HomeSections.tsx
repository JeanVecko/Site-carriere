"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  FileCheck2,
  MapPin,
  Megaphone,
  Search,
  Sparkles,
} from "lucide-react";
import { Announcement, apiRequest, categoryFor, detailHref, escapeHtml } from "../lib/api";

const CATEGORIES: Array<{ key: string; label: string; previewId: string }> = [
  { key: "Offre d’emploi", label: "Offres d’emploi", previewId: "jobs-preview" },
  { key: "Annonce", label: "Annonces", previewId: "notices-preview" },
  { key: "Appel d’offre", label: "Appels d’offres", previewId: "tenders-preview" },
];

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentFilter, setCurrentFilter] = useState("Toutes");
  const [newestFirst, setNewestFirst] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setAnnouncements(await apiRequest<Announcement[]>("/announcements"));
      } catch {
        setAnnouncements(
          JSON.parse(localStorage.getItem("carrieres-rdc-announcements") || "null") || []
        );
      }
    })();
  }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = announcements.filter((announcement) => {
      const searchable = `${announcement.title} ${announcement.company} ${announcement.location} ${announcement.description}`.toLowerCase();
      return (
        (currentFilter === "Toutes" || categoryFor(announcement) === currentFilter) &&
        searchable.includes(needle)
      );
    });
    return newestFirst ? filtered : [...filtered].reverse();
  }, [announcements, currentFilter, newestFirst, search]);

  const shown = visible.slice(0, 4);

  const previews = useMemo(
    () =>
      CATEGORIES.map(({ key }) => ({
        key,
        items: announcements
          .filter((item) => categoryFor(item) === key)
          .slice(0, 2),
      })),
    [announcements]
  );

  return (
    <>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line"></span> Le marché local des opportunités
            </p>
            <h1 id="hero-title">
              La prochaine
              <br />
              <em>bonne rencontre</em>
              <br />
              commence ici.
            </h1>
            <p className="hero-intro">
              Offres d’emploi, annonces et appels d’offres : trouvez ce qui vous ressemble, ou faites
              connaître votre besoin et vos services.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#annonces">
                Voir les annonces <ArrowDownRight size={16} />
              </a>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Illustration de personnes collaborant autour d'une table"
          >
            <div className="image-frame"></div>
            <div className="visual-note note-top">
              <span className="note-number">01</span>
              <span>
                Des opportunités
                <br />
                qui ont du sens
              </span>
            </div>
            <div className="visual-note note-bottom">
              <Sparkles size={22} />
              <span>
                Simple. Humain.
                <br />
                Direct.
              </span>
            </div>
          </div>
          <div className="hero-ticker">
            <span>À la une</span>
            <strong>+ 240 opportunités actives</strong>
            <span className="ticker-arrow">↗</span>
          </div>
        </section>

        <section className="content-section" id="annonces" aria-labelledby="list-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line"></span> Sélection du moment
              </p>
              <h2 id="list-title">
                Les annonces
                <br />
                <em>à découvrir.</em>
              </h2>
            </div>
            <p className="section-description">
              Des opportunités choisies pour avancer, apprendre et construire la suite.
            </p>
          </div>

          <div className="toolbar" role="search">
            <label className="search-box">
              <Search size={17} />
              <input
                id="search-input"
                type="search"
                placeholder="Rechercher un métier, une ville en RDC..."
                aria-label="Rechercher une annonce"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="filter-group" aria-label="Filtrer par type">
              {["Toutes", "Offre d’emploi", "Annonce", "Appel d’offre"].map((label) => (
                <button
                  key={label}
                  className={`filter-button${currentFilter === label ? " active" : ""}`}
                  type="button"
                  onClick={() => setCurrentFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="sort-button"
              type="button"
              onClick={() => setNewestFirst((value) => !value)}
            >
              {newestFirst ? "Plus récentes" : "Plus anciennes"} <ChevronDown size={14} />
            </button>
          </div>

          <div className="announcement-layout">
            <aside className="side-stat">
              <span className="stat-label">La communauté</span>
              <strong>1 284</strong>
              <span>
                personnes et équipes
                <br />
                en mouvement
              </span>
              <div className="avatar-stack" aria-hidden="true">
                <span>ML</span>
                <span>AS</span>
                <span>TK</span>
                <span>+</span>
              </div>
              <a href="#annonces" className="side-link">
                Voir les opportunités <ArrowUpRight size={13} />
              </a>
            </aside>
            <div className="announcement-list" id="announcement-list" aria-live="polite">
              {shown.map((announcement) => (
                <a
                  key={String(announcement.id ?? announcement._id)}
                  className="announcement-card"
                  href={detailHref(announcement)}
                >
                  <div className="card-meta">
                    <span className="tag">{escapeHtml(categoryFor(announcement))}</span>
                    <span className="date">{escapeHtml(announcement.date || "Récent")}</span>
                  </div>
                  <h3>{escapeHtml(announcement.title)}</h3>
                  <span className="company">{escapeHtml(announcement.company)}</span>
                  <span className="location">
                    <MapPin size={14} />
                    {escapeHtml(announcement.location)}
                  </span>
                  <span className="detail-hint">
                    Voir le détail complet <ArrowUpRight size={13} />
                  </span>
                </a>
              ))}
            </div>
          </div>
          <div className="empty-state" id="empty-state" hidden={visible.length > 0}>
            Aucune annonce ne correspond à votre recherche.
          </div>
        </section>

        <section className="directory-section" aria-labelledby="directory-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line"></span> Tout au même endroit
              </p>
              <h2 id="directory-title">
                Explorez par
                <br />
                <em>catégorie.</em>
              </h2>
            </div>
            <p className="section-description">
              Retrouvez rapidement les opportunités qui correspondent à votre recherche.
            </p>
          </div>
          <div className="directory-grid">
            <article className="directory-card directory-jobs">
              <span className="directory-index">01</span>
              <BriefcaseBusiness size={25} />
              <h3>Offres d’emploi</h3>
              <p>Des postes ouverts dans les entreprises et organisations de la RDC.</p>
              <ul className="directory-preview">
                {renderPreview(previews.find((p) => p.key === "Offre d’emploi")?.items)}
              </ul>
              <Link className="directory-link" href="/offres">
                Voir toutes les offres <ArrowUpRight size={14} />
              </Link>
            </article>
            <article className="directory-card directory-notices">
              <span className="directory-index">02</span>
              <Megaphone size={25} />
              <h3>Annonces</h3>
              <p>Des missions, projets et opportunités à découvrir au quotidien.</p>
              <ul className="directory-preview">
                {renderPreview(previews.find((p) => p.key === "Annonce")?.items)}
              </ul>
              <Link className="directory-link" href="/annonces">
                Voir toutes les annonces <ArrowUpRight size={14} />
              </Link>
            </article>
            <article className="directory-card directory-tenders">
              <span className="directory-index">03</span>
              <FileCheck2 size={25} />
              <h3>Appels d’offres</h3>
              <p>Les consultations et marchés publiés par les organisations.</p>
              <ul className="directory-preview">
                {renderPreview(previews.find((p) => p.key === "Appel d’offre")?.items)}
              </ul>
              <Link className="directory-link" href="/appels-offres">
                Voir tous les appels d’offres <ArrowUpRight size={14} />
              </Link>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}

function renderPreview(items?: Announcement[]) {
  if (!items || items.length === 0)
    return <li className="preview-empty">Aucune publication</li>;
  return items.map((item) => (
    <li key={String(item.id ?? item.title)}>
      {escapeHtml(item.title)} <small>{escapeHtml(item.location)}</small>
    </li>
  ));
}
