"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Menu, UserRound, X } from "lucide-react";
import SocialLinks from "./SocialLinks";

type Props = {
  active?: "accueil" | "offres" | "annonces" | "appels-offres";
  adminButton?: boolean;
};

export default function SiteHeader({ active, adminButton = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    startTransition(() => {
      setAdminConnected(Boolean(sessionStorage.getItem("carrieres-admin-token")));
    });
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
        <SocialLinks />
        <nav className="main-nav" aria-label="Navigation principale" onClick={() => setOpen(false)}>
          {links}
        </nav>
        {adminConnected && (
          <div className="account-actions">
            <Link className="login-link header-account-link" href="/admin">
              <UserRound size={15} /> Administration
            </Link>
            <button
              type="button"
              className="signup-link header-logout-btn"
              onClick={() => {
                sessionStorage.removeItem("carrieres-admin-token");
                setAdminConnected(false);
                router.push("/");
              }}
            >
              <LogOut size={15} /> Déconnexion
            </button>
          </div>
        )}
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
