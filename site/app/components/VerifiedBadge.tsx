import { BadgeCheck } from "lucide-react";

/** Badge « Vérifiée » : organisation dont Carrières RDC a contrôlé les documents d'enregistrement. */
export default function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="pub-verified" title="Organisation vérifiée par Carrières RDC (documents d’enregistrement contrôlés)">
      <BadgeCheck size={compact ? 13 : 15} aria-hidden="true" />
      {compact ? <span className="pub-sr-only">Organisation vérifiée</span> : "Vérifiée"}
    </span>
  );
}
