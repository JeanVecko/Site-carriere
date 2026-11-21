import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const app = express();
const port = Number(process.env.PORT || 10000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminPasswordHashPromise = bcrypt.hash(process.env.ADMIN_PASSWORD || '', 12);

if (!databaseUrl || !jwtSecret || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Missing DATABASE_URL, JWT_SECRET, ADMIN_EMAIL or ADMIN_PASSWORD.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: '30mb' }));

// Mode administrateur seul : inscriptions, espaces candidat/recruteur et invitations sont fermés.
// Seul l'administrateur publie ; le public consulte les annonces et peut envoyer un message de contact.
const closedAccountRoutes = /^\/api\/(auth\/(register|verify-email|password-reset)|me$|my\/|invitations\/)/;
app.use((request, response, next) => {
  if (closedAccountRoutes.test(request.path)) {
    return response.status(410).json({ error: 'Les comptes utilisateurs sont désactivés : seul l’administrateur publie sur ce site.' });
  }
  next();
});


async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      invite_code TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
      plan_status TEXT NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active', 'past_due', 'canceled')),
      plan_limits JSONB NOT NULL DEFAULT '{"activeJobs": 3, "members": 2}'::jsonb,
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('candidat', 'recruteur')),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
      organization_role TEXT NOT NULL DEFAULT 'member' CHECK (organization_role IN ('owner', 'member')),
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Offre d’emploi', 'Annonce', 'Appel d’offre')),
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      media JSONB NOT NULL DEFAULT '[]'::jsonb,
      owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS applications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      cover_letter TEXT NOT NULL DEFAULT '',
      cv_data_url TEXT,
      cv_name TEXT,
      status TEXT NOT NULL DEFAULT 'En attente' CHECK (status IN ('En attente', 'Examinée', 'Acceptée', 'Refusée')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('email_verification', 'password_reset')),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS organization_invitations (
      id BIGSERIAL PRIMARY KEY,
      organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      invited_email TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS direct_messages (
      id BIGSERIAL PRIMARY KEY,
      sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      announcement_id BIGINT REFERENCES announcements(id) ON DELETE SET NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query('ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_data_url TEXT');
  // Réponse de l'administrateur à un message de contact (envoyée par e-mail depuis le panneau admin).
  await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply TEXT');
  await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ');
  // Alertes emploi par e-mail : une alerte par adresse, active seulement après confirmation (lien envoyé par e-mail).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_subscriptions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      contract_type TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      confirmed_at TIMESTAMPTZ,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS alert_subscriptions_email_idx ON alert_subscriptions (lower(email))');
  await pool.query('ALTER TABLE applications ADD COLUMN IF NOT EXISTS cv_name TEXT');
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS owner_id BIGINT");
  // Informations normalisées d'une offre (type de contrat, date limite, candidature, source, salaire)
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT ''");
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deadline DATE');
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS apply_contact TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS source_url TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS salary TEXT NOT NULL DEFAULT ''");
  // Nombre de consultations de chaque offre (affiché dans le panneau admin)
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0');
  // Nombre de clics sur « Postuler » (ou « S’inscrire ») : ouverture du lien, de l’e-mail ou du WhatsApp du recruteur
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS apply_clicks INTEGER NOT NULL DEFAULT 0');
  // Journal anonyme (ni IP ni cookie) des vues et des clics, pour le bilan envoyé aux recruteurs : jour, provenance, canal.
  await pool.query(`CREATE TABLE IF NOT EXISTS announcement_events (
    id BIGSERIAL PRIMARY KEY,
    announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'direct',
    channel TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS announcement_events_offer_idx ON announcement_events (announcement_id, created_at)');
  // Bilan e-mail envoyé au recruteur le lendemain de la date limite (une seule fois par offre)
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS report_sent_at TIMESTAMPTZ');
  // Offre « à la une » (mise en avant payante) du featured_from au featured_until inclus
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS featured_from DATE');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS featured_until DATE');
  // Demande de mise à la une envoyée par le recruteur depuis son espace (durée choisie, en attente de paiement)
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS featured_request_days INTEGER');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS featured_requested_at TIMESTAMPTZ');
  // Organisation vérifiée par l'administrateur (documents contrôlés) : badge « Vérifiée » sur ses offres
  await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ');
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verification_note TEXT NOT NULL DEFAULT ''");
  // Signalements d'offres par les visiteurs (argent demandé, fausse offre…), traités depuis l'admin
  await pool.query(`CREATE TABLE IF NOT EXISTS offer_reports (
    id BIGSERIAL PRIMARY KEY,
    announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS offer_reports_offer_idx ON offer_reports (announcement_id) WHERE resolved_at IS NULL');
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_role TEXT NOT NULL DEFAULT 'member'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active'");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_limits JSONB NOT NULL DEFAULT '{\"activeJobs\": 3, \"members\": 2}'::jsonb");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'");
  await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_reports BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_organization_role_check'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_organization_role_check
          CHECK (organization_role IN ('owner', 'member'));
      END IF;
    END
    $$;
  `);
  // Index pour le cloisonnement multi-tenant
  await pool.query('CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id)');
  // Les publications de démonstration ne sont plus insérées automatiquement : une base vide reste vide
  // (sinon elles réapparaîtraient à chaque redémarrage de l'API après leur suppression).
}

function requireAdmin(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentification requise.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== 'admin' || payload.email?.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) {
      return response.status(403).json({ error: 'Accès superadmin requis.' });
    }
    request.admin = payload;
    next();
  } catch {
    response.status(401).json({ error: 'Session administrateur invalide.' });
  }
}

app.get('/api/admin/overview', requireAdmin, async (_request, response) => {
  const [users, organizations, invitations] = await Promise.all([
    pool.query(
      `SELECT u.id, u.email, u.role, u.organization_role, u.account_status, u.email_verified_at, u.created_at,
              o.name AS organization_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       ORDER BY u.created_at DESC`
    ),
    pool.query(
            `SELECT o.id, o.name, o.slug, o.plan, o.plan_status, o.account_status, o.created_at,
              owner.email AS owner_email, COUNT(u.id)::int AS member_count
             FROM organizations o
             LEFT JOIN users u ON u.organization_id = o.id
             LEFT JOIN users owner ON owner.organization_id = o.id AND owner.organization_role = 'owner'
             GROUP BY o.id, owner.email ORDER BY o.created_at DESC`
    ),
    pool.query(
      `SELECT i.id, i.invited_email, i.expires_at, i.accepted_at, i.created_at,
              o.name AS organization_name
       FROM organization_invitations i JOIN organizations o ON o.id = i.organization_id
       ORDER BY i.created_at DESC`
    ),
  ]);
  response.json({ users: users.rows, organizations: organizations.rows, invitations: invitations.rows });
});

app.patch('/api/admin/users/:id/status', requireAdmin, async (request, response) => {
  const status = clean(request.body.status);
  if (!['active', 'suspended'].includes(status)) return response.status(400).json({ error: 'Statut de compte invalide.' });
  const result = await pool.query(
    'UPDATE users SET account_status = $1 WHERE id = $2 RETURNING id, email, account_status',
    [status, request.params.id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Utilisateur introuvable.' });
  response.json(result.rows[0]);
});

app.delete('/api/admin/users/:id', requireAdmin, async (request, response) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Utilisateur introuvable.' });
  response.status(204).end();
});

app.patch('/api/admin/organizations/:id/status', requireAdmin, async (request, response) => {
  const status = clean(request.body.status);
  if (!['active', 'suspended'].includes(status)) return response.status(400).json({ error: 'Statut de société invalide.' });
  const result = await pool.query(
    'UPDATE organizations SET account_status = $1 WHERE id = $2 RETURNING id, name, account_status',
    [status, request.params.id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Société introuvable.' });
  response.json(result.rows[0]);
});

app.post('/api/admin/organizations/:id/payment-reminder', requireAdmin, async (request, response) => {
  const result = await pool.query(
    `SELECT o.name, owner.email AS owner_email
     FROM organizations o LEFT JOIN users owner
       ON owner.organization_id = o.id AND owner.organization_role = 'owner'
     WHERE o.id = $1`,
    [request.params.id]
  );
  const organization = result.rows[0];
  if (!organization) return response.status(404).json({ error: 'Société introuvable.' });
  if (!organization.owner_email) return response.status(409).json({ error: 'Aucun propriétaire avec une adresse e-mail.' });
  await sendTransactionalEmail({
    to: organization.owner_email,
    subject: `Rappel de paiement - ${organization.name}`,
    text: `Bonjour,\n\nNous vous rappelons que le paiement de l’abonnement de ${organization.name} est attendu. Veuillez contacter l’administration pour régulariser l’accès à votre espace.\n\nCarrières RDC`,
  });
  response.json({ message: 'Rappel de paiement envoyé.', email: organization.owner_email });
});

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function createAuthToken(userId, kind, lifetimeMs) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    'INSERT INTO auth_tokens (user_id, token_hash, kind, expires_at) VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL \'1 millisecond\'))',
    [userId, hashToken(token), kind, lifetimeMs]
  );
  return token;
}
// Envoi d'e-mails : SMTP (Gmail) si configuré, sinon ou en cas d'échec Resend (API web, non bloquée par les
// hébergeurs qui ferment les ports SMTP, comme les services gratuits de Render). Lève une erreur détaillée.
function emailConfiguration() {
  const smtpUser = process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER;
  const smtpPassword = process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  return {
    smtp: smtpUser && smtpPassword ? { user: smtpUser, password: smtpPassword } : null,
    resend: process.env.RESEND_API_KEY ? { apiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM || 'Carrières RDC <onboarding@resend.dev>' } : null,
  };
}

async function sendWithSmtp({ user, password }, { to, subject, text, replyTo, headers }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user, pass: password },
  });
  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME || 'Carrières RDC'} <${user}>`,
    to,
    subject,
    text,
    ...(replyTo ? { replyTo } : {}),
    ...(headers ? { headers } : {}),
  });
}

async function sendWithResend({ apiKey, from }, { to, subject, text, replyTo, headers }) {
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}), ...(headers ? { headers } : {}) }),
  });
  if (!result.ok) {
    const detail = await result.text().catch(() => '');
    throw new Error(`Resend a refusé l’envoi (${result.status}) ${detail.slice(0, 200)}`);
  }
}

async function sendTransactionalEmail(message) {
  const { smtp, resend } = emailConfiguration();
  const errors = [];
  if (smtp) {
    try {
      return await sendWithSmtp(smtp, message);
    } catch (error) {
      errors.push(`SMTP (${smtp.user}) : ${error.code || ''} ${error.message}`.trim());
    }
  }
  if (resend) {
    try {
      return await sendWithResend(resend, message);
    } catch (error) {
      errors.push(`Resend : ${error.message}`);
    }
  }
  if (!smtp && !resend) {
    if (process.env.NODE_ENV !== 'production') return console.info(`[email preview] ${message.to}\n${message.text}`);
    throw new Error('Aucun envoi d’e-mail n’est configuré sur le serveur (ni SMTP, ni Resend).');
  }
  throw new Error(errors.join(' | '));
}
function requireOrganizationOwner(request, response, next) {
  if (request.user.organization_role !== 'owner') {
    return response.status(403).json({ error: 'Action réservée au propriétaire de l’organisation.' });
  }
  next();
}
function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
async function findOrCreateOrganization({ name, code }) {
  if (code) {
    const existing = await pool.query('SELECT id, name FROM organizations WHERE invite_code = $1', [clean(code).toUpperCase()]);
    if (!existing.rows[0]) throw new Error('Code d’organisation invalide.');
    return existing.rows[0];
  }
  const orgName = clean(name).slice(0, 120);
  if (!orgName) throw new Error('Nom d’entreprise requis.');
  let slug = slugify(orgName) || 'entreprise';
  const clash = await pool.query('SELECT id FROM organizations WHERE slug = $1', [slug]);
  if (clash.rows[0]) slug = `${slug}-${Date.now().toString(36)}`;
  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const created = await pool.query(
    'INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3) RETURNING id, name, invite_code',
    [orgName, slug, inviteCode]
  );
  return created.rows[0];
}
function cleanMedia(media) {
  if (!Array.isArray(media)) return null;
  const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  const files = media.map((file) => ({
    name: clean(file?.name).slice(0, 120),
    type: clean(file?.type),
    dataUrl: typeof file?.dataUrl === 'string' ? file.dataUrl : ''
  }));
  const totalLength = files.reduce((total, file) => total + file.dataUrl.length, 0);
  if (totalLength > 28_000_000) return null;
  if (files.some((file) => !file.name || !supportedTypes.has(file.type) || !file.dataUrl.startsWith(`data:${file.type};base64,`))) return null;
  return files;
}
function validateAnnouncement(body) {
  const values = [clean(body.title), clean(body.category), clean(body.company), clean(body.location), clean(body.description)];
  return values.every(Boolean) && ['Offre d’emploi', 'Annonce', 'Appel d’offre'].includes(values[1]) ? values : null;
}

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Consultance', 'Temps partiel', 'Intérim', 'Bénévolat', 'Autre'];
// Pour une annonce, le champ « type » décrit la nature de l'annonce (formation, événement…), pas un contrat.
const ANNOUNCE_TYPES = ['Formation', 'Séminaire / Conférence', 'Événement', 'Bourse d’études', 'Concours', 'Avis / Communiqué', 'Autre'];

