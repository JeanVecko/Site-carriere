"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { Announcement, apiRequest, isExpired } from "../lib/api";
import OfferRow from "./OfferRow";

const CATEGORIES: Record<string, { value: string; title: string; intro: string; noun: string; plural: string }> = {
  jobs: {
    value: "Offre d’emploi",
    title: "Offres d’emploi",
    intro: "Les postes ouverts dans les entreprises, ONG et institutions de la République démocratique du Congo.",
    noun: "offre",
    plural: "offres",
  },
  notices: {
    value: "Annonce",
    title: "Annonces",
    intro: "Missions, projets et opportunités professionnelles partout en RDC.",
    noun: "annonce",
    plural: "annonces",
  },
  tenders: {
    value: "Appel d’offre",
    title: "Appels d’offres",
    intro: "Consultations et marchés publiés par les organisations et institutions.",
    noun: "appel d’offres",
    plural: "appels d’offres",
  },
};

export default function CategoryList({ category }: { category: string }) {
  const config = CATEGORIES[category];
  const [items, setItems] = useState<Announcement[] | null>(null);
  // Recherche lancée depuis la page d'accueil : /offres?q=comptable
  const [search, setSearch] = useState(useSearchParams().get("q") ?? "");
  const [contract, setContract] = useState("Tous");

  useEffect(() => {
    apiRequest<Announcement[]>(`/announcements?category=${encodeURIComponent(config.value)}`)
      // Offres encore ouvertes d'abord, les offres expirées à la fin.
      .then((list) => setItems([...list].sort((a, b) => Number(isExpired(a)) - Number(isExpired(b)))))
      .catch(() => setItems([]));
  }, [config.value]);

  const contracts = useMemo(
    () => ["Tous", ...new Set((items || []).map((item) => item.contract_type).filter((value): value is string => Boolean(value)))],
    [items]
  );

  const needle = search.trim().toLowerCase();
  const visible = (items || []).filter(
    (item) =>
      (contract === "Tous" || item.contract_type === contract) &&
      `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(needle)
  );
  const openCount = visible.filter((item) => !isExpired(item)).length;

  return (
    <main>
      <section className="pub-page-head">
        <div className="pub-container">
          <nav className="pub-breadcrumb" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>{config.title}</span>
          </nav>
          <h1>{config.title}</h1>
          <p>{config.intro}</p>
        </div>
      </section>

      <section className="pub-container" aria-label={`Liste des ${config.title.toLowerCase()}`}>
        <div className="pub-toolbar">
          <label className="pub-filter-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Poste, entreprise, ville…"
              aria-label={`Rechercher parmi les ${config.title.toLowerCase()}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {contracts.length > 2 && (
            <div className="pub-filter-chips" role="group" aria-label="Type de contrat">
              {contracts.map((value) => (
                <button key={value} type="button" className={contract === value ? "is-active" : undefined} onClick={() => setContract(value)}>
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pub-list-head">
          <p>
            {items === null
              ? "Chargement…"
              : `${openCount} ${openCount > 1 ? config.plural : config.noun} en cours${visible.length > openCount ? ` · ${visible.length - openCount} expirée${visible.length - openCount > 1 ? "s" : ""}` : ""}`}
          </p>
        </div>

        {items !== null && visible.length === 0 ? (
          <p className="pub-empty">Aucun résultat ne correspond à votre recherche.</p>
        ) : (
          <ul className="pub-jobs">
            {visible.map((item) => (
              <OfferRow key={String(item.id)} item={item} />
            ))}
          </ul>
        )}
        <div style={{ height: 40 }} />
      </section>
    </main>
  );
}
