"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { Announcement, apiRequest, detailHref, escapeHtml, paragraphs } from "../lib/api";

const LABELS: Record<string, string> = {
  jobs: "Offre d’emploi",
  notices: "Annonce",
  tenders: "Appel d’offre",
};

const DISPLAY: Record<string, string> = {
  jobs: "Offres d’emploi",
  notices: "Annonces",
  tenders: "Appels d’offres",
};

export default function CategoryList({ category }: { category: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setItems(
          await apiRequest<Announcement[]>(
            `/announcements?category=${encodeURIComponent(LABELS[category])}`
          )
        );
      } catch {
        setItems([]);
      }
    })();
  }, [category]);

  const needle = search.trim().toLowerCase();
  const visible = items.filter((item) =>
    `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(needle)
  );

  const display = DISPLAY[category] || category;

  return (
    <main className="category-main">
      <section className="category-hero">
        <p className="eyebrow">
          <span className="eyebrow-line"></span>
          {category === "jobs"
            ? " Opportunités professionnelles en RDC"
            : category === "notices"
              ? " La vie professionnelle en mouvement"
              : " Consultations et marchés en RDC"}
        </p>
        <h1 id="category-title">
          {display.split(" ")[0]}
          <br />
          <em>{display.split(" ").slice(1).join(" ")}</em>
        </h1>
        <p>
          {category === "jobs"
            ? "Les postes ouverts dans les entreprises et organisations de la République démocratique du Congo."
            : category === "notices"
              ? "Des missions, projets et opportunités à découvrir au quotidien partout en RDC."
              : "Les consultations et marchés publiés par les organisations et institutions."}
        </p>
      </section>
      <section className="category-content">
        <div className="category-toolbar">
          <label className="search-box">
            <Search size={17} />
            <input
              id="category-search"
              type="search"
              placeholder={`Rechercher ${category === "tenders" ? "un appel d’offre" : "une annonce"}...`}
              aria-label={`Rechercher ${category === "tenders" ? "un appel d’offre" : "une annonce"}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <a className="text-button" href="/#annonces">
            Retour à l’accueil <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="category-list" id="category-list">
          {visible.map((item) => (
            <a
              key={String(item.id ?? item.title)}
              className="announcement-card category-item"
              href={detailHref(item)}
            >
              <div className="card-meta">
                <span className="tag">{escapeHtml(item.category || LABELS[category])}</span>
                <span className="date">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString("fr-FR")
                    : "Récent"}
                </span>
              </div>
              <h3>{escapeHtml(item.title)}</h3>
              <span className="company">{escapeHtml(item.company)}</span>
              <p className="category-description">
                {escapeHtml(paragraphs(String(item.description))[0] || "")}
              </p>
              <span className="location">
                <MapPin size={14} />
                {escapeHtml(item.location)}
              </span>
              <span className="detail-hint">
                Voir le détail complet <ArrowUpRight size={13} />
              </span>
            </a>
          ))}
        </div>
        <div className="empty-state" id="category-empty" hidden={visible.length > 0}>
          {category === "tenders"
            ? "Aucun appel d’offre ne correspond à votre recherche."
            : "Aucune annonce ne correspond à votre recherche."}
        </div>
      </section>
    </main>
  );
}
