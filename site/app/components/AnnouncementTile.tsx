import Link from "next/link";
import { Building2, CalendarClock, MapPin, Megaphone } from "lucide-react";
import { type Announcement, companyAvatar, decodeEntities, detailHref, formatDate, isExpired, mediaUrl, timeAgo } from "../lib/api";

// Carte visuelle d'une annonce (page Annonces) : vignette de l'image jointe, ou visuel de remplacement.
export default function AnnouncementTile({ item }: { item: Announcement }) {
  const expired = isExpired(item);
  const avatar = companyAvatar(item.company);
  return (
    <li>
      <Link className={`pub-tile${expired ? " is-expired" : ""}`} href={detailHref(item)}>
        <span className="pub-tile-cover">
          {item.has_cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- image servie par l'API
            <img src={mediaUrl(item, "cover")} alt="" loading="lazy" />
          ) : (
            <span className={`pub-tile-placeholder tone-${avatar.tone}`} aria-hidden="true">
              <Megaphone size={26} />
              <b>{avatar.initial}</b>
            </span>
          )}
          {expired && <span className="pub-tile-badge">Expirée</span>}
        </span>
        <span className="pub-tile-body">
          <span className="pub-tile-date" suppressHydrationWarning>
            {timeAgo(item.created_at)}
          </span>
          <span className="pub-tile-title">{decodeEntities(item.title)}</span>
          <span className="pub-tile-meta">
            <span>
              <Building2 size={13} aria-hidden="true" /> {decodeEntities(item.company)}
            </span>
            <span>
              <MapPin size={13} aria-hidden="true" /> {decodeEntities(item.location)}
            </span>
          </span>
          <span className={`pub-job-expiry${expired ? " is-expired" : ""}`}>
            <CalendarClock size={14} aria-hidden="true" />
            {item.deadline
              ? `${expired ? "A expiré le" : "Expire le"} ${formatDate(item.deadline)}`
              : "Date d’expiration non précisée"}
          </span>
        </span>
      </Link>
    </li>
  );
}
