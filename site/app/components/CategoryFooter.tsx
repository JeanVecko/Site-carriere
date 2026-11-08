import Link from "next/link";

export default function CategoryFooter() {
  return (
    <footer className="category-footer">
      <span>
        Carrières <strong>RDC</strong>
      </span>
      <Link href="/mentions-legales">Mentions légales</Link>
      <Link href="/">Retour à l’accueil</Link>
    </footer>
  );
}