// Valide une publication de l'admin. Renvoie { values } ou { error } avec un message précis.
function validateAnnouncementWithMedia(body) {
  const title = clean(body.title);
  const category = clean(body.category);
  const company = clean(body.company);
  const location = clean(body.location);
  const description = clean(body.description);
  const contractType = clean(body.contract_type);
  const deadline = clean(body.deadline);
  const applyContact = clean(body.apply_contact);
  const sourceUrl = clean(body.source_url);
  const salary = clean(body.salary).slice(0, 120);
  const media = cleanMedia(body.media || []);

  if (!title || !company || !location) return { error: 'Le titre, l’organisation et la localisation sont obligatoires.' };
  if (!['Offre d’emploi', 'Annonce', 'Appel d’offre'].includes(category)) return { error: 'Catégorie invalide.' };
  if (description.length < 30) return { error: 'Ajoutez un résumé en texte d’au moins 30 caractères (missions, profil…), même si une image est jointe.' };
  if (category === 'Offre d’emploi' && !CONTRACT_TYPES.includes(contractType)) return { error: 'Choisissez le type de contrat.' };
  if (contractType && !(category === 'Annonce' ? ANNOUNCE_TYPES : CONTRACT_TYPES).includes(contractType)) return { error: category === 'Annonce' ? 'Type d’annonce invalide.' : 'Type de contrat invalide.' };
  if (category !== 'Annonce' && !applyContact) return { error: 'Indiquez comment postuler ou soumissionner (e-mail, lien ou adresse).' };
  if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline)))) return { error: 'Date limite invalide.' };
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) return { error: 'Le lien source doit commencer par http:// ou https://.' };
  if (!media) return { error: 'Fichiers joints invalides ou trop volumineux.' };
  return { values: [title, category, company, location, description, media, contractType, deadline || null, applyContact, sourceUrl, salary] };
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/', (_request, response) => response.json({ name: 'Carrieres RDC API', status: 'ok', health: '/api/health' }));

app.post('/api/auth/login', async (request, response) => {
  const email = clean(request.body.email).toLowerCase();
  const password = request.body.password || '';
  if (!email || !password) return response.status(400).json({ error: 'Veuillez renseigner votre email et votre mot de passe.' });

  // Le compte superadmin doit être prioritaire, même si son adresse existe aussi dans users.
  const validAdminEmail = email === process.env.ADMIN_EMAIL.toLowerCase();
  const validAdminPassword = validAdminEmail && await bcrypt.compare(password, await adminPasswordHashPromise);
  if (validAdminPassword) {
    return response.json({
      token: jwt.sign({ email, role: 'admin' }, jwtSecret, { expiresIn: '8h' }),
      role: 'admin',
      email,
    });
  }

  // Site en mode administrateur seul : aucun autre compte ne peut se connecter.
  return response.status(401).json({ error: 'Identifiants incorrects.' });
});

async function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentification requise.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== 'candidat' && payload.role !== 'recruteur') return response.status(403).json({ error: 'Compte utilisateur requis.' });
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.organization_id, u.organization_role, u.account_status,
          o.account_status AS organization_status
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [payload.id]
    );
    const user = result.rows[0];
    if (!user || user.role !== payload.role) return response.status(401).json({ error: 'Compte utilisateur invalide.' });
    if (user.account_status !== 'active') return response.status(403).json({ error: 'Ce compte est suspendu. Contactez le support.' });
    if (user.organization_status !== 'active') return response.status(403).json({ error: 'L’accès de cette société est suspendu pour paiement en attente.' });
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      organization_role: user.organization_role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return response.status(401).json({ error: 'Session expirée ou invalide.' });
    response.status(500).json({ error: 'Impossible de vérifier le compte utilisateur.' });
  }
}

app.post('/api/auth/register', async (request, response) => {
  const role = clean(request.body.role);
  const email = clean(request.body.email).toLowerCase();
  const password = request.body.password || '';
  if (!['candidat', 'recruteur'].includes(role)) return response.status(400).json({ error: 'Type de compte invalide.' });
  if (!email.includes('@') || password.length < 6) return response.status(400).json({ error: 'Email ou mot de passe invalide (6 caractères minimum).' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) return response.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });

  const hash = await bcrypt.hash(password, 10);
  const data = typeof request.body.data === 'object' && request.body.data !== null ? request.body.data : {};

  // Multi-tenant : le recruteur crée son entreprise OU rejoint celle de son équipe via un code d'invitation
  let organizationId = null;
  let organization = null;
  let organizationRole = 'member';
  if (role === 'recruteur') {
    try {
      organization = await findOrCreateOrganization({
        name: request.body.organizationName || request.body.data?.companyName,
        code: request.body.organizationCode,
      });
    } catch (error) {
      return response.status(400).json({ error: error instanceof Error ? error.message : 'Organisation invalide.' });
    }
    organizationId = organization.id;
    organizationRole = clean(request.body.organizationCode) ? 'member' : 'owner';
    data.companyName = data.companyName || organization.name;
  }

  const result = await pool.query(
    'INSERT INTO users (role, email, password_hash, data, organization_id, organization_role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role, email, created_at',
    [role, email, hash, JSON.stringify(data), organizationId, organizationRole]
  );
  const user = result.rows[0];
  const verificationToken = await createAuthToken(user.id, 'email_verification', 24 * 60 * 60 * 1000);
  const apiPublicUrl = process.env.API_PUBLIC_URL || `http://localhost:${port}`;
  const verificationUrl = `${apiPublicUrl.replace(/\/$/, '')}/api/auth/verify-email?token=${verificationToken}`;
  response.status(201).json({
    user: { ...user, organization_id: organizationId, organization },
    token: jwt.sign({ id: user.id, email: user.email, role: user.role, organization_id: organizationId, organization_role: organizationRole }, jwtSecret, { expiresIn: '7d' }),
    emailVerificationPending: true,
  });

  sendTransactionalEmail({
      to: email,
      subject: 'Vérifiez votre adresse e-mail - Carrières RDC',
      text: `Confirmez votre adresse e-mail en ouvrant ce lien : ${verificationUrl}`,
  }).catch((error) => console.error('Unable to send verification email:', error));
});

app.get('/api/auth/verify-email', async (request, response) => {
  const token = clean(request.query.token);
  if (!token) return response.status(400).json({ error: 'Jeton de vérification manquant.' });
  const result = await pool.query(
    `SELECT t.id, t.user_id FROM auth_tokens t
     WHERE t.token_hash = $1 AND t.kind = 'email_verification'
       AND t.used_at IS NULL AND t.expires_at > NOW()`,
    [hashToken(token)]
  );
  if (!result.rows[0]) return response.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
  await pool.query('UPDATE users SET email_verified_at = NOW() WHERE id = $1', [result.rows[0].user_id]);
  await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [result.rows[0].id]);
  response.json({ message: 'Adresse e-mail vérifiée.' });
});

app.post('/api/auth/password-reset/request', async (request, response) => {
  const email = clean(request.body.email).toLowerCase();
  const genericResponse = { message: 'Si cette adresse correspond à un compte, un lien de réinitialisation sera envoyé.' };
  if (!email) return response.json(genericResponse);
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!result.rows[0]) return response.json(genericResponse);
  try {
    const resetToken = await createAuthToken(result.rows[0].id, 'password_reset', 60 * 60 * 1000);
    const resetUrl = `${frontendUrl}/connexion?reset_token=${resetToken}`;
    await sendTransactionalEmail({
      to: email,
      subject: 'Réinitialisation de votre mot de passe - Carrières RDC',
      text: `Réinitialisez votre mot de passe en ouvrant ce lien : ${resetUrl}`,
    });
  } catch (error) {
    console.error('Unable to send password reset email:', error);
  }
  response.json(genericResponse);
});

app.post('/api/auth/password-reset/confirm', async (request, response) => {
  const token = clean(request.body.token);
  const password = request.body.password || '';
  if (!token || password.length < 6) return response.status(400).json({ error: 'Jeton ou mot de passe invalide.' });
  const result = await pool.query(
    `SELECT t.id, t.user_id FROM auth_tokens t
     WHERE t.token_hash = $1 AND t.kind = 'password_reset'
       AND t.used_at IS NULL AND t.expires_at > NOW()`,
    [hashToken(token)]
  );
  if (!result.rows[0]) return response.status(400).json({ error: 'Lien de réinitialisation invalide ou expiré.' });
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, result.rows[0].user_id]);
  await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [result.rows[0].id]);
  response.json({ message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
});

app.get('/api/me', requireUser, async (request, response) => {
  const result = await pool.query(
    `SELECT u.id, u.role, u.email, u.data, u.created_at, u.organization_id, o.name AS organization_name, o.invite_code
     FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.id = $1`,
    [request.user.id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Compte introuvable.' });
  response.json(result.rows[0]);
});

app.patch('/api/me', requireUser, async (request, response) => {
  const patch = typeof request.body.data === 'object' && request.body.data !== null ? request.body.data : null;
  if (!patch) return response.status(400).json({ error: 'Données de profil invalides.' });

  // Limites de taille pour les fichiers encodés en base64 (photo, CV)
  const totalSize = Object.values(patch).reduce((total, value) => total + (typeof value === 'string' ? value.length : 0), 0);
  if (totalSize > 8_000_000) return response.status(413).json({ error: 'Fichiers trop volumineux (photo max 2 Mo, CV max 4 Mo).' });

  const current = await pool.query('SELECT data FROM users WHERE id = $1', [request.user.id]);
  if (!current.rows[0]) return response.status(404).json({ error: 'Compte introuvable.' });

  const merged = { ...current.rows[0].data, ...patch };
  const result = await pool.query(
    'UPDATE users SET data = $1 WHERE id = $2 RETURNING id, role, email, data, created_at',
    [JSON.stringify(merged), request.user.id]
  );
  response.json(result.rows[0]);
});

app.get('/api/my/organization', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur' || !request.user.organization_id) {
    return response.status(403).json({ error: 'Organisation recruteur requise.' });
  }
  const organization = await pool.query(
    'SELECT id, name, slug, invite_code, plan, plan_status, plan_limits, created_at FROM organizations WHERE id = $1',
    [request.user.organization_id]
  );
  if (!organization.rows[0]) return response.status(404).json({ error: 'Organisation introuvable.' });
  const members = await pool.query(
    `SELECT id, email, organization_role, created_at
     FROM users WHERE organization_id = $1 ORDER BY created_at ASC`,
    [request.user.organization_id]
  );
  response.json({ organization: organization.rows[0], members: members.rows });
});

app.post('/api/my/organization/invitations', requireUser, requireOrganizationOwner, async (request, response) => {
  if (request.user.role !== 'recruteur' || !request.user.organization_id) {
    return response.status(403).json({ error: 'Organisation recruteur requise.' });
  }
  const invitedEmail = clean(request.body.email).toLowerCase();
  if (!invitedEmail || !invitedEmail.includes('@')) {
    return response.status(400).json({ error: 'Adresse e-mail invalide.' });
  }
  const organization = await pool.query('SELECT name FROM organizations WHERE id = $1', [request.user.organization_id]);
  if (!organization.rows[0]) return response.status(404).json({ error: 'Organisation introuvable.' });
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO organization_invitations (organization_id, invited_email, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [request.user.organization_id, invitedEmail, hashToken(token)]
  );
  const invitationUrl = `${frontendUrl}/invitation?token=${token}`;
  try {
    await sendTransactionalEmail({
      to: invitedEmail,
      subject: `Invitation à rejoindre ${organization.rows[0].name}`,
      text: `Vous êtes invité à rejoindre ${organization.rows[0].name} sur Carrières RDC. Ouvrez ce lien pour accepter l’invitation : ${invitationUrl}`,
    });
  } catch (error) {
    await pool.query('DELETE FROM organization_invitations WHERE token_hash = $1', [hashToken(token)]);
    return response.status(502).json({ error: 'L’invitation n’a pas pu être envoyée.' });
  }
  response.status(201).json({ message: 'Invitation envoyée.' });
});

