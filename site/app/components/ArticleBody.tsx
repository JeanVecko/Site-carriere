import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Inline, parseArticle } from "../lib/articles";

// Texte d'un article mis en forme (page publique et aperçu de l'admin). Le texte n'est jamais inséré en HTML.
function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.type === "link") {
          return part.href.startsWith("/") ? (
            <Link key={index} href={part.href}>
              {part.text}
            </Link>
          ) : (
            <a key={index} href={part.href} target="_blank" rel="noreferrer nofollow">
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

function Lines({ lines }: { lines: Inline[][] }) {
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 && <br />}
          <Inlines parts={line} />
        </span>
      ))}
    </>
  );
}

export default function ArticleBody({ body }: { body: string }) {
  return (
    <div className="pub-article-body">
      {parseArticle(body).map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={index} id={block.id}>
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} id={block.id}>
                {block.text}
              </h3>
            );
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Inlines parts={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "quote":
            return (
              <aside key={index} className="pub-article-tip">
                <span className="pub-article-tip-icon" aria-hidden="true">
                  <Lightbulb size={18} />
                </span>
                <div>
                  <strong>À retenir</strong>
                  <p>
                    <Lines lines={block.lines} />
                  </p>
                </div>
              </aside>
            );
          default:
            return (
              <p key={index}>
                <Lines lines={block.lines} />
              </p>
            );
        }
      })}
    </div>
  );
}
