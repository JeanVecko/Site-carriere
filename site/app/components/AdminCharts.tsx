"use client";

import { useState } from "react";
import { type Announcement, decodeEntities } from "../lib/api";

/* Graphiques du tableau de bord admin, dessinés en SVG/HTML (aucune dépendance).
   Couleurs : palette catégorielle validée (bleu, orange, turquoise) ; le texte reste en encre neutre. */

const CATEGORY_ORDER = ["Offre d’emploi", "Annonce", "Appel d’offre"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  "Offre d’emploi": "Offres d’emploi",
  Annonce: "Annonces",
  "Appel d’offre": "Appels d’offres",
};

type Tooltip = { x: number; y: number; title: string; value: string } | null;

function TooltipBox({ tip }: { tip: Tooltip }) {
  if (!tip) return null;
  return (
    <div className="viz-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      <span>{tip.title}</span>
      <strong>{tip.value}</strong>
    </div>
  );
}

/* ----- 1. Publications par mois (colonnes) ----- */

export function PublicationsChart({ announcements }: { announcements: Announcement[] }) {
  const [tip, setTip] = useState<Tooltip>(null);
  const [active, setActive] = useState<number | null>(null);

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { year: date.getFullYear(), month: date.getMonth(), date, count: 0 };
  });
  for (const item of announcements) {
    if (!item.created_at) continue;
    const created = new Date(item.created_at);
    const slot = months.find((m) => m.year === created.getFullYear() && m.month === created.getMonth());
    if (slot) slot.count += 1;
  }

  const width = 560;
  const height = 210;
  const pad = { top: 22, right: 8, bottom: 26, left: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...months.map((m) => m.count));
  const step = Math.max(1, Math.ceil(max / 3));
  const top = step * 3;
  const band = plotW / months.length;
  const barW = Math.min(36, band * 0.5);
  const y = (value: number) => pad.top + plotH - (value / top) * plotH;
  const last = months.length - 1;
  const monthLabel = (date: Date) => date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
  const total = months.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="viz-frame">
      <svg viewBox={`0 0 ${width} ${height}`} className="viz-svg" role="img" aria-label={`Publications par mois sur 6 mois : ${months.map((m) => `${monthLabel(m.date)} ${m.count}`).join(", ")}`}>
        {[0, 1, 2, 3].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick * step)} y2={y(tick * step)} className={tick === 0 ? "viz-baseline" : "viz-grid"} />
            <text x={pad.left - 8} y={y(tick * step) + 4} className="viz-axis" textAnchor="end">
              {tick * step}
            </text>
          </g>
        ))}
        {months.map((m, index) => {
          const cx = pad.left + band * index + band / 2;
          const barH = y(0) - y(m.count);
          const r = Math.min(4, barH);
          const x0 = cx - barW / 2;
          const x1 = cx + barW / 2;
          const yTop = y(m.count);
          const path = barH > 0
            ? `M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x1 - r} Q${x1},${yTop} ${x1},${yTop + r} V${y(0)} Z`
            : "";
          return (
            <g key={`${m.year}-${m.month}`}>
              {path && <path d={path} className={`viz-bar${active === index ? " is-active" : ""}`} />}
              <text x={cx} y={height - 8} className="viz-axis" textAnchor="middle">
                {monthLabel(m.date)}
              </text>
              {index === last && m.count > 0 && (
                <text x={cx} y={yTop - 7} className="viz-value" textAnchor="middle">
                  {m.count}
                </text>
              )}
              <rect
                x={pad.left + band * index}
                y={pad.top}
                width={band}
                height={plotH}
                className="viz-hit"
                onMouseEnter={(event) => {
                  setActive(index);
                  const box = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setTip({
                    x: ((cx / width) * box.width),
                    y: ((yTop / height) * box.height),
                    title: m.date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
                    value: `${m.count} publication${m.count > 1 ? "s" : ""}`,
                  });
                }}
                onMouseLeave={() => {
                  setActive(null);
                  setTip(null);
                }}
              />
            </g>
          );
        })}
      </svg>
      <TooltipBox tip={tip} />
      <p className="viz-caption">{total} publication{total > 1 ? "s" : ""} sur les 6 derniers mois</p>
    </div>
  );
}

/* ----- 2. Vues par offre (barres horizontales, top 6) ----- */

export function TopViewsChart({ announcements }: { announcements: Announcement[] }) {
  const [tip, setTip] = useState<Tooltip>(null);
  const rows = [...announcements]
    .filter((item) => Number(item.views || 0) > 0)
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 6);
  const max = Math.max(1, ...rows.map((item) => Number(item.views || 0)));

  if (rows.length === 0) return <p className="adm-empty">Les consultations apparaîtront ici dès les premières visites.</p>;

  return (
    <div className="viz-frame">
      <ul className="viz-hbars" aria-label="Offres les plus consultées">
        {rows.map((item) => {
          const views = Number(item.views || 0);
          const title = decodeEntities(item.title);
          return (
            <li
              key={String(item.id)}
              onMouseEnter={(event) => {
                const row = event.currentTarget.getBoundingClientRect();
                const frame = (event.currentTarget.closest(".viz-frame") as HTMLElement).getBoundingClientRect();
                setTip({ x: row.left - frame.left + row.width / 2, y: row.top - frame.top, title, value: `${views.toLocaleString("fr-FR")} vue${views > 1 ? "s" : ""}` });
              }}
              onMouseLeave={() => setTip(null)}
            >
              <span className="viz-hbar-label">{title}</span>
              <span className="viz-hbar-track">
                <span className="viz-hbar-fill" style={{ width: `${Math.max(2, (views / max) * 100)}%` }} />
              </span>
              <span className="viz-hbar-value">{views.toLocaleString("fr-FR")}</span>
            </li>
          );
        })}
      </ul>
      <TooltipBox tip={tip} />
    </div>
  );
}

/* ----- 3. Répartition par catégorie (barre segmentée + légende) ----- */

export function CategorySplitChart({ announcements }: { announcements: Announcement[] }) {
  const [tip, setTip] = useState<Tooltip>(null);
  const total = announcements.length;
  const parts = CATEGORY_ORDER.map((category, index) => {
    const count = announcements.filter((item) => item.category === category).length;
    return { category, label: CATEGORY_LABELS[category], count, share: total ? count / total : 0, slot: index + 1 };
  });

  if (total === 0) return <p className="adm-empty">Aucune publication pour le moment.</p>;

  return (
    <div className="viz-frame">
      <div className="viz-segments" role="img" aria-label={parts.map((p) => `${p.label} : ${p.count}`).join(", ")}>
        {parts
          .filter((part) => part.count > 0)
          .map((part) => (
            <span
              key={part.category}
              className={`viz-segment viz-series-${part.slot}`}
              style={{ flexGrow: part.count }}
              onMouseEnter={(event) => {
                const seg = event.currentTarget.getBoundingClientRect();
                const frame = (event.currentTarget.closest(".viz-frame") as HTMLElement).getBoundingClientRect();
                setTip({ x: seg.left - frame.left + seg.width / 2, y: seg.top - frame.top, title: part.label, value: `${part.count} · ${Math.round(part.share * 100)} %` });
              }}
              onMouseLeave={() => setTip(null)}
            />
          ))}
      </div>
      <TooltipBox tip={tip} />
      <ul className="viz-legend">
        {parts.map((part) => (
          <li key={part.category}>
            <span className={`viz-swatch viz-series-${part.slot}`} aria-hidden="true" />
            <span>{part.label}</span>
            <strong>{part.count}</strong>
            <em>{Math.round(part.share * 100)} %</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
