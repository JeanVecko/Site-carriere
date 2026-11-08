"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Announcement, apiRequest, decodeEntities, isExpired } from "../lib/api";
import OfferRow from "./OfferRow";
import AnnouncementTile from "./AnnouncementTile";

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
    intro: "Missions, projets, formations et opportunités professionnelles partout en RDC.",
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

const PERIODS = [
  { value: "all", label: "Toutes les dates", days: Infinity },
  { value: "1", label: "Dernières 24 h", days: 1 },
  { value: "7", label: "7 derniers jours", days: 7 },
  { value: "30", label: "30 derniers jours", days: 30 },
] as const;

const PAGE_SIZE = 12;

// Ville = première partie de la localisation (« Kinshasa · Gombe » → « Kinshasa »).
function cityOf(item: Announcement): string {
  const city = decodeEntities(item.location).split(/[·,(/-]/)[0].trim();
  return city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
}

function countBy(items: Announcement[], key: (item: Announcement) => string): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
}

export default function CategoryList({ category }: { category: string }) {
  const config = CATEGORIES[category];
  // Les annonces s'affichent en grille de cartes avec image ; offres et appels d'offres en liste.
  const isGrid = category === "notices";
  const [items, setItems] = useState<Announcement[] | null>(null);
  // Recherche lancée depuis la page d'accueil : /offres?q=comptable
  const [search, setSearch] = useState(useSearchParams().get("q") ?? "");
  const [contracts, setContracts] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("all");
  const [sort, setSort] = useState<"recent" | "deadline">("recent");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Heure de référence pour le filtre « date de publication » (fixée au chargement des offres).
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    apiRequest<Announcement[]>(`/announcements?category=${encodeURIComponent(config.value)}`)
      .then((list) => {
        setLoadedAt(Date.now());
        setItems(list);
      })
      .catch(() => setItems([]));
  }, [config.value]);

  const all = useMemo(() => items || [], [items]);
  const contractCounts = useMemo(() => countBy(all, (item) => item.contract_type || ""), [all]);
  const cityCounts = useMemo(() => countBy(all, cityOf), [all]);

  const needle = search.trim().toLowerCase();
  const maxDays = PERIODS.find((entry) => entry.value === period)!.days;
  const filtered = all
    .filter((item) => contracts.length === 0 || contracts.includes(item.contract_type || ""))
    .filter((item) => !city || cityOf(item) === city)
    .filter((item) => maxDays === Infinity || (item.created_at && loadedAt - new Date(item.created_at).getTime() <= maxDays * 86_400_000))
    .filter((item) => `${item.title} ${item.company} ${item.location} ${item.description}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      // Offres encore ouvertes d'abord ; les offres expirées (encore visibles 24 h) à la fin.
      const expiredGap = Number(isExpired(a)) - Number(isExpired(b));
      if (expiredGap) return expiredGap;
      if (sort === "deadline") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      }
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  const openCount = filtered.filter((item) => !isExpired(item)).length;
  const activeFilters = contracts.length + (city ? 1 : 0) + (period !== "all" ? 1 : 0);

  const resetPaging = () => setShown(PAGE_SIZE);
  const toggleContract = (value: string) => {
    setContracts((list) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]));
    resetPaging();
  };
  const clearFilters = () => {
    setContracts([]);
    setCity("");
    setPeriod("all");
    resetPaging();
  };

  return (
    <main>
      <section className="pub-list-hero">
        <div className="pub-container">
          <nav className="pub-breadcrumb pub-breadcrumb-light" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link> <span aria-hidden="true">/</span> <span>{config.title}</span>
          </nav>
          <h1>{config.title}</h1>
          <p>{config.intro}</p>
          <form className="pub-list-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                placeholder="Poste, entreprise, mot-clé…"
                aria-label={`Rechercher parmi les ${config.title.toLowerCase()}`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPaging();
                }}
              />
            </label>
            <label>
              <MapPin size={18} aria-hidden="true" />
              <select
                aria-label="Ville"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  resetPaging();
                }}
              >
                <option value="">Toutes les villes</option>
                {cityCounts.map(([value]) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </div>
      </section>

      <div className="pub-container pub-results-layout">
        <aside className={`pub-filters${filtersOpen ? " is-open" : ""}`} aria-label="Filtres">
          <div className="pub-filters-head">
            <h2>Filtres</h2>
            {activeFilters > 0 && (
              <button type="button" className="pub-link-btn" onClick={clearFilters}>
                Tout effacer
              </button>
            )}
          </div>

          {!isGrid && contractCounts.length > 0 && (
            <fieldset>
              <legend>Type de contrat</legend>
              {contractCounts.map(([value, count]) => (
                <label key={value} className="pub-check">
                  <input type="checkbox" checked={contracts.includes(value)} onChange={() => toggleContract(value)} />
                  <span>{value}</span>
                  <em>{count}</em>
                </label>
              ))}
            </fieldset>
          )}

          <fieldset>
            <legend>Date de publication</legend>
            {PERIODS.map((entry) => (
              <label key={entry.value} className="pub-check">
                <input
                  type="radio"
                  name="period"
                  checked={period === entry.value}
                  onChange={() => {
                    setPeriod(entry.value);
                    resetPaging();
                  }}
                />
                <span>{entry.label}</span>
              </label>
            ))}
          </fieldset>

          {cityCounts.length > 0 && (
            <fieldset>
              <legend>Ville</legend>
              {cityCounts.slice(0, 8).map(([value, count]) => (
                <label key={value} className="pub-check">
                  <input
                    type="radio"
                    name="city"
                    checked={city === value}
                    onChange={() => {
                      setCity(value);
                      resetPaging();
                    }}
                  />
                  <span>{value}</span>
                  <em>{count}</em>
                </label>
              ))}
            </fieldset>
          )}

          <button type="button" className="pub-btn pub-btn-navy pub-btn-block pub-filters-close" onClick={() => setFiltersOpen(false)}>
            Voir les {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </button>
        </aside>

        <section className="pub-results" aria-label={`Liste des ${config.title.toLowerCase()}`}>
          <div className="pub-results-bar">
            <p>
              {items === null ? (
                "Chargement…"
              ) : (
                <>
                  <strong>{openCount}</strong> {openCount > 1 ? config.plural : config.noun} en cours
                  {filtered.length > openCount && ` · ${filtered.length - openCount} expirée${filtered.length - openCount > 1 ? "s" : ""}`}
                </>
              )}
            </p>
            <div className="pub-results-actions">
              <button type="button" className="pub-btn pub-btn-outline pub-filters-toggle" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal size={16} /> Filtres{activeFilters > 0 ? ` (${activeFilters})` : ""}
              </button>
              <label className="pub-sort">
                <span>Trier :</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as "recent" | "deadline")}>
                  <option value="recent">Plus récentes</option>
                  <option value="deadline">Date limite proche</option>
                </select>
              </label>
            </div>
          </div>

          {activeFilters > 0 && (
            <div className="pub-active-filters">
              {contracts.map((value) => (
                <button key={value} type="button" onClick={() => toggleContract(value)}>
                  {value} <X size={13} />
                </button>
              ))}
              {city && (
                <button type="button" onClick={() => setCity("")}>
                  {city} <X size={13} />
                </button>
              )}
              {period !== "all" && (
                <button type="button" onClick={() => setPeriod("all")}>
                  {PERIODS.find((entry) => entry.value === period)!.label} <X size={13} />
                </button>
              )}
            </div>
          )}

          {items === null ? (
            <ul className={isGrid ? "pub-tiles" : "pub-jobs"} aria-hidden="true">
              {(isGrid ? [0, 1, 2, 3, 4, 5] : [0, 1, 2]).map((index) => (
                <li key={index} className={`pub-skeleton${isGrid ? " is-tile" : ""}`} />
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <div className="pub-empty">
              <p>Aucun résultat ne correspond à votre recherche.</p>
              {(activeFilters > 0 || search) && (
                <button
                  type="button"
                  className="pub-btn pub-btn-outline"
                  onClick={() => {
                    clearFilters();
                    setSearch("");
                  }}
                >
                  Effacer la recherche et les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <ul className={isGrid ? "pub-tiles" : "pub-jobs"}>
                {filtered.slice(0, shown).map((item) =>
                  isGrid ? <AnnouncementTile key={String(item.id)} item={item} /> : <OfferRow key={String(item.id)} item={item} />
                )}
              </ul>
              {filtered.length > shown && (
                <div className="pub-more">
                  <button type="button" className="pub-btn pub-btn-outline" onClick={() => setShown((value) => value + PAGE_SIZE)}>
                    Afficher plus ({filtered.length - shown} restante{filtered.length - shown > 1 ? "s" : ""})
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {filtersOpen && <div className="pub-filters-backdrop" onClick={() => setFiltersOpen(false)} />}
    </main>
  );
}
