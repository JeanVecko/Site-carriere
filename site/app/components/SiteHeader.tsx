"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Menu, UserRound, X } from "lucide-react";
import { clearSession, dashboardHref, getSession, type SessionUser } from "../lib/api";

type Props = {
  active?: "accueil" | "offres" | "annonces" | "appels-offres" | "connexion" | "inscription";
  adminButton?: boolean;
};

export default function SiteHeader({ active, adminButton = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    startTransition(() => setSession(getSession()));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [open]);

  const links = (
    <>
      <Link href="/offres" className={active === "offres" ? "active" : undefined}>
        Offres d’emploi
      </Link>
      <Link href="/annonces" className={active === "annonces" ? "active" : undefined}>
        Annonces
      </Link>
      <Link href="/appels-offres" className={active === "appels-offres" ? "active" : undefined}>
        Appels d’offres
      </Link>
      {adminButton ? null : <Link href="/#contact">Contact</Link>}
    </>
  );

  if (adminButton) {
    return (
      <header className="site-header admin-header">
        <Link className="brand" href="/" aria-label="Carrières RDC, accueil">
          <span className="brand-emblem">
            <img src="/LOGO/Logo.png" alt="Logo Carrières RDC" />
          </span>
          <span className="brand-name">
            <span className="brand-title">Carrières <strong>RDC</strong></span>
            <span className="brand-tagline">Opportunités en RDC</span>
          </span>
        </Link>
        <Link className="header-button" href="/">
          <ArrowLeft size={17} /> Retour au site
        </Link>
      </header>
    );
  }

  return (
    <header ref={headerRef} className={`site-header public-header${open ? " menu-open" : ""}`}>
      <div className="header-brand-row">
        <Link className="brand" href="/" aria-label="Carrière RDC, accueil">
          <span className="brand-emblem">
            <img src="/LOGO/Logo.png" alt="Logo Carrières RDC" />
          </span>
          <span className="brand-name">
            <span className="brand-title">Carrières <strong>RDC</strong></span>
            <span className="brand-tagline">Opportunités en RDC</span>
          </span>
        </Link>
      </div>
      <div className="header-navigation-row">
        <div className="social-links" aria-label="Réseaux sociaux">
          <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook Carrières RDC">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M13.7 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.2H7.7V13h2.8v8h3.2Z" />
            </svg>
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn Carrières RDC">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M6.5 8.4A1.9 1.9 0 1 0 6.5 4.6a1.9 1.9 0 0 0 0 3.8ZM4.9 20h3.2v-10H4.9v10Zm5.2 0h3.2v-5.6c0-1.5.3-2.9 2.1-2.9 1.8 0 1.8 1.7 1.8 3V20h3.2v-6.2c0-3-.6-5.3-4.1-5.3-1.7 0-2.8.9-3.3 1.8h-.1V10h-3v10Z" />
            </svg>
          </a>
        </div>
        <nav className="main-nav" aria-label="Navigation principale" onClick={() => setOpen(false)}>
          {links}
        </nav>
        <div className="account-actions">
          {session ? (
            <>
              <Link className="login-link header-account-link" href={dashboardHref(session.role)}>
                <UserRound size={15} /> Mon espace
              </Link>
              <button
                type="button"
                className="signup-link header-logout-btn"
                onClick={() => {
                  clearSession();
                  setSession(null);
                  router.push("/");
                }}
              >
                <LogOut size={15} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link className={`login-link${active === "connexion" ? " active" : ""}`} href="/connexion">Se connecter</Link>
              <Link className={`signup-link${active === "inscription" ? " active" : ""}`} href="/inscription">S’inscrire</Link>
            </>
          )}
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
    </header>
  );
}
