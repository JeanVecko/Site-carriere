import { companyAvatar, companyLogoUrl } from "../lib/api";

/** Logo de l'entreprise, ou son initiale sur une pastille de couleur. */
export default function CompanyLogo({
  company,
  size = 64,
}: {
  company: { slug: string; name: string; has_logo: boolean; logo_version: string | null };
  size?: number;
}) {
  if (company.has_logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo servi par /logos (cache du CDN)
      <img className="pub-company-logo" src={companyLogoUrl(company)} alt={`Logo de ${company.name}`} width={size} height={size} loading="lazy" />
    );
  }
  const avatar = companyAvatar(company.name);
  return (
    <span className={`pub-avatar pub-company-logo tone-${avatar.tone}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {avatar.initial}
    </span>
  );
}
