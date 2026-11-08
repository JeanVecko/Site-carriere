import Link from "next/link";
import { ArrowUpRight, FileText, MapPin } from "lucide-react";
import { type Announcement, decodeEntities, detailHref, formatDate, isExpired, paragraphs } from "../lib/api";

// Carte d'une publication, utilisée sur l'accueil et dans les listes par catégorie.
export default function AnnouncementCard({ item }: { item: Announcement }) {
  const expired = isExpired(item);
  const mediaCount = Number(item.media_count ?? item.media?.length ?? 0);
  return (
    <Link
      className={`announcement-card category-item${expired ? " is-expired" : ""}`}
      href={detailHref(item)}
    >
      <div className="card-meta">
        <span className="card-badges">
          <span className="tag">{item.category}</span>
          {item.contract_type && <span className="tag">{item.contract_type}</span>}
        </span>
        <span className="date">{item.created_at ? `Publiée le ${formatDate(item.created_at)}` : "Récent"}</span>
      </div>
      <h3>{decodeEntities(item.title)}</h3>
      <span className="company">{decodeEntities(item.company)}</span>
      <p className="category-description">{paragraphs(String(item.description))[0] || ""}</p>
      <span className="location">
        <MapPin size={14} />
        {decodeEntities(item.location)}
      </span>
      {item.deadline && (
        <span className={`card-deadline${expired ? " is-expired" : ""}`}>
          {expired ? "Expirée le" : "Date limite :"} {formatDate(item.deadline)}
        </span>
      )}
      <span className="detail-hint">
        Voir l’offre <ArrowUpRight size={13} />
      </span>
      {mediaCount > 0 && (
        <span className="media-status">
          <FileText size={13} /> {mediaCount} document{mediaCount > 1 ? "s" : ""} joint{mediaCount > 1 ? "s" : ""}
        </span>
      )}
    </Link>
  );
}
