"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, Menu, X } from "lucide-react";
import SocialLinks from "./SocialLinks";

const LINKS = [
  { href: "/offres", label: "Offres d’emploi" },
  { href: "/annonces", label: "Annonces" },
  { href: "/appels-offres", label: "Appels d’offres" },
];

// Lien « Administration » visible seulement quand l'administrateur est connecté dans cet onglet.
function subscribe(callback: () => void) {
  window.addEventListener("carrieres-admin-auth", callback);
  return () => window.removeEventListener("carrieres-admin-auth", callback);
}
function adminConnected() {
  try {
    return Boolean(sessionStorage.getItem("carrieres-admin-token"));
  } catch {
    return false;
  }
}

export function Brand() {
  return (
    <Link className="pub-brand" href="/" aria-label="Carrières RDC, accueil">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
      <img src="/LOGO/Logo.png" alt="" />
      <span>
        <strong>
          Carrières <em>RDC</em>
        </strong>
        <small>Opportunités en RDC</small>
      </span>
    </Link>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = useSyncExternalStore(subscribe, adminConnected, () => false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const isActive = (href: string) => pathname === href || (href === "/offres" && pathname.startsWith("/offre/"));
  const navLinks = LINKS.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className={isActive(link.href) ? "is-active" : undefined}
      aria-current={isActive(link.href) ? "page" : undefined}
      onClick={() => setOpen(false)}
    >
      {link.label}
    </Link>
  ));

  return (
    <header className={`pub-header${open ? " is-open" : ""}`}>
      <div className="pub-container pub-header-inner">
        <Brand />
        <nav className="pub-nav" aria-label="Navigation principale">
          {navLinks}
        </nav>
        <div className="pub-header-actions">
          {isAdmin && (
            <Link className="pub-admin-link" href="/admin">
              <LayoutDashboard size={16} /> Administration
            </Link>
          )}
          <SocialLinks />
          <Link className="pub-btn pub-btn-gold" href="/#recruteurs">
            <Megaphone size={16} /> Publier une offre
          </Link>
          <button
            type="button"
            className="pub-menu-toggle"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      <div className="pub-mobile-panel">
        <nav aria-label="Navigation mobile">
          {navLinks}
          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)}>
              Administration
            </Link>
          )}
        </nav>
        <SocialLinks />
        <Link className="pub-btn pub-btn-gold pub-btn-block" href="/#recruteurs" onClick={() => setOpen(false)}>
          <Megaphone size={16} /> Publier une offre
        </Link>
      </div>
    </header>
  );
}
