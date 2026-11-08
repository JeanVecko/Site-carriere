import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { type Announcement, decodeEntities, detailHref, formatDate } from "../lib/api";

// Ligne compacte d'une offre, pour la liste de la page d'accueil.
export default function OfferRow({ item }: { item: Announcement }) {
  return (
    <li>
      <Link className="offer-row" href={detailHref(item)}>
        <span className="offer-row-main">
          <strong>{decodeEntities(item.title)}</strong>
          <span className="offer-row-meta">
            {decodeEntities(item.company)}
            <span aria-hidden="true"> · </span>
            <MapPin size={12} aria-hidden="true" /> {decodeEntities(item.location)}
            {item.contract_type && <span className="tag">{item.contract_type}</span>}
          </span>
        </span>
        <span className="offer-row-dates">
          {item.created_at && <span>{formatDate(item.created_at)}</span>}
          {item.deadline && <span className="offer-row-deadline">Jusqu’au {formatDate(item.deadline)}</span>}
        </span>
        <ChevronRight className="offer-row-arrow" size={18} aria-hidden="true" />
      </Link>
    </li>
  );
}
