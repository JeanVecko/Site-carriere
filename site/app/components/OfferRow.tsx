import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, Clock, MapPin } from "lucide-react";
import { type Announcement, companyAvatar, decodeEntities, detailHref, formatDate, isExpired, timeAgo } from "../lib/api";

// Fiche d'une offre dans une liste (accueil et pages de catégorie).
export default function OfferRow({ item, showCategory = false }: { item: Announcement; showCategory?: boolean }) {
  const expired = isExpired(item);
  const avatar = companyAvatar(item.company);
  return (
    <li>
      <Link className={`pub-job${expired ? " is-expired" : ""}`} href={detailHref(item)}>
        <span className={`pub-avatar tone-${avatar.tone}`} aria-hidden="true">
          {avatar.initial}
        </span>
        <span className="pub-job-main">
          <span className="pub-job-title">{decodeEntities(item.title)}</span>
          <span className="pub-job-meta">
            <span>
              <Building2 size={14} aria-hidden="true" /> {decodeEntities(item.company)}
            </span>
            <span>
              <MapPin size={14} aria-hidden="true" /> {decodeEntities(item.location)}
            </span>
            <span className="pub-job-date-mobile" suppressHydrationWarning>
              <Clock size={14} aria-hidden="true" /> {timeAgo(item.created_at)}
            </span>
          </span>
          <span className="pub-tags">
            {showCategory && item.category && <span className="pub-tag">{item.category}</span>}
            {item.contract_type && <span className="pub-tag pub-tag-gold">{item.contract_type}</span>}
            {expired && <span className="pub-tag pub-tag-red">Expirée</span>}
          </span>
          <span className={`pub-job-expiry${expired ? " is-expired" : ""}`}>
            <CalendarClock size={14} aria-hidden="true" />
            {item.deadline
              ? `${expired ? "A expiré le" : "Expire le"} ${formatDate(item.deadline)}`
              : "Date d’expiration non précisée"}
          </span>
        </span>
        <span className="pub-job-side">
          <span className="pub-job-date" suppressHydrationWarning>
            {timeAgo(item.created_at)}
          </span>
          <span className="pub-job-arrow" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
        </span>
      </Link>
    </li>
  );
}