app.post('/api/invitations/accept', async (request, response) => {
  const token = clean(request.body.token);
  const password = request.body.password || '';
  const data = typeof request.body.data === 'object' && request.body.data !== null ? request.body.data : {};
  if (!token) return response.status(400).json({ error: 'Lien d’invitation invalide.' });
  const invitation = await pool.query(
    `SELECT i.id, i.invited_email, i.organization_id, o.name AS organization_name
     FROM organization_invitations i JOIN organizations o ON o.id = i.organization_id
     WHERE i.token_hash = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
    [hashToken(token)]
  );
  if (!invitation.rows[0]) return response.status(400).json({ error: 'Invitation invalide ou expirée.' });
  const invite = invitation.rows[0];
  let user;
  const existing = await pool.query('SELECT id, role, email FROM users WHERE email = $1', [invite.invited_email]);
  if (existing.rows[0]) {
    if (existing.rows[0].role !== 'recruteur') return response.status(409).json({ error: 'Cette adresse appartient déjà à un compte candidat.' });
    if (request.body.password) {
      const validPassword = await bcrypt.compare(password, (await pool.query('SELECT password_hash FROM users WHERE id = $1', [existing.rows[0].id])).rows[0].password_hash);
      if (!validPassword) return response.status(401).json({ error: 'Mot de passe incorrect.' });
    }
    const updated = await pool.query(
      `UPDATE users SET organization_id = $1, organization_role = 'member'
       WHERE id = $2 RETURNING id, role, email, organization_id, organization_role`,
      [invite.organization_id, existing.rows[0].id]
    );
    user = updated.rows[0];
  } else {
    if (password.length < 6) return response.status(400).json({ error: 'Un mot de passe de 6 caractères minimum est requis.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await pool.query(
      `INSERT INTO users (role, email, password_hash, data, organization_id, organization_role)
       VALUES ('recruteur', $1, $2, $3, $4, 'member')
       RETURNING id, role, email, organization_id, organization_role`,
      [invite.invited_email, passwordHash, JSON.stringify(data), invite.organization_id]
    );
    user = created.rows[0];
  }
  await pool.query('UPDATE organization_invitations SET accepted_at = NOW() WHERE id = $1', [invite.id]);
  response.json({
    message: `Vous avez rejoint ${invite.organization_name}.`,
    token: jwt.sign({ id: user.id, email: user.email, role: user.role, organization_id: user.organization_id, organization_role: user.organization_role }, jwtSecret, { expiresIn: '7d' }),
    role: user.role,
    email: user.email,
  });
});

app.post('/api/my/organization/invite-code', requireUser, requireOrganizationOwner, async (request, response) => {
  if (request.user.role !== 'recruteur' || !request.user.organization_id) {
    return response.status(403).json({ error: 'Organisation recruteur requise.' });
  }
  const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const result = await pool.query(
    'UPDATE organizations SET invite_code = $1 WHERE id = $2 RETURNING invite_code',
    [inviteCode, request.user.organization_id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Organisation introuvable.' });
  response.json(result.rows[0]);
});

app.delete('/api/my/organization/members/:id', requireUser, requireOrganizationOwner, async (request, response) => {
  if (request.user.role !== 'recruteur' || !request.user.organization_id) {
    return response.status(403).json({ error: 'Organisation recruteur requise.' });
  }
  const result = await pool.query(
    `UPDATE users SET organization_id = NULL, organization_role = 'member'
     WHERE id = $1 AND organization_id = $2 AND role = 'recruteur' AND organization_role = 'member'
     RETURNING id`,
    [request.params.id, request.user.organization_id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Membre introuvable ou non amovible.' });
  response.status(204).end();
});

// Visibilité publique : une offre reste en ligne jusqu'à la fin de sa date limite, puis encore 24 h
// (affichée « Expirée »). Ensuite elle n'est plus visible que par l'administrateur.
// Heure de référence : Kinshasa. Fin de visibilité = (date limite + 2 jours) à 00:00.
const PUBLIC_UNTIL_SQL = "((deadline + 2)::timestamp AT TIME ZONE 'Africa/Kinshasa')";
// Offre « à la une » aujourd'hui (heure de Kinshasa) : affichée en tête des listes, avec un badge.
const FEATURED_SQL = "(featured_until IS NOT NULL AND featured_until >= (NOW() AT TIME ZONE 'Africa/Kinshasa')::date)";
const FEATURED_LIMIT = 3;
// Tarifs de la mise à la une (paiement hors du site : Mobile Money ou virement).
const FEATURED_PLANS = { 7: 10, 14: 18, 30: 30 };
const PUBLICLY_VISIBLE_SQL = `(deadline IS NULL OR NOW() < ${PUBLIC_UNTIL_SQL})`;
// Une publication a une vignette si au moins une image est jointe.
// Empreinte des pièces jointes : change dès qu'une image est remplacée, pour que les navigateurs ne gardent
// pas l'ancienne version en cache (elle est ajoutée à l'adresse de l'image : …/cover?v=…).
const MEDIA_VERSION_SQL = "left(md5(media::text), 10)";
const HAS_COVER_SQL = "EXISTS (SELECT 1 FROM jsonb_array_elements(media) AS m WHERE m->>'type' LIKE 'image/%')";

// Pièce jointe d'une publication (image ou PDF), servie comme un vrai fichier mis en cache par le navigateur,
// au lieu d'être intégrée en base64 dans la page (pages bien plus légères).
app.get('/api/announcements/:id/media/:index', async (request, response) => {
  const { id, index } = request.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(index)) return response.status(404).end();
  const result = await pool.query(
    `SELECT media->$2::int AS file FROM announcements WHERE id = $1 AND ${PUBLICLY_VISIBLE_SQL}`,
    [id, index]
  );
  const file = result.rows[0]?.file;
  const match = file && /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,(.+)$/.exec(file.dataUrl || '');
  if (!match) return response.status(404).end();
  const safeName = String(file.name || 'document').replace(/[^\w.\-() ]+/g, '_').slice(0, 100);
  response.set('Content-Type', match[1]);
  response.set('Cache-Control', 'public, max-age=86400');
  response.set('Content-Disposition', `${match[1] === 'application/pdf' ? 'attachment' : 'inline'}; filename="${safeName}"`);
  response.send(Buffer.from(match[2], 'base64'));
});

// Vignette d'une publication : première image jointe, renvoyée comme un vrai fichier image
// (mise en cache par le navigateur) pour ne pas alourdir les listes.
app.get('/api/announcements/:id/cover', async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).end();
  const result = await pool.query(
    `SELECT m->>'type' AS type, m->>'dataUrl' AS data_url
     FROM announcements, jsonb_array_elements(media) AS m
     WHERE id = $1 AND ${PUBLICLY_VISIBLE_SQL} AND m->>'type' LIKE 'image/%'
     LIMIT 1`,
    [request.params.id]
  );
  const cover = result.rows[0];
  const match = cover && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(cover.data_url || '');
  if (!match) return response.status(404).end();
  response.set('Content-Type', match[1]);
  response.set('Cache-Control', 'public, max-age=86400');
  response.send(Buffer.from(match[2], 'base64'));
});

app.get('/api/announcements', async (request, response) => {
  const category = clean(request.query.category);
  const values = category ? [category] : [];
  const result = await pool.query(`SELECT id, title, category, company, location, description, contract_type, to_char(deadline, 'YYYY-MM-DD') AS deadline, apply_contact, source_url, salary, created_at, jsonb_array_length(media) AS media_count, ${HAS_COVER_SQL} AS has_cover, ${MEDIA_VERSION_SQL} AS media_version, ${FEATURED_SQL} AS featured, to_char(featured_until, 'YYYY-MM-DD') AS featured_until, COALESCE((SELECT org.verified_at IS NOT NULL FROM organizations org WHERE org.id = announcements.organization_id), FALSE) AS verified FROM announcements WHERE ${PUBLICLY_VISIBLE_SQL} ${category ? 'AND category = $1' : ''} ORDER BY ${FEATURED_SQL} DESC, created_at DESC`, values);
  response.json(result.rows);
});

app.get('/api/my/recommended-offers', requireUser, async (request, response) => {
  if (request.user.role !== 'candidat') return response.status(403).json({ error: 'Réservé aux comptes candidats.' });
  const profileResult = await pool.query('SELECT data FROM users WHERE id = $1', [request.user.id]);
  const profile = profileResult.rows[0]?.data || {};
  const result = await pool.query(
    `SELECT id, title, category, company, location, description, media, created_at
     FROM announcements WHERE category = 'Offre d’emploi' ORDER BY created_at DESC`
  );
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const stopWords = new Set(['avec', 'pour', 'dans', 'une', 'des', 'les', 'sur', 'poste', 'profil', 'recherche', 'mission', 'offre']);
  const terms = (value) => normalize(value).split(/[^a-z0-9]+/).filter((term) => term.length > 3 && !stopWords.has(term));
  const profileText = normalize([profile.metier, profile.bio, profile.ville, profile.fonction].join(' '));
  const offers = result.rows.map((offer) => {
    const offerTerms = terms(`${offer.title} ${offer.description} ${offer.location}`);
    const matchedTerms = [...new Set(offerTerms.filter((term) => profileText.includes(term)))];
    const score = Math.min(100, Math.round((matchedTerms.length / Math.max(1, new Set(offerTerms).size)) * 100));
    return { ...offer, match_score: score, matched_terms: matchedTerms };
  }).sort((a, b) => b.match_score - a.match_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  response.json(offers);
});

app.get('/api/announcements/:id', async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Annonce introuvable.' });
  const result = await pool.query(`SELECT id, title, category, company, location, description, contract_type, to_char(deadline, 'YYYY-MM-DD') AS deadline, apply_contact, source_url, salary, created_at, media, ${MEDIA_VERSION_SQL} AS media_version, ${FEATURED_SQL} AS featured, to_char(featured_until, 'YYYY-MM-DD') AS featured_until, COALESCE((SELECT org.verified_at IS NOT NULL FROM organizations org WHERE org.id = announcements.organization_id), FALSE) AS verified FROM announcements WHERE id = $1 AND ${PUBLICLY_VISIBLE_SQL}`, [request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
  response.json(result.rows[0]);
});

app.get('/api/admin/announcements', requireAdmin, async (_request, response) => {
  const result = await pool.query(
    `SELECT a.id, a.title, a.category, a.company, a.location, a.description, a.contract_type,
            to_char(a.deadline, 'YYYY-MM-DD') AS deadline, a.apply_contact, a.source_url, a.salary,
            jsonb_array_length(a.media) AS media_count, a.views, a.apply_clicks, a.created_at, a.report_sent_at,
            ${FEATURED_SQL} AS featured, to_char(a.featured_from, 'YYYY-MM-DD') AS featured_from, to_char(a.featured_until, 'YYYY-MM-DD') AS featured_until,
            a.featured_request_days, a.featured_requested_at, (o.verified_at IS NOT NULL) AS verified,
            (SELECT COUNT(*) FROM offer_reports r WHERE r.announcement_id = a.id AND r.resolved_at IS NULL)::int AS open_reports,
            ((a.deadline + 2)::timestamp AT TIME ZONE 'Africa/Kinshasa') AS public_until,
            NOT (a.deadline IS NULL OR NOW() < ((a.deadline + 2)::timestamp AT TIME ZONE 'Africa/Kinshasa')) AS hidden,
            u.email AS author_email, a.organization_id, o.name AS organization_name
     FROM announcements a
     LEFT JOIN users u ON u.id = a.owner_id
     LEFT JOIN organizations o ON o.id = a.organization_id
     ORDER BY a.created_at DESC`
  );
  response.json(result.rows);
});

app.post('/api/announcements', requireAdmin, async (request, response) => {
  const { values, error } = validateAnnouncementWithMedia(request.body);
  if (error) return response.status(400).json({ error });
  const result = await pool.query(
    `INSERT INTO announcements (title, category, company, location, description, media, contract_type, deadline, apply_contact, source_url, salary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    // Les pièces jointes sont envoyées en JSON : une liste JavaScript brute serait mal convertie par le pilote.
    [...values.slice(0, 5), JSON.stringify(values[5]), ...values.slice(6)]
  );
  response.status(201).json(result.rows[0]);
});

// Modification complète d'une offre par l'administrateur (mêmes règles que la publication).
// Sans nouveaux fichiers (keep_media = true), les pièces jointes existantes sont conservées ; vues et date de publication aussi.
app.put('/api/announcements/:id', requireAdmin, async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Annonce introuvable.' });
  const existing = await pool.query('SELECT media FROM announcements WHERE id = $1', [request.params.id]);
  if (!existing.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
  const body = request.body.keep_media ? { ...request.body, media: existing.rows[0].media } : request.body;
  const { values, error } = validateAnnouncementWithMedia(body);
  if (error) return response.status(400).json({ error });
  await pool.query(
    `UPDATE announcements SET title = $2, category = $3, company = $4, location = $5, description = $6, media = $7,
       contract_type = $8, deadline = $9, apply_contact = $10, source_url = $11, salary = $12
     WHERE id = $1`,
    [request.params.id, ...values.slice(0, 5), JSON.stringify(values[5]), ...values.slice(6)]
  );
  response.json({ id: request.params.id });
});

// Prolongation (ou modification) de la date limite d'une offre par l'administrateur.
// La nouvelle date doit être aujourd'hui ou plus tard (heure de Kinshasa) ; l'offre redevient visible.
app.patch('/api/announcements/:id/deadline', requireAdmin, async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Annonce introuvable.' });
  const deadline = clean(request.body.deadline);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline))) {
    return response.status(400).json({ error: 'Date invalide.' });
  }
  const result = await pool.query(
    `UPDATE announcements SET deadline = $2::date
     WHERE id = $1 AND $2::date >= (NOW() AT TIME ZONE 'Africa/Kinshasa')::date
     RETURNING id, to_char(deadline, 'YYYY-MM-DD') AS deadline`,
    [request.params.id, deadline]
  );
  if (!result.rows[0]) {
    const exists = await pool.query('SELECT 1 FROM announcements WHERE id = $1', [request.params.id]);
    if (!exists.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
    return response.status(400).json({ error: 'La nouvelle date doit être aujourd’hui ou plus tard.' });
  }
  response.json(result.rows[0]);
});

