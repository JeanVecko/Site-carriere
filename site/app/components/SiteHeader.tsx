"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";

type Props = {
  active?: "accueil" | "offres" | "annonces" | "appels-offres";
  adminButton?: boolean;
};

export default function SiteHeader({ active, adminButton = false }: Props) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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
      <Link href="/" className={active === "accueil" ? "active" : undefined}>
        Accueil
      </Link>
      <Link href="/offres" className={active === "offres" ? "active" : undefined}>
        Offres d’emploi
      </Link>
      <Link href="/annonces" className={active === "annonces" ? "active" : undefined}>
        Annonces
      </Link>
      <Link href="/appels-offres" className={active === "appels-offres" ? "active" : undefined}>
        Appels d’offres
      </Link>
      {adminButton ? null : <a href="/#contact">Contact</a>}
    </>
  );

  if (adminButton) {
    return (
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Carrières RDC, accueil">
          <span className="brand-emblem">
            <img src="/LOGO/Logo.png" alt="Logo Carrières RDC" />
          </span>
          <span className="brand-name">
            <span className="brand-title">Carrières <strong>RDC</strong></span>
            <span className="brand-tagline">Opportunités en RDC</span>
          </span>
        </Link>
        <a className="header-button" href="/">
          <ArrowLeft size={17} /> Retour au site
        </a>
      </header>
    );
  }

  return (
  <header ref={headerRef} className={`site-header${open ? " menu-open" : ""}`}>
      <Link className="brand" href="/" aria-label="Carrière RDC, accueil">
        <span className="brand-emblem">
          <img src="/LOGO/Logo.png" alt="Logo Carrières RDC" />
        </span>
        <span className="brand-name">
          <span className="brand-title">Carrières <strong>RDC</strong></span>
          <span className="brand-tagline">Opportunités en RDC</span>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Navigation principale" onClick={() => setOpen(false)}>
        {links}
      </nav>
      <button
        className="menu-toggle"
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={17} /> : <Menu size={17} />}
      </button>
    </header>
  );
}
