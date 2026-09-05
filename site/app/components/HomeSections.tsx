"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  FileCheck2,
  Megaphone,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line"></span> Le marché local des opportunités
            </p>
            <h1 id="hero-title">
              La prochaine
              <br />
              <em>bonne rencontre</em>
              <br />
              commence ici.
            </h1>
            <p className="hero-intro">
              Offres d’emploi, annonces et appels d’offres : trouvez ce qui vous ressemble, ou faites
              connaître votre besoin et vos services.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#categories">
                Explorer les catégories <ArrowDownRight size={16} />
              </a>
            </div>
          </div>
          <div
            className="hero-visual"
            aria-label="Illustration de personnes collaborant autour d'une table"
          >
            <div className="image-frame"></div>
            <div className="visual-note note-top">
              <span className="note-number">01</span>
              <span>
                Des opportunités
                <br />
                qui ont du sens
              </span>
            </div>
            <div className="visual-note note-bottom">
              <Sparkles size={22} />
              <span>
                Simple. Humain.
                <br />
                Direct.
              </span>
            </div>
          </div>
          <div className="hero-ticker">
            <span>À la une</span>
            <strong>+ 240 opportunités actives</strong>
            <span className="ticker-arrow">↗</span>
          </div>
        </section>

        <section className="directory-section" id="categories" aria-labelledby="directory-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="eyebrow-line"></span> Tout au même endroit
              </p>
              <h2 id="directory-title">
                Explorez par
                <br />
                <em>catégorie.</em>
              </h2>
            </div>
            <p className="section-description">
              Retrouvez rapidement les opportunités qui correspondent à votre recherche.
            </p>
          </div>
          <div className="directory-grid">
            <article className="directory-card directory-jobs">
              <span className="directory-index">01</span>
              <BriefcaseBusiness size={25} />
              <h3>Offres d’emploi</h3>
              <p>Des postes ouverts dans les entreprises et organisations de la RDC.</p>
              <Link className="directory-link" href="/offres">
                Voir toutes les offres <ArrowUpRight size={14} />
              </Link>
            </article>
            <article className="directory-card directory-notices">
              <span className="directory-index">02</span>
              <Megaphone size={25} />
              <h3>Annonces</h3>
              <p>Des missions, projets et opportunités à découvrir au quotidien.</p>
              <Link className="directory-link" href="/annonces">
                Voir toutes les annonces <ArrowUpRight size={14} />
              </Link>
            </article>
            <article className="directory-card directory-tenders">
              <span className="directory-index">03</span>
              <FileCheck2 size={25} />
              <h3>Appels d’offres</h3>
              <p>Les consultations et marchés publiés par les organisations.</p>
              <Link className="directory-link" href="/appels-offres">
                Voir tous les appels d’offres <ArrowUpRight size={14} />
              </Link>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