// Compteurs de vues et de clics « Postuler » : appelés par la page d'une offre. Un même visiteur (adresse IP,
// gardée seulement en mémoire) n'est compté qu'une fois par offre et par période de 30 minutes ; les robots sont ignorés.
const recentHits = new Map();
const HIT_WINDOW_MS = 30 * 60 * 1000;
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|curl|wget|python|headless/i;
const EVENT_SOURCES = ['direct', 'site', 'facebook', 'whatsapp', 'google', 'linkedin', 'tiktok', 'email', 'autre'];
const APPLY_CHANNELS = ['web', 'email', 'whatsapp', 'phone'];

function isFreshHit(request, id, kind) {
  if (BOT_PATTERN.test(request.get('user-agent') || '')) return false;
  const ip = String(request.get('x-forwarded-for') || request.socket.remoteAddress || '').split(',')[0].trim();
  const key = `${kind}:${ip}:${id}`;
  const now = Date.now();
  if (now - (recentHits.get(key) || 0) < HIT_WINDOW_MS) return false;
  recentHits.set(key, now);
  if (recentHits.size > 50000) {
    for (const [entry, time] of recentHits) if (now - time >= HIT_WINDOW_MS) recentHits.delete(entry);
  }
  return true;
}

async function recordHit(request, response, kind) {
  const id = request.params.id;
  if (!/^\d+$/.test(id)) return response.status(404).end();
  if (!isFreshHit(request, id, kind)) return response.status(204).end();
  // Provenance et canal passés dans l'adresse (?source=facebook&channel=email) : requête simple, sans pré-vol CORS.
  const source = EVENT_SOURCES.includes(request.query.source) ? request.query.source : 'direct';
  const channel = kind === 'apply' && APPLY_CHANNELS.includes(request.query.channel) ? request.query.channel : '';
  const column = kind === 'apply' ? 'apply_clicks' : 'views';
  const updated = await pool.query(`UPDATE announcements SET ${column} = ${column} + 1 WHERE id = $1 RETURNING id`, [id]);
  if (updated.rows[0]) {
    await pool.query('INSERT INTO announcement_events (announcement_id, kind, source, channel) VALUES ($1, $2, $3, $4)', [id, kind, source, channel]);
  }
  response.status(204).end();
}

app.post('/api/announcements/:id/view', (request, response) => recordHit(request, response, 'view'));
app.post('/api/announcements/:id/apply', (request, response) => recordHit(request, response, 'apply'));

// Bilan d'une offre pour le recruteur : totaux, détail par jour, provenance des visiteurs et canal de candidature.
// Avec organizationId, l'offre doit appartenir à cette société (espace recruteur) ; sinon renvoie null.
async function offerReport(id, organizationId = null) {
  if (!/^\d+$/.test(String(id))) return null;
  const offer = await pool.query(
    `SELECT id, title, category, company, location, contract_type, to_char(deadline, 'YYYY-MM-DD') AS deadline,
            created_at, views, apply_clicks, to_char(featured_from, 'YYYY-MM-DD') AS featured_from,
            to_char(featured_until, 'YYYY-MM-DD') AS featured_until FROM announcements
     WHERE id = $1 AND ($2::bigint IS NULL OR organization_id = $2::bigint)`,
    [id, organizationId]
  );
  if (!offer.rows[0]) return null;
  const [days, sources, channels, first] = await Promise.all([
    pool.query(
      `SELECT to_char((created_at AT TIME ZONE 'Africa/Kinshasa')::date, 'YYYY-MM-DD') AS day,
              COUNT(*) FILTER (WHERE kind = 'view')::int AS views, COUNT(*) FILTER (WHERE kind = 'apply')::int AS applies
       FROM announcement_events WHERE announcement_id = $1 GROUP BY 1 ORDER BY 1`,
      [id]
    ),
    pool.query(
      `SELECT source, COUNT(*) FILTER (WHERE kind = 'view')::int AS views, COUNT(*) FILTER (WHERE kind = 'apply')::int AS applies
       FROM announcement_events WHERE announcement_id = $1 GROUP BY source ORDER BY 2 DESC, 3 DESC`,
      [id]
    ),
    pool.query(
      `SELECT channel, COUNT(*)::int AS applies FROM announcement_events
       WHERE announcement_id = $1 AND kind = 'apply' GROUP BY channel ORDER BY 2 DESC`,
      [id]
    ),
    pool.query('SELECT MIN(created_at) AS since FROM announcement_events WHERE announcement_id = $1', [id]),
  ]);
  return {
    offer: offer.rows[0],
    days: days.rows,
    sources: sources.rows,
    channels: channels.rows,
    tracked_since: first.rows[0]?.since || null,
  };
}

app.get('/api/admin/announcements/:id/report', requireAdmin, async (request, response) => {
  const report = await offerReport(request.params.id);
  if (!report) return response.status(404).json({ error: 'Offre introuvable.' });
  response.json(report);
});

/* ===================== Espace recruteur (sur invitation) =====================
   Seul l'administrateur crée un accès : une société (organizations) et son contact (users, rôle recruteur).
   Le recruteur reçoit un lien d'activation (copié sur WhatsApp ou envoyé par e-mail), choisit son mot de passe,
   puis consulte les statistiques des offres que l'administrateur a rattachées à sa société. Il ne publie pas
   lui-même : il propose une offre, qui arrive dans les messages de l'administrateur. */

const ACCESS_LINK_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const safe = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);

// Lien d'accès à usage unique (7 jours). Les anciens liens non utilisés de ce compte sont annulés.
async function createAccessLink(userId) {
  await pool.query("UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND kind = 'password_reset' AND used_at IS NULL", [userId]);
  const token = await createAuthToken(userId, 'password_reset', ACCESS_LINK_LIFETIME_MS);
  return `${frontendUrl}/espace-recruteur/activer?token=${token}`;
}

async function sendAccessLinkEmail({ email, organization, contact, link, first }) {
  await sendTransactionalEmail({
    to: email,
    replyTo: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    subject: first ? `Votre espace recruteur Carrières RDC — ${organization}` : 'Votre nouveau lien d’accès Carrières RDC',
    text: `Bonjour${contact ? ` ${contact}` : ''},\n\n${first
      ? `Nous avons ouvert un espace recruteur pour ${organization} sur Carrières RDC. Vous y suivrez les consultations de vos offres, les clics sur « Postuler » et la provenance des visiteurs, et vous pourrez nous proposer de nouvelles offres.`
      : `Voici un nouveau lien pour accéder à l’espace recruteur de ${organization} et choisir votre mot de passe.`}\n\nChoisissez votre mot de passe en ouvrant ce lien (valable 7 jours, utilisable une seule fois) :\n${link}\n\nEnsuite, connectez-vous sur ${frontendUrl}/espace-recruteur avec l’adresse ${email}.\n\n—\nL’équipe Carrières RDC\n${frontendUrl}`,
  });
}

const RECRUITER_LIST_SQL = `
  SELECT o.id, o.name, o.account_status, o.auto_reports, o.verified_at, o.verification_note, o.created_at,
         u.id AS user_id, u.email, COALESCE(u.data->>'contact', '') AS contact, u.email_verified_at AS activated_at,
         NULLIF(u.data->>'last_login_at', '') AS last_login_at,
         COALESCE(s.offers, 0)::int AS offers, COALESCE(s.views, 0)::int AS views, COALESCE(s.applies, 0)::int AS applies
  FROM organizations o
  LEFT JOIN LATERAL (
    SELECT * FROM users WHERE organization_id = o.id AND role = 'recruteur' ORDER BY (organization_role = 'owner') DESC, id LIMIT 1
  ) u ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS offers, SUM(views) AS views, SUM(apply_clicks) AS applies FROM announcements WHERE organization_id = o.id
  ) s ON TRUE`;

app.get('/api/admin/recruiters', requireAdmin, safe(async (_request, response) => {
  const result = await pool.query(`${RECRUITER_LIST_SQL} ORDER BY lower(o.name)`);
  response.json(result.rows);
}));

// Ouverture d'un accès : société + contact, et un lien d'activation renvoyé à l'administrateur.
app.post('/api/admin/recruiters', requireAdmin, safe(async (request, response) => {
  const organization = clean(request.body.organization).slice(0, 120);
  const email = clean(request.body.email).toLowerCase().slice(0, 160);
  const contact = clean(request.body.contact).slice(0, 120);
  if (!organization) return response.status(400).json({ error: 'Indiquez le nom de la société ou de l’organisation.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ error: 'Adresse e-mail invalide.' });
  if (email === process.env.ADMIN_EMAIL.toLowerCase()) return response.status(400).json({ error: 'Cette adresse est celle de l’administrateur.' });
  const taken = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
  if (taken.rows[0]) return response.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });

  const org = await findOrCreateOrganization({ name: organization });
  // Mot de passe inutilisable tant que le recruteur n'a pas choisi le sien avec le lien d'activation.
  const unusable = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const user = await pool.query(
    `INSERT INTO users (role, email, password_hash, data, organization_id, organization_role)
     VALUES ('recruteur', $1, $2, $3, $4, 'owner') RETURNING id`,
    [email, unusable, JSON.stringify({ contact }), org.id]
  );
  const link = await createAccessLink(user.rows[0].id);
  let emailError = '';
  if (request.body.send_email) {
    await sendAccessLinkEmail({ email, organization: org.name, contact, link, first: true }).catch((error) => { emailError = error.message; });
  }
  const created = await pool.query(`${RECRUITER_LIST_SQL} WHERE o.id = $1`, [org.id]);
  response.status(201).json({ recruiter: created.rows[0], link, emailed: Boolean(request.body.send_email) && !emailError, email_error: emailError });
}));

async function recruiterOrganization(id) {
  if (!/^\d+$/.test(String(id))) return null;
  return (await pool.query(`${RECRUITER_LIST_SQL} WHERE o.id = $1`, [id])).rows[0] || null;
}

// Nouveau lien d'accès (premier lien expiré ou mot de passe oublié) ; l'ancien lien cesse de fonctionner.
app.post('/api/admin/recruiters/:id/link', requireAdmin, safe(async (request, response) => {
  const recruiter = await recruiterOrganization(request.params.id);
  if (!recruiter?.user_id) return response.status(404).json({ error: 'Recruteur introuvable.' });
  const link = await createAccessLink(recruiter.user_id);
  let emailError = '';
  if (request.body?.send_email) {
    await sendAccessLinkEmail({ email: recruiter.email, organization: recruiter.name, contact: recruiter.contact, link, first: !recruiter.activated_at })
      .catch((error) => { emailError = error.message; });
  }
  response.json({ link, emailed: Boolean(request.body?.send_email) && !emailError, email_error: emailError });
}));

app.patch('/api/admin/recruiters/:id/status', requireAdmin, safe(async (request, response) => {
  const status = clean(request.body.status);
  if (!['active', 'suspended'].includes(status)) return response.status(400).json({ error: 'Statut invalide.' });
  const recruiter = await recruiterOrganization(request.params.id);
  if (!recruiter) return response.status(404).json({ error: 'Recruteur introuvable.' });
  await pool.query('UPDATE organizations SET account_status = $1 WHERE id = $2', [status, recruiter.id]);
  response.json(await recruiterOrganization(recruiter.id));
}));

