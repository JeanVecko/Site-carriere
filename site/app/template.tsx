// Recréé à chaque changement de page : fondu d'entrée léger (opacité seulement, pour ne pas gêner
// les éléments fixés à l'écran comme le panneau de filtres mobile ou la barre « Postuler »).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
