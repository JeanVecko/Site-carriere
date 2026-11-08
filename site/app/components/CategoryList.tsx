"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Announcement, apiRequest, isExpired } from "../lib/api";
import AnnouncementCard from "./AnnouncementCard";

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
  // Recherche lancée depuis la page d'accueil : /offres?q=comptable
  const [search, setSearch] = useState(useSearchParams().get("q") ?? "");

  useEffect(() => {
    (async () => {
      try {
        const list = await apiRequest<Announcement[]>(
          `/announcements?category=${encodeURIComponent(LABELS[category])}`
        );
        // Offres encore ouvertes d'abord, les offres expirées à la fin.
        setItems([...list].sort((a, b) => Number(isExpired(a)) - Number(isExpired(b))));
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
          <Link className="text-button" href="/">
            Retour à l’accueil <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="category-list" id="category-list">
          {visible.map((item) => (
            <AnnouncementCard key={String(item.id ?? item.title)} item={item} />
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