// Suppression de l'accès : les offres restent publiées, simplement détachées de la société.
app.delete('/api/admin/recruiters/:id', requireAdmin, safe(async (request, response) => {
  const recruiter = await recruiterOrganization(request.params.id);
  if (!recruiter) return response.status(404).json({ error: 'Recruteur introuvable.' });
  await pool.query('UPDATE announcements SET organization_id = NULL WHERE organization_id = $1', [recruiter.id]);
  await pool.query('DELETE FROM users WHERE organization_id = $1', [recruiter.id]);
  await pool.query('DELETE FROM organizations WHERE id = $1', [recruiter.id]);
  response.status(204).end();
}));

// Rattache une offre à l'espace d'un recruteur (ou la détache avec organization_id = null).
app.patch('/api/admin/announcements/:id/recruiter', requireAdmin, safe(async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Annonce introuvable.' });
  const value = request.body.organization_id;
  const organizationId = value === null || value === '' || value === undefined ? null : String(value);
  if (organizationId !== null) {
    if (!/^\d+$/.test(organizationId) || !(await pool.query('SELECT 1 FROM organizations WHERE id = $1', [organizationId])).rows[0]) {
      return response.status(400).json({ error: 'Recruteur introuvable.' });
    }
  }
  const result = await pool.query(
    `UPDATE announcements a SET organization_id = $2 WHERE a.id = $1
     RETURNING a.id, a.organization_id, (SELECT name FROM organizations WHERE id = $2) AS organization_name`,
    [request.params.id, organizationId]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
  response.json(result.rows[0]);
}));

/* ===================== Bilan envoyé par e-mail au recruteur =====================
   Automatique le lendemain de la date limite d'une offre rattachée à un espace recruteur (tâche du matin, avec
   les alertes), ou à la demande depuis l'admin. Un seul envoi automatique par offre (report_sent_at). */

const REPORT_SOURCE_LABELS = {
  direct: 'Accès direct / applications', site: 'Navigation sur Carrières RDC', facebook: 'Facebook', whatsapp: 'WhatsApp',
  google: 'Google', linkedin: 'LinkedIn', tiktok: 'TikTok', email: 'Alertes et messageries e-mail', autre: 'Autres sites',
};
const REPORT_CHANNEL_LABELS = { web: 'Lien de candidature', email: 'E-mail', whatsapp: 'WhatsApp', phone: 'Appel téléphonique', '': 'Non précisé' };
const frNumber = (value) => Number(value || 0).toLocaleString('fr-FR');
const frDate = (value) => new Date(`${String(value).slice(0, 10)}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// Destinataire du bilan : le contact de la société à laquelle l'offre est rattachée.
async function reportRecipient(offerId) {
  const result = await pool.query(
    `SELECT o.id AS organization_id, o.name AS organization, o.account_status, o.auto_reports,
            u.email, COALESCE(u.data->>'contact', '') AS contact
     FROM announcements a JOIN organizations o ON o.id = a.organization_id
     LEFT JOIN LATERAL (
       SELECT * FROM users WHERE organization_id = o.id AND role = 'recruteur' ORDER BY (organization_role = 'owner') DESC, id LIMIT 1
     ) u ON TRUE
     WHERE a.id = $1`,
    [offerId]
  );
  return result.rows[0] || null;
}

function reportEmailText({ report, recipient, final }) {
  const { offer } = report;
  const views = Number(offer.views || 0);
  const applies = Number(offer.apply_clicks || 0);
  const rate = views ? `${Math.round((applies / views) * 100)} %` : '—';
  const sources = report.sources.filter((row) => row.views > 0).slice(0, 4)
    .map((row) => `${REPORT_SOURCE_LABELS[row.source] || row.source} ${frNumber(row.views)}`).join(', ');
  const channels = report.channels.slice(0, 4).map((row) => `${REPORT_CHANNEL_LABELS[row.channel] || row.channel} ${frNumber(row.applies)}`).join(', ');
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kinshasa' });
  const intro = final && offer.deadline
    ? `Votre offre « ${offer.title} » est arrivée à sa date limite le ${frDate(offer.deadline)}. Voici son bilan de diffusion sur Carrières RDC :`
    : `Voici le point sur la diffusion de votre offre « ${offer.title} » sur Carrières RDC, au ${today} :`;
  return [
    `Bonjour${recipient.contact ? ` ${recipient.contact}` : ''},`,
    '',
    intro,
    '',
    `• ${frNumber(views)} consultation${views > 1 ? 's' : ''} de l’offre`,
    `• ${frNumber(applies)} clic${applies > 1 ? 's' : ''} sur « Postuler »${views ? ` (${rate} des visiteurs)` : ''}`,
    sources ? `• Provenance des visiteurs : ${sources}` : null,
    channels ? `• Contact des candidats : ${channels}` : null,
    '',
    'Bilan complet, jour par jour (imprimable en PDF) :',
    `${frontendUrl}/espace-recruteur/bilan?id=${offer.id}`,
    `(connectez-vous avec l’adresse ${recipient.email})`,
    '',
    final
      ? `Vous recrutez encore ? Proposez-nous votre prochaine offre depuis votre espace : ${frontendUrl}/espace-recruteur`
      : `Votre espace recruteur : ${frontendUrl}/espace-recruteur`,
    offer.featured_from ? null : '',
    offer.featured_from ? null : `Pour plus de visibilité, mettez votre offre « à la une » : en tête des listes, avec un badge doré et en premier dans nos alertes e-mail. À partir de 10 $ pour 7 jours, à demander depuis votre espace.`,
    '',
    'Un clic sur « Postuler » correspond à l’ouverture du lien, de l’e-mail, du WhatsApp ou du numéro de candidature de l’offre. Chiffres anonymes, robots exclus.',
    '',
    '—',
    'L’équipe Carrières RDC',
    frontendUrl,
  ].filter((line) => line !== null).join('\n');
}

async function sendOfferReportEmail(offerId, { final }) {
  const recipient = await reportRecipient(offerId);
  if (!recipient) throw Object.assign(new Error('Cette offre n’est rattachée à aucun espace recruteur.'), { status: 400 });
  if (!recipient.email) throw Object.assign(new Error('Ce recruteur n’a pas d’adresse e-mail.'), { status: 400 });
  if (recipient.account_status !== 'active') throw Object.assign(new Error('L’accès de ce recruteur est suspendu.'), { status: 400 });
  const report = await offerReport(offerId);
  if (!report) throw Object.assign(new Error('Offre introuvable.'), { status: 404 });
  await sendTransactionalEmail({
    to: recipient.email,
    replyTo: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    subject: `${final ? 'Bilan' : 'Point'} de votre offre « ${report.offer.title} » — Carrières RDC`.slice(0, 180),
    text: reportEmailText({ report, recipient, final }),
  });
  if (final) await pool.query('UPDATE announcements SET report_sent_at = NOW() WHERE id = $1', [offerId]);
  return { to: recipient.email };
}

// Bilans dus : date limite passée (heure de Kinshasa) depuis 7 jours au plus, pas encore envoyés, recruteur actif.
async function sendDueOfferReports() {
  const due = await pool.query(
    `SELECT a.id FROM announcements a JOIN organizations o ON o.id = a.organization_id
     WHERE a.report_sent_at IS NULL AND a.deadline IS NOT NULL AND o.account_status = 'active' AND o.auto_reports
       AND a.deadline < (NOW() AT TIME ZONE 'Africa/Kinshasa')::date
       AND a.deadline >= (NOW() AT TIME ZONE 'Africa/Kinshasa')::date - 7
     ORDER BY a.deadline LIMIT 50`
  );
  const run = { reports_due: due.rows.length, reports_sent: 0, reports_failed: 0 };
  for (const { id } of due.rows) {
    try {
      await sendOfferReportEmail(id, { final: true });
      run.reports_sent += 1;
    } catch (error) {
      run.reports_failed += 1;
      console.error(`Bilan de l’offre ${id} non envoyé :`, error.message);
    }
  }
  return run;
}

app.post('/api/admin/announcements/:id/send-report', requireAdmin, safe(async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Offre introuvable.' });
  try {
    const sent = await sendOfferReportEmail(request.params.id, { final: Boolean(request.body?.final) });
    response.json({ ok: true, ...sent });
  } catch (error) {
    response.status(error.status || 502).json({ error: error.status ? error.message : `E-mail non envoyé : ${error.message}` });
  }
}));

app.patch('/api/admin/recruiters/:id/auto-reports', requireAdmin, safe(async (request, response) => {
  const recruiter = await recruiterOrganization(request.params.id);
  if (!recruiter) return response.status(404).json({ error: 'Recruteur introuvable.' });
  await pool.query('UPDATE organizations SET auto_reports = $2 WHERE id = $1', [recruiter.id, Boolean(request.body?.enabled)]);
  response.json(await recruiterOrganization(recruiter.id));
}));

// Mise « à la une » d'une offre par l'administrateur (après paiement du recruteur, hors du site), jusqu'à une date
// incluse ; until = null la retire de la une. Au-delà de FEATURED_LIMIT offres en même temps, un avertissement est renvoyé.
app.patch('/api/admin/announcements/:id/featured', requireAdmin, safe(async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Offre introuvable.' });
  const until = request.body?.until ? clean(request.body.until) : null;
  if (until && (!/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(until)))) return response.status(400).json({ error: 'Date invalide.' });
  const result = await pool.query(
    until
      ? `UPDATE announcements SET featured_until = $2::date, featured_request_days = NULL, featured_requested_at = NULL,
           featured_from = CASE WHEN ${FEATURED_SQL} THEN featured_from ELSE (NOW() AT TIME ZONE 'Africa/Kinshasa')::date END
         WHERE id = $1 AND $2::date >= (NOW() AT TIME ZONE 'Africa/Kinshasa')::date
         RETURNING id, to_char(featured_from, 'YYYY-MM-DD') AS featured_from, to_char(featured_until, 'YYYY-MM-DD') AS featured_until`
      : `UPDATE announcements SET featured_until = NULL, featured_from = NULL WHERE id = $1
         RETURNING id, featured_from, featured_until`,
    until ? [request.params.id, until] : [request.params.id]
  );
  if (!result.rows[0]) {
    const exists = await pool.query('SELECT 1 FROM announcements WHERE id = $1', [request.params.id]);
    if (!exists.rows[0]) return response.status(404).json({ error: 'Offre introuvable.' });
    return response.status(400).json({ error: 'La date de fin doit être aujourd’hui ou plus tard.' });
  }
  const active = (await pool.query(`SELECT COUNT(*)::int AS count FROM announcements WHERE ${FEATURED_SQL} AND ${PUBLICLY_VISIBLE_SQL}`)).rows[0].count;
  response.json({
    ...result.rows[0],
    featured: Boolean(until),
    active_featured: active,
    warning: active > FEATURED_LIMIT ? `${active} offres sont à la une en même temps : au-delà de ${FEATURED_LIMIT}, la mise en avant perd de sa valeur.` : '',
  });
}));

// Demande de mise à la une par le recruteur : enregistrée sur l'offre, envoyée dans les messages de l'administrateur
// (avec une alerte e-mail) et confirmée au recruteur. L'administrateur active la une après réception du paiement.
app.post('/api/recruiter/offers/:id/featured-request', requireRecruiter, safe(async (request, response) => {
  const days = Number(request.body?.days);
  const price = FEATURED_PLANS[days];
  if (!price) return response.status(400).json({ error: 'Durée invalide : 7, 14 ou 30 jours.' });
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Offre introuvable.' });
  const offer = (await pool.query(
    `SELECT id, title, ${FEATURED_SQL} AS featured, featured_request_days FROM announcements
     WHERE id = $1 AND organization_id = $2 AND ${PUBLICLY_VISIBLE_SQL}
       AND (deadline IS NULL OR deadline >= (NOW() AT TIME ZONE 'Africa/Kinshasa')::date)`,
    [request.params.id, request.user.organization_id]
  )).rows[0];
  if (!offer) return response.status(404).json({ error: 'Offre introuvable ou déjà expirée.' });
  if (offer.featured) return response.status(409).json({ error: 'Cette offre est déjà à la une.' });
  await pool.query('UPDATE announcements SET featured_request_days = $2, featured_requested_at = NOW() WHERE id = $1', [offer.id, days]);
  const organization = (await pool.query('SELECT name FROM organizations WHERE id = $1', [request.user.organization_id])).rows[0]?.name || 'Recruteur';
  const label = `${days} jours (${price} $)`;
  await pool.query(
    'INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4)',
    [`${organization} (espace recruteur)`, request.user.email, `Demande « à la une » : ${offer.title} — ${label}`.slice(0, 180),
      `${organization} demande la mise à la une de l’offre « ${offer.title} » pendant ${label}.\n\nAprès réception du paiement, activez la une avec l’étoile de cette offre dans « Offres publiées ».`]
  );
  response.json({ ok: true, featured_request_days: days, featured_requested_at: new Date().toISOString() });
  sendTransactionalEmail({
    to: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    replyTo: request.user.email,
    subject: `Demande « à la une » : ${offer.title} — ${label}`.slice(0, 180),
    text: `${organization} (${request.user.email}) demande la mise à la une de l’offre « ${offer.title} » pendant ${label}.\n\nRépondez à cet e-mail pour lui indiquer le paiement, puis activez la une depuis ${frontendUrl}/admin#offres.`,
  }).catch((error) => console.error('Alerte e-mail non envoyée :', error.message));
  sendTransactionalEmail({
    to: request.user.email,
    replyTo: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    subject: `Votre demande « à la une » — ${offer.title}`.slice(0, 180),
    text: `Bonjour,\n\nNous avons bien reçu votre demande de mise à la une de l’offre « ${offer.title} » pendant ${label}.\n\nNous vous contactons très vite pour le paiement (Mobile Money ou virement). Dès réception, votre offre passe en tête des listes de Carrières RDC, avec un badge doré, et en premier dans nos alertes e-mail.\n\nVous pouvez répondre directement à cet e-mail pour toute question.\n\n—\nL’équipe Carrières RDC\n${frontendUrl}`,
  }).catch((error) => console.error('Confirmation e-mail non envoyée :', error.message));
}));

