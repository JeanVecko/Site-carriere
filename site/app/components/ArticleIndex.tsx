"use client";

import { useState } from "react";
import { ArticleSummary } from "../lib/articles";
import ArticleCard from "./ArticleCard";

// Liste des conseils avec filtre par catégorie (sans recharger la page, qui reste en cache).
export default function ArticleIndex({ articles }: { articles: ArticleSummary[] }) {
  const [category, setCategory] = useState("");
  const categories = [...new Set(articles.map((article) => article.category))];
  const shown = category ? articles.filter((article) => article.category === category) : articles;
  return (
    <>
      {categories.length > 1 && (
        <div className="pub-article-filters" role="group" aria-label="Catégories">
          <button type="button" className={!category ? "is-active" : undefined} aria-pressed={!category} onClick={() => setCategory("")}>
            Tous <em>{articles.length}</em>
          </button>
          {categories.map((name) => (
            <button key={name} type="button" className={category === name ? "is-active" : undefined} aria-pressed={category === name} onClick={() => setCategory(name)}>
              {name} <em>{articles.filter((article) => article.category === name).length}</em>
            </button>
          ))}
        </div>
      )}
      <div className="pub-article-grid">
        {shown.map((article) => (
          <ArticleCard key={article.slug} article={article} headingLevel={2} />
        ))}
      </div>
    </>
  );
}