// Vérification d'une organisation par l'administrateur (documents contrôlés) : badge « Vérifiée » sur ses offres.
app.patch('/api/admin/recruiters/:id/verification', requireAdmin, safe(async (request, response) => {
  const recruiter = await recruiterOrganization(request.params.id);
  if (!recruiter) return response.status(404).json({ error: 'Recruteur introuvable.' });
  const verified = Boolean(request.body?.verified);
  const note = clean(request.body?.note).slice(0, 500);
  await pool.query(
    'UPDATE organizations SET verified_at = CASE WHEN $2 THEN COALESCE(verified_at, NOW()) ELSE NULL END, verification_note = $3 WHERE id = $1',
    [recruiter.id, verified, verified ? note : '']
  );
  response.json(await recruiterOrganization(recruiter.id));
}));

// Signalement d'une offre par un visiteur : enregistré, envoyé dans les messages de l'admin avec une alerte e-mail.
// 5 signalements par adresse IP et par heure au plus, un seul par offre (adresse IP gardée seulement en mémoire).
const REPORT_REASONS = {
  argent: 'On m’a demandé de l’argent',
  fausse: 'Offre fausse ou trompeuse',
  contact: 'Coordonnées qui ne fonctionnent pas',
  expiree: 'Offre déjà pourvue ou expirée',
  autre: 'Autre problème',
};
const recentReports = new Map();
app.post('/api/announcements/:id/flag', safe(async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Offre introuvable.' });
  const reason = clean(request.body?.reason);
  if (!REPORT_REASONS[reason]) return response.status(400).json({ error: 'Choisissez le motif du signalement.' });
  const details = clean(request.body?.details).slice(0, 1500);
  const contact = clean(request.body?.contact).slice(0, 160);
  if (BOT_PATTERN.test(request.get('user-agent') || '')) return response.status(204).end();
  const ip = String(request.get('x-forwarded-for') || request.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const entry = recentReports.get(ip) || { times: [], offers: new Set() };
  entry.times = entry.times.filter((time) => now - time < 3600_000);
  if (entry.offers.has(request.params.id)) return response.json({ ok: true, duplicate: true });
  if (entry.times.length >= 5) return response.status(429).json({ error: 'Trop de signalements envoyés. Réessayez plus tard.' });
  const offer = (await pool.query('SELECT id, title, company FROM announcements WHERE id = $1', [request.params.id])).rows[0];
  if (!offer) return response.status(404).json({ error: 'Offre introuvable.' });
  entry.times.push(now);
  entry.offers.add(request.params.id);
  recentReports.set(ip, entry);
  if (recentReports.size > 20000) recentReports.clear();
  await pool.query('INSERT INTO offer_reports (announcement_id, reason, details, contact) VALUES ($1, $2, $3, $4)', [offer.id, reason, details, contact]);
  const label = REPORT_REASONS[reason];
  const text = `Signalement de l’offre « ${offer.title} » (${offer.company}) : ${label}.${details ? `\n\n« ${details} »` : ''}${contact ? `\n\nContact du visiteur : ${contact}` : ''}\n\nOffre : ${frontendUrl}/offre/${offer.id}\nÀ vérifier depuis ${frontendUrl}/admin#offres`;
  await pool.query(
    'INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4)',
    ['Signalement d’un visiteur', /@/.test(contact) ? contact : 'signalement@carrieresrdc.com', `Signalement : ${offer.title} — ${label}`.slice(0, 180), text]
  );
  response.status(201).json({ ok: true });
  sendTransactionalEmail({
    to: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    ...(/@/.test(contact) ? { replyTo: contact } : {}),
    subject: `⚠ Offre signalée : ${offer.title} — ${label}`.slice(0, 180),
    text,
  }).catch((error) => console.error('Alerte e-mail non envoyée :', error.message));
}));

// Signalements d'une offre traités par l'administrateur.
app.patch('/api/admin/announcements/:id/reports/resolve', requireAdmin, safe(async (request, response) => {
  if (!/^\d+$/.test(request.params.id)) return response.status(404).json({ error: 'Offre introuvable.' });
  const result = await pool.query('UPDATE offer_reports SET resolved_at = NOW() WHERE announcement_id = $1 AND resolved_at IS NULL', [request.params.id]);
  response.json({ ok: true, resolved: result.rowCount || 0 });
}));

// Tentatives de connexion échouées, gardées en mémoire : 8 essais par adresse et par quart d'heure.
const failedLogins = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
function tooManyLogins(key) {
  const entry = failedLogins.get(key);
  if (!entry || Date.now() - entry.since > LOGIN_WINDOW_MS) return false;
  return entry.count >= 8;
}
function noteFailedLogin(key) {
  const entry = failedLogins.get(key);
  if (!entry || Date.now() - entry.since > LOGIN_WINDOW_MS) failedLogins.set(key, { count: 1, since: Date.now() });
  else entry.count += 1;
  if (failedLogins.size > 10000) failedLogins.clear();
}

function recruiterSession(user) {
  return {
    token: jwt.sign({ id: user.id, email: user.email, role: 'recruteur', organization_id: user.organization_id }, jwtSecret, { expiresIn: '30d' }),
    email: user.email,
  };
}
async function noteLogin(userId) {
  await pool.query(`UPDATE users SET data = data || jsonb_build_object('last_login_at', NOW()::text) WHERE id = $1`, [userId]);
}

const PASSWORD_RULE = 'Le mot de passe doit contenir au moins 8 caractères.';

// Activation (ou nouveau mot de passe) avec le lien envoyé par l'administrateur.
app.post('/api/recruiter/activate', safe(async (request, response) => {
  const token = clean(request.body.token);
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  if (password.length < 8 || password.length > 200) return response.status(400).json({ error: PASSWORD_RULE });
  const found = await pool.query(
    `SELECT t.id AS token_id, u.id, u.email, u.organization_id, u.account_status, o.account_status AS organization_status
     FROM auth_tokens t JOIN users u ON u.id = t.user_id LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE t.token_hash = $1 AND t.kind = 'password_reset' AND t.used_at IS NULL AND t.expires_at > NOW() AND u.role = 'recruteur'`,
    [hashToken(token)]
  );
  const user = found.rows[0];
  if (!token || !user) return response.status(400).json({ error: 'Ce lien n’est plus valable (déjà utilisé ou expiré). Demandez un nouveau lien à Carrières RDC.' });
  if (user.account_status !== 'active' || user.organization_status !== 'active') return response.status(403).json({ error: 'Cet accès est suspendu. Contactez Carrières RDC.' });
  await pool.query('UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [user.token_id]);
  await pool.query('UPDATE users SET password_hash = $2, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1', [user.id, await bcrypt.hash(password, 12)]);
  await noteLogin(user.id);
  response.json(recruiterSession(user));
}));

app.post('/api/recruiter/login', safe(async (request, response) => {
  const email = clean(request.body.email).toLowerCase();
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  if (!email || !password) return response.status(400).json({ error: 'Renseignez votre e-mail et votre mot de passe.' });
  if (tooManyLogins(email)) return response.status(429).json({ error: 'Trop de tentatives. Réessayez dans un quart d’heure.' });
  const found = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.organization_id, u.account_status, u.email_verified_at, o.account_status AS organization_status
     FROM users u LEFT JOIN organizations o ON o.id = u.organization_id WHERE lower(u.email) = $1 AND u.role = 'recruteur'`,
    [email]
  );
  const user = found.rows[0];
  if (!user || !user.email_verified_at || !(await bcrypt.compare(password, user.password_hash))) {
    noteFailedLogin(email);
    return response.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }
  if (user.account_status !== 'active' || user.organization_status !== 'active') return response.status(403).json({ error: 'Cet accès est suspendu. Contactez Carrières RDC.' });
  failedLogins.delete(email);
  await noteLogin(user.id);
  response.json(recruiterSession(user));
}));

function requireRecruiter(request, response, next) {
  requireUser(request, response, () => {
    if (request.user.role !== 'recruteur' || !request.user.organization_id) return response.status(403).json({ error: 'Espace réservé aux recruteurs.' });
    next();
  });
}

// Tableau de bord du recruteur : sa société et les offres rattachées, avec leurs statistiques.
app.get('/api/recruiter/me', requireRecruiter, safe(async (request, response) => {
  const [organization, offers] = await Promise.all([
    pool.query(`SELECT o.name, COALESCE(u.data->>'contact', '') AS contact FROM organizations o JOIN users u ON u.id = $2 WHERE o.id = $1`, [request.user.organization_id, request.user.id]),
    pool.query(
      `SELECT id, title, category, company, location, contract_type, to_char(deadline, 'YYYY-MM-DD') AS deadline, created_at,
              views, apply_clicks, ${FEATURED_SQL} AS featured, to_char(featured_until, 'YYYY-MM-DD') AS featured_until,
              featured_request_days, featured_requested_at,
              NOT (deadline IS NULL OR NOW() < ((deadline + 2)::timestamp AT TIME ZONE 'Africa/Kinshasa')) AS hidden
       FROM announcements WHERE organization_id = $1 ORDER BY created_at DESC`,
      [request.user.organization_id]
    ),
  ]);
  response.json({ email: request.user.email, organization: organization.rows[0]?.name || '', contact: organization.rows[0]?.contact || '', offers: offers.rows });
}));

app.get('/api/recruiter/offers/:id/report', requireRecruiter, safe(async (request, response) => {
  const report = await offerReport(request.params.id, request.user.organization_id);
  if (!report) return response.status(404).json({ error: 'Offre introuvable dans votre espace.' });
  response.json(report);
}));

app.post('/api/recruiter/password', requireRecruiter, safe(async (request, response) => {
  const current = typeof request.body.current === 'string' ? request.body.current : '';
  const next = typeof request.body.password === 'string' ? request.body.password : '';
  if (next.length < 8 || next.length > 200) return response.status(400).json({ error: PASSWORD_RULE });
  const row = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [request.user.id])).rows[0];
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return response.status(400).json({ error: 'Mot de passe actuel incorrect.' });
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [request.user.id, await bcrypt.hash(next, 12)]);
  response.json({ ok: true });
}));

// Proposition d'offre : arrive dans les messages de l'administrateur, qui la vérifie et la publie.
app.post('/api/recruiter/proposals', requireRecruiter, safe(async (request, response) => {
  const title = clean(request.body.title).slice(0, 160);
  const details = clean(request.body.details).slice(0, 8000);
  if (!title || details.length < 20) return response.status(400).json({ error: 'Indiquez l’intitulé du poste et quelques détails (au moins 20 caractères).' });
  const organization = (await pool.query('SELECT name FROM organizations WHERE id = $1', [request.user.organization_id])).rows[0]?.name || 'Recruteur';
  const subject = `Offre proposée : ${title}`.slice(0, 180);
  const result = await pool.query(
    'INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
    [`${organization} (espace recruteur)`, request.user.email, subject, details]
  );
  response.status(201).json(result.rows[0]);
  sendTransactionalEmail({
    to: process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
    replyTo: request.user.email,
    subject: `Nouvelle offre proposée par ${organization} : ${title}`.slice(0, 180),
    text: `${organization} (${request.user.email}) propose une offre depuis son espace recruteur.\n\nIntitulé : ${title}\n\n${details}\n\n—\nÀ vérifier et publier depuis ${frontendUrl}/admin`,
  }).catch((error) => console.error('Alerte e-mail non envoyée :', error.message));
}));

app.delete('/api/announcements/:id', requireAdmin, async (request, response) => {
  await pool.query('DELETE FROM announcements WHERE id = $1', [request.params.id]);
  response.status(204).end();
});

app.post('/api/messages', async (request, response) => {
  const values = [clean(request.body.name), clean(request.body.email), clean(request.body.subject), clean(request.body.message)];
  if (!values.every(Boolean) || !values[1].includes('@')) return response.status(400).json({ error: 'Veuillez remplir correctement tous les champs.' });
  const result = await pool.query('INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at', values);
  response.status(201).json(result.rows[0]);

  // Alerte e-mail à l'administrateur (sans bloquer la réponse au visiteur). « Répondre » écrit directement au visiteur.
  const alertTo = process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  const [name, email, subject, message] = values;
  sendTransactionalEmail({
    to: alertTo,
    replyTo: email,
    subject: `Nouveau message Carrières RDC : ${subject}`.slice(0, 180),
    text: `Nouveau message reçu via le formulaire de contact du site.\n\nDe : ${name} <${email}>\nSujet : ${subject}\n\n${message}\n\n—\nRépondez directement à cet e-mail pour écrire à ${name}.\nTous les messages : ${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/admin`,
  }).catch((error) => console.error('Alerte e-mail non envoyée :', error.message));
});

// Test de l'alerte e-mail depuis le panneau admin : renvoie la cause exacte en cas d'échec.
app.post('/api/admin/test-email', requireAdmin, async (_request, response) => {
  const to = process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  const { smtp, resend } = emailConfiguration();
  const methods = [smtp && `SMTP (${smtp.user})`, resend && 'Resend'].filter(Boolean).join(' puis ') || 'aucune';
  try {
    await sendTransactionalEmail({
      to,
      subject: 'Test de l’alerte e-mail — Carrières RDC',
      text: 'Ceci est un e-mail de test envoyé depuis le panneau d’administration. Si vous le recevez, les alertes des messages de contact fonctionnent.',
    });
    response.json({ ok: true, to, methods });
  } catch (error) {
    response.status(502).json({ error: `Envoi impossible vers ${to} (méthodes : ${methods}). Détail : ${error.message}` });
  }
});

app.get('/api/messages', requireAdmin, async (_request, response) => {
  const result = await pool.query('SELECT id, name, email, subject, message, created_at, reply, replied_at, read_at FROM messages ORDER BY created_at DESC');
  response.json(result.rows);
});

// Réponse à un message de contact : envoyée par e-mail à l'adresse du visiteur, puis enregistrée.
// Les réponses du visiteur arrivent dans la boîte de Carrières RDC (Reply-To).
app.post('/api/messages/:id/reply', requireAdmin, async (request, response) => {
  const reply = clean(request.body.reply);
  if (reply.length < 2) return response.status(400).json({ error: 'Écrivez votre réponse avant de l’envoyer.' });
  if (reply.length > 5000) return response.status(400).json({ error: 'La réponse est trop longue (5 000 caractères au maximum).' });
  const found = await pool.query('SELECT id, name, email, subject, message, created_at FROM messages WHERE id = $1', [request.params.id]);
  const original = found.rows[0];
  if (!original) return response.status(404).json({ error: 'Message introuvable (il a peut-être été supprimé).' });

  const siteUrl = (process.env.FRONTEND_URL || 'https://www.carrieresrdc.com').replace(/\/$/, '');
  const receivedOn = new Date(original.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kinshasa' });
  const quoted = original.message.split('\n').map((line) => `> ${line}`).join('\n');
  try {
    await sendTransactionalEmail({
      to: original.email,
      replyTo: process.env.CONTACT_REPLY_TO || process.env.CONTACT_ALERT_EMAIL || process.env.ADMIN_EMAIL,
      subject: `Re : ${original.subject}`.slice(0, 180),
      text: `${reply}\n\n—\nL’équipe Carrières RDC\n${siteUrl}\n\nVotre message du ${receivedOn} :\n${quoted}`,
    });
  } catch (error) {
    console.error('Réponse non envoyée :', error.message);
    return response.status(502).json({ error: `La réponse n’a pas pu être envoyée à ${original.email}. Détail : ${error.message}` });
  }
  const saved = await pool.query('UPDATE messages SET reply = $1, replied_at = NOW(), read_at = COALESCE(read_at, NOW()) WHERE id = $2 RETURNING id, reply, replied_at', [reply, original.id]);
  response.json(saved.rows[0]);
});

// Message ouvert dans le panneau admin : il n'est plus compté comme « non lu ».
app.patch('/api/messages/:id/read', requireAdmin, async (request, response) => {
  const result = await pool.query('UPDATE messages SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 RETURNING id, read_at', [request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Message introuvable.' });
  response.json(result.rows[0]);
});

/* ----- Alertes emploi par e-mail ----- */
// Le visiteur choisit ses critères ; il confirme son adresse par un lien (double validation), puis reçoit au plus
// un e-mail par jour avec les nouvelles publications correspondantes. Chaque e-mail contient un lien de désabonnement.
const ALERT_CATEGORIES = ['', 'Offre d’emploi', 'Annonce', 'Appel d’offre'];
const ALERT_DETAIL_BASES = { 'Offre d’emploi': '/offre', Annonce: '/annonce', 'Appel d’offre': '/appel-offre' };
const ALERT_DAILY_LIMIT = Number(process.env.ALERTS_DAILY_LIMIT || 90); // offre gratuite Resend : 100 e-mails par jour
const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
const foldText = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const alertSummary = (alert) =>
  [alert.category === 'Offre d’emploi' ? 'Offres d’emploi' : alert.category === 'Annonce' ? 'Annonces' : alert.category === 'Appel d’offre' ? 'Appels d’offres' : 'Toutes les publications',
    alert.city, alert.contract_type, alert.keywords ? `« ${alert.keywords} »` : ''].filter(Boolean).join(' · ');

app.post('/api/alerts', async (request, response) => {
  const email = clean(request.body.email).toLowerCase().slice(0, 160);
  const category = clean(request.body.category);
  const city = clean(request.body.city).slice(0, 60);
  const contractType = clean(request.body.contract_type);
  const keywords = clean(request.body.keywords).slice(0, 80);
  if (!EMAIL_PATTERN.test(email)) return response.status(400).json({ error: 'Adresse e-mail invalide.' });
  if (!ALERT_CATEGORIES.includes(category)) return response.status(400).json({ error: 'Catégorie invalide.' });
  if (contractType && !CONTRACT_TYPES.includes(contractType)) return response.status(400).json({ error: 'Type de contrat invalide.' });

  const existing = (await pool.query('SELECT id, created_at, confirmed_at FROM alert_subscriptions WHERE lower(email) = $1', [email])).rows[0];
  // Anti-abus : pas plus d’un e-mail de confirmation par adresse toutes les 2 minutes.
  if (existing && !existing.confirmed_at && Date.now() - new Date(existing.created_at).getTime() < 120_000) {
    return response.json({ ok: true, pending: true });
  }
  const token = crypto.randomBytes(24).toString('hex');
  // Toute modification des critères doit être reconfirmée par le propriétaire de l’adresse.
  await pool.query(
    `INSERT INTO alert_subscriptions (email, category, city, contract_type, keywords, token)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ((lower(email))) DO UPDATE SET category = $2, city = $3, contract_type = $4, keywords = $5, token = $6,
       confirmed_at = NULL, created_at = NOW()`,
    [email, category, city, contractType, keywords, token]
  );
  const link = `${frontendUrl}/alertes/confirmer?token=${token}`;
  try {
    await sendTransactionalEmail({
      to: email,
      subject: 'Confirmez votre alerte emploi – Carrières RDC',
      text: `Bonjour,\n\nVous avez demandé à recevoir les nouvelles publications de Carrières RDC correspondant à :\n${alertSummary({ category, city, contract_type: contractType, keywords })}\n\nConfirmez votre adresse en ouvrant ce lien :\n${link}\n\nVous recevrez au plus un e-mail par jour, et vous pourrez vous désabonner en un clic.\nSi vous n’êtes pas à l’origine de cette demande, ignorez simplement cet e-mail.\n\n—\nL’équipe Carrières RDC\n${frontendUrl}`,
    });
  } catch (error) {
    console.error('Confirmation d’alerte non envoyée :', error.message);
    return response.status(502).json({ error: 'L’e-mail de confirmation n’a pas pu être envoyé. Réessayez dans quelques minutes.' });
  }
  response.json({ ok: true });
});

app.post('/api/alerts/confirm', async (request, response) => {
  const token = clean(request.body.token);
  if (!/^[a-f0-9]{48}$/.test(token)) return response.status(400).json({ error: 'Lien de confirmation invalide.' });
  // last_sent_at = maintenant : le premier e-mail ne contiendra que les publications à venir.
  const result = await pool.query(
    `UPDATE alert_subscriptions SET confirmed_at = COALESCE(confirmed_at, NOW()), last_sent_at = COALESCE(last_sent_at, NOW())
     WHERE token = $1 RETURNING email, category, city, contract_type, keywords`,
    [token]
  );
  const alert = result.rows[0];
  if (!alert) return response.status(404).json({ error: 'Ce lien n’est plus valable. Créez une nouvelle alerte.' });
  response.json({ ok: true, email: alert.email, summary: alertSummary(alert) });
});

app.post('/api/alerts/unsubscribe', async (request, response) => {
  const token = clean(request.body.token);
  if (!/^[a-f0-9]{48}$/.test(token)) return response.status(400).json({ error: 'Lien de désabonnement invalide.' });
  await pool.query('DELETE FROM alert_subscriptions WHERE token = $1', [token]);
  response.json({ ok: true }); // même réponse si l’alerte était déjà supprimée
});

let lastAlertRun = null;
let alertRunInProgress = false;

// Envoie à chaque abonné confirmé les nouvelles publications correspondant à ses critères (au plus 15 par e-mail).
// Les abonnés sans nouveauté ne reçoivent rien ; au-delà de la limite quotidienne, les envois reprennent le lendemain.
async function sendAlertDigests() {
  const run = { started_at: new Date().toISOString(), checked: 0, sent: 0, failed: 0, limited: false };
  const subscribers = (await pool.query(
    'SELECT * FROM alert_subscriptions WHERE confirmed_at IS NOT NULL ORDER BY last_sent_at ASC NULLS FIRST LIMIT 2000'
  )).rows;
  for (const alert of subscribers) {
    if (run.sent >= ALERT_DAILY_LIMIT) { run.limited = true; break; }
    run.checked += 1;
    const since = alert.last_sent_at || alert.confirmed_at;
    const offers = (await pool.query(
      `SELECT id, title, category, company, location, description, contract_type, to_char(deadline, 'YYYY-MM-DD') AS deadline,
              ${FEATURED_SQL} AS featured
       FROM announcements
       WHERE created_at > $1 AND (deadline IS NULL OR deadline >= CURRENT_DATE)
         AND ($2 = '' OR category = $2) AND ($3 = '' OR location ILIKE '%' || $3 || '%') AND ($4 = '' OR contract_type = $4)
       ORDER BY ${FEATURED_SQL} DESC, created_at DESC LIMIT 60`,
      [since, alert.category, alert.city, alert.contract_type]
    )).rows;
    const words = foldText(alert.keywords).split(/[\s,;]+/).filter((word) => word.length >= 2);
    const matches = offers
      .filter((offer) => !words.length || words.some((word) => foldText(`${offer.title} ${offer.company} ${offer.description}`).includes(word)))
      .slice(0, 15);
    if (!matches.length) continue;

    const unsubscribe = `${frontendUrl}/alertes/desabonner?token=${alert.token}`;
    const lines = matches.map((offer) => {
      const deadline = offer.deadline ? ` — date limite : ${new Date(`${offer.deadline}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
      return `• ${offer.featured ? '⭐ À LA UNE — ' : ''}${offer.title}\n  ${offer.company}, ${offer.location}${deadline}\n  ${frontendUrl}${ALERT_DETAIL_BASES[offer.category] || '/offre'}/${offer.id}`;
    });
    const count = matches.length;
    try {
      await sendTransactionalEmail({
        to: alert.email,
        subject: `${count} nouvelle${count > 1 ? 's' : ''} publication${count > 1 ? 's' : ''} pour vous – Carrières RDC`,
        text: `Bonjour,\n\nVoici les nouvelles publications correspondant à votre alerte (${alertSummary(alert)}) :\n\n${lines.join('\n\n')}\n\nToutes les offres : ${frontendUrl}/offres\n\n—\nCarrières RDC — les opportunités de la RDC, au même endroit.\nVous recevez cet e-mail car vous avez créé une alerte sur ${frontendUrl.replace(/^https?:\/\//, '')}.\nSe désabonner : ${unsubscribe}`,
        headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
      });
      await pool.query('UPDATE alert_subscriptions SET last_sent_at = NOW() WHERE id = $1', [alert.id]);
      run.sent += 1;
    } catch (error) {
      run.failed += 1;
      console.error(`Alerte non envoyée à ${alert.email} :`, error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 600)); // limite de débit de Resend (2 envois par seconde)
  }
  run.finished_at = new Date().toISOString();
  return run;
}

// Déclenché chaque matin par la tâche planifiée du site (secret partagé) ou par l’administrateur.
// Répond tout de suite ; les envois continuent en arrière-plan.
app.post('/api/alerts/digest', (request, response, next) => {
  const secret = process.env.ALERTS_SECRET;
  if (secret && request.get('x-alerts-secret') === secret) return next();
  return requireAdmin(request, response, next);
}, (_request, response) => {
  if (alertRunInProgress) return response.status(202).json({ ok: true, already_running: true });
  alertRunInProgress = true;
  sendAlertDigests()
    .then(async (run) => ({ ...run, ...(await sendDueOfferReports().catch((error) => ({ reports_error: error.message }))) }))
    .then((run) => { lastAlertRun = run; console.log('Alertes envoyées :', JSON.stringify(run)); })
    .catch((error) => { lastAlertRun = { error: error.message, finished_at: new Date().toISOString() }; console.error('Envoi des alertes interrompu :', error); })
    .finally(() => { alertRunInProgress = false; });
  response.status(202).json({ ok: true, started: true });
});

app.get('/api/alerts/stats', requireAdmin, async (_request, response) => {
  const counts = (await pool.query(
    'SELECT COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)::int AS confirmed, COUNT(*) FILTER (WHERE confirmed_at IS NULL)::int AS pending FROM alert_subscriptions'
  )).rows[0];
  response.json({ ...counts, daily_limit: ALERT_DAILY_LIMIT, running: alertRunInProgress, last_run: lastAlertRun });
});

app.delete('/api/messages/:id', requireAdmin, async (request, response) => {
  await pool.query('DELETE FROM messages WHERE id = $1', [request.params.id]);
  response.status(204).end();
});

// ============ OFFRES PUBLIÉES PAR LES RECRUTEURS ============
app.post('/api/my/jobs', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const title = clean(request.body.title);
  const location = clean(request.body.location);
  const description = clean(request.body.description);
  const media = cleanMedia(request.body.media || []);
  if (!title || !location || !media || (!description && media.length === 0)) return response.status(400).json({ error: 'Ajoutez une description ou un document à votre offre.' });
  const me = await pool.query('SELECT data FROM users WHERE id = $1', [request.user.id]);
  const company = clean(me.rows[0]?.data?.companyName) || 'Entreprise vérifiée';
  const result = await pool.query(
    "INSERT INTO announcements (title, category, company, location, description, media, owner_id, organization_id) VALUES ($1, 'Offre d’emploi', $2, $3, $4, $5, $6, $7) RETURNING *",
    [title, company, location, description, JSON.stringify(media), request.user.id, request.user.organization_id || null]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/jobs', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const result = await pool.query(
    'SELECT id, title, category, company, location, description, media, created_at FROM announcements WHERE owner_id = $1 OR organization_id = $2 ORDER BY created_at DESC',
    [request.user.id, request.user.organization_id || 0]
  );
  response.json(result.rows);
});

app.delete('/api/my/jobs/:id', requireUser, requireOrganizationOwner, async (request, response) => {
  const result = await pool.query(
    'DELETE FROM announcements WHERE id = $1 AND (owner_id = $2 OR organization_id = $3) RETURNING id',
    [request.params.id, request.user.id, request.user.organization_id || 0]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Offre introuvable.' });
  response.status(204).end();
});

// ============ CANDIDATURES (CANDIDATS) ============
app.post('/api/my/applications', requireUser, async (request, response) => {
  if (request.user.role !== 'candidat') return response.status(403).json({ error: 'Réservé aux comptes candidats.' });
  const announcementId = Number(request.body.announcementId);
  const coverLetter = clean(request.body.coverLetter);
  const cvDataUrl = typeof request.body.cvDataUrl === 'string' ? request.body.cvDataUrl : '';
  const cvName = clean(request.body.cvName).slice(0, 180);
  if (!announcementId) return response.status(400).json({ error: 'Offre invalide.' });
  if (cvDataUrl && (!cvDataUrl.startsWith('data:application/pdf;base64,') || cvDataUrl.length > 6 * 1024 * 1024)) {
    return response.status(400).json({ error: 'Le CV doit être un PDF de 4 Mo maximum.' });
  }
  const exists = await pool.query('SELECT id FROM announcements WHERE id = $1', [announcementId]);
  if (!exists.rows[0]) return response.status(404).json({ error: 'Offre introuvable.' });
  const duplicate = await pool.query('SELECT id FROM applications WHERE user_id = $1 AND announcement_id = $2', [request.user.id, announcementId]);
  if (duplicate.rows[0]) return response.status(409).json({ error: 'Vous avez déjà postulé à cette offre.' });
  const profileResult = await pool.query('SELECT data FROM users WHERE id = $1', [request.user.id]);
  const profileCv = profileResult.rows[0]?.data || {};
  const selectedCvDataUrl = cvDataUrl || profileCv.cvDataUrl || null;
  const selectedCvName = cvName || profileCv.cvName || null;
  const result = await pool.query(
    'INSERT INTO applications (user_id, announcement_id, cover_letter, cv_data_url, cv_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, status, created_at',
    [request.user.id, announcementId, coverLetter, selectedCvDataUrl, selectedCvName]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/applications', requireUser, async (request, response) => {
  if (request.user.role !== 'candidat') return response.status(403).json({ error: 'Réservé aux comptes candidats.' });
  const result = await pool.query(
    `SELECT a.id, a.status, a.cover_letter, a.cv_name, a.created_at, n.id AS announcement_id, n.title, n.company, n.location
     FROM applications a JOIN announcements n ON n.id = a.announcement_id
     WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
    [request.user.id]
  );
  response.json(result.rows);
});

app.delete('/api/my/applications/:id', requireUser, async (request, response) => {
  const result = await pool.query('DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id', [request.params.id, request.user.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Candidature introuvable.' });
  response.status(204).end();
});

// ============ MATCHING ET MESSAGERIE PRIVEE ============
app.get('/api/my/matches', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const jobs = await pool.query(
    `SELECT id, title, description FROM announcements
     WHERE (owner_id = $1 OR organization_id = $2) AND category = 'Offre d’emploi'`,
    [request.user.id, request.user.organization_id || 0]
  );
  const candidates = await pool.query(
    `SELECT id, email, data, created_at FROM users
     WHERE role = 'candidat' AND account_status = 'active'
     ORDER BY created_at DESC`
  );
  const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const stopWords = new Set(['avec', 'pour', 'dans', 'une', 'des', 'les', 'sur', 'poste', 'profil', 'recherche', 'mission', 'offre']);
  const terms = (value) => normalize(value).split(/[^a-z0-9]+/).filter((term) => term.length > 3 && !stopWords.has(term));
  const matches = candidates.rows.map((candidate) => {
    const profile = candidate.data || {};
    const profileText = normalize([profile.metier, profile.bio, profile.ville, profile.fonction].join(' '));
    const matchedJobs = jobs.rows.map((job) => {
      const jobTerms = terms(`${job.title} ${job.description}`);
      const matchedTerms = jobTerms.filter((term) => profileText.includes(term));
      return { id: job.id, title: job.title, score: Math.min(100, Math.round((matchedTerms.length / Math.max(1, jobTerms.length)) * 100)), matchedTerms };
    }).filter((job) => job.score > 0).sort((a, b) => b.score - a.score);
    return { id: candidate.id, email: candidate.email, data: profile, created_at: candidate.created_at, matches: matchedJobs, score: matchedJobs[0]?.score || 0 };
  }).filter((candidate) => candidate.matches.length > 0).sort((a, b) => b.score - a.score);
  response.json(matches);
});

app.post('/api/my/messages', requireUser, async (request, response) => {
  const recipientId = Number(request.body.recipientId);
  const announcementId = request.body.announcementId ? Number(request.body.announcementId) : null;
  const subject = clean(request.body.subject).slice(0, 160);
  const body = clean(request.body.body).slice(0, 5000);
  if (!recipientId || !body) return response.status(400).json({ error: 'Destinataire et message obligatoires.' });
  const recipient = await pool.query('SELECT id, role FROM users WHERE id = $1 AND account_status = \'active\'', [recipientId]);
  if (!recipient.rows[0]) return response.status(404).json({ error: 'Candidat introuvable.' });
  if (request.user.role !== 'recruteur' || recipient.rows[0].role !== 'candidat') return response.status(403).json({ error: 'Messagerie recruteur-candidat uniquement.' });
  if (announcementId) {
    const job = await pool.query('SELECT id FROM announcements WHERE id = $1 AND (owner_id = $2 OR organization_id = $3)', [announcementId, request.user.id, request.user.organization_id || 0]);
    if (!job.rows[0]) return response.status(403).json({ error: 'Offre non autorisée.' });
  }
  const result = await pool.query(
    'INSERT INTO direct_messages (sender_id, recipient_id, announcement_id, subject, body) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
    [request.user.id, recipientId, announcementId, subject, body]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/messages', requireUser, async (request, response) => {
  const result = await pool.query(
    `SELECT m.id, m.subject, m.body, m.read_at, m.created_at, m.announcement_id,
            sender.id AS sender_id, sender.email AS sender_email,
            recipient.id AS recipient_id, recipient.email AS recipient_email,
            a.title AS announcement_title
     FROM direct_messages m
     JOIN users sender ON sender.id = m.sender_id
     JOIN users recipient ON recipient.id = m.recipient_id
     LEFT JOIN announcements a ON a.id = m.announcement_id
     WHERE m.sender_id = $1 OR m.recipient_id = $1 ORDER BY m.created_at DESC`,
    [request.user.id]
  );
  response.json(result.rows);
});

app.patch('/api/my/messages/:id/read', requireUser, async (request, response) => {
  const result = await pool.query('UPDATE direct_messages SET read_at = NOW() WHERE id = $1 AND recipient_id = $2 RETURNING id, read_at', [request.params.id, request.user.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Message introuvable.' });
  response.json(result.rows[0]);
});

// ============ SUIVI DES CANDIDATURES REÇUES (RECRUTEURS) ============
app.get('/api/my/applications/received', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const result = await pool.query(
    `SELECT ap.id, ap.status, ap.cover_letter, ap.cv_name, ap.cv_data_url, ap.created_at, ap.announcement_id,
            n.title, u.email AS candidat_email, u.data AS candidat_data
     FROM applications ap
     JOIN announcements n ON n.id = ap.announcement_id
     JOIN users u ON u.id = ap.user_id
     WHERE n.owner_id = $1 OR n.organization_id = $2
     ORDER BY ap.created_at DESC`,
    [request.user.id, request.user.organization_id || 0]
  );
  response.json(result.rows);
});

app.patch('/api/my/applications/received/:id', requireUser, requireOrganizationOwner, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const status = clean(request.body.status);
  if (!['En attente', 'Examinée', 'Acceptée', 'Refusée'].includes(status)) return response.status(400).json({ error: 'Statut invalide.' });
  const result = await pool.query(
    `UPDATE applications ap SET status = $1 FROM announcements n
     WHERE ap.id = $2 AND ap.announcement_id = n.id AND (n.owner_id = $3 OR n.organization_id = $4) RETURNING ap.id, ap.status`,
    [status, request.params.id, request.user.id, request.user.organization_id || 0]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Candidature introuvable.' });
  response.json(result.rows[0]);
});

app.use((_error, _request, response, _next) => response.status(500).json({ error: 'Erreur interne du serveur.' }));

export { app, pool, initializeDatabase };

if (process.env.NODE_ENV !== 'test') {
  initializeDatabase().then(() => app.listen(port, () => console.log(`API listening on port ${port}`))).catch((error) => { console.error(error); process.exit(1); });
}
