import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 10000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const adminPasswordHashPromise = bcrypt.hash(process.env.ADMIN_PASSWORD || '', 12);

if (!databaseUrl || !jwtSecret || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Missing DATABASE_URL, JWT_SECRET, ADMIN_EMAIL or ADMIN_PASSWORD.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: '30mb' }));

const defaultAnnouncements = [
  ['Responsable de projet culturel', 'Offre d’emploi', 'Kivu Culture', 'Kinshasa · Hybride', 'Coordonner des projets qui rapprochent les publics de la culture en RDC.'],
  ['Développeur·se web junior', 'Offre d’emploi', 'Congo Digital', 'Lubumbashi · Flexible', 'Transformer des idées utiles en outils simples et accessibles.'],
  ['Photographe pour série documentaire', 'Annonce', 'Regards du Congo', 'Goma · Sur place', 'Raconter en images les initiatives et les talents de la communauté.'],
  ['Identité visuelle pour commerce local', 'Annonce', 'Maison Tshopo', 'Kisangani · À distance', 'Donner une identité forte à une nouvelle activité congolaise.'],
  ['Fourniture de matériel informatique', 'Appel d’offre', 'Impact RDC', 'Kinshasa · Date limite : 30 sept.', 'Consultation pour la fourniture de matériel informatique aux équipes.'],
  ['Construction d’un centre communautaire', 'Appel d’offre', 'Initiative Kivu', 'Bukavu · Date limite : 15 oct.', 'Appel à candidatures pour les travaux d’un centre communautaire.']
];

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
  `);
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS owner_id BIGINT");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_role TEXT NOT NULL DEFAULT 'member'");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active'");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_limits JSONB NOT NULL DEFAULT '{\"activeJobs\": 3, \"members\": 2}'::jsonb");
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
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM announcements');
  if (result.rows[0].count === 0) {
    for (const item of defaultAnnouncements) {
      await pool.query('INSERT INTO announcements (title, category, company, location, description) VALUES ($1, $2, $3, $4, $5)', item);
    }
  }
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
      `SELECT u.id, u.email, u.role, u.organization_role, u.email_verified_at, u.created_at,
              o.name AS organization_name
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
       ORDER BY u.created_at DESC`
    ),
    pool.query(
      `SELECT o.id, o.name, o.slug, o.plan, o.plan_status, o.created_at,
              COUNT(u.id)::int AS member_count
       FROM organizations o LEFT JOIN users u ON u.organization_id = o.id
       GROUP BY o.id ORDER BY o.created_at DESC`
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
async function sendTransactionalEmail({ to, subject, text }) {
  const gmailAddress = process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER;
  const gmailAppPassword = process.env.EMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD;
  if (gmailAddress && gmailAppPassword) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user: gmailAddress, pass: gmailAppPassword },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'Carrières RDC'} <${gmailAddress}>`,
      to,
      subject,
      text,
    });
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') console.info(`[email preview] ${to}\n${text}`);
    return;
  }
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!result.ok) throw new Error('Echec de l’envoi de l’e-mail.');
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

function validateAnnouncementWithMedia(body) {
  const values = [clean(body.title), clean(body.category), clean(body.company), clean(body.location), clean(body.description)];
  const media = cleanMedia(body.media || []);
  const validMetadata = validateAnnouncement({ ...body, description: values[4] || 'document attached' });
  if (!validMetadata || !media || (!values[4] && media.length === 0)) return null;
  return [...values, media];
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

  // Comptes utilisateurs (candidats / recruteurs)
  try {
    const result = await pool.query('SELECT id, role, email, password_hash, organization_id, organization_role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      return response.json({
        token: jwt.sign({ id: user.id, email: user.email, role: user.role, organization_id: user.organization_id, organization_role: user.organization_role }, jwtSecret, { expiresIn: '7d' }),
        role: user.role,
        email: user.email,
      });
    }
  } catch {
    // La table users n'existe pas encore : on continue vers l'admin.
  }

  return response.status(401).json({ error: 'Identifiants incorrects.' });
});

async function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentification requise.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== 'candidat' && payload.role !== 'recruteur') return response.status(403).json({ error: 'Compte utilisateur requis.' });
    const result = await pool.query(
      'SELECT id, email, role, organization_id FROM users WHERE id = $1',
      [payload.id]
    );
    const user = result.rows[0];
    if (!user || user.role !== payload.role) return response.status(401).json({ error: 'Compte utilisateur invalide.' });
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
    const resetUrl = `${process.env.FRONTEND_URL || `http://localhost:${port}`}/connexion?reset_token=${resetToken}`;
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
  const invitationUrl = `${process.env.FRONTEND_URL || `http://localhost:${port}`}/invitation?token=${token}`;
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

app.get('/api/announcements', async (request, response) => {
  const category = clean(request.query.category);
  const values = category ? [category] : [];
  const result = await pool.query(`SELECT id, title, category, company, location, description, media, created_at FROM announcements ${category ? 'WHERE category = $1' : ''} ORDER BY created_at DESC`, values);
  response.json(result.rows);
});

app.get('/api/announcements/:id', async (request, response) => {
  const result = await pool.query('SELECT id, title, category, company, location, description, media, created_at FROM announcements WHERE id = $1', [request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
  response.json(result.rows[0]);
});

app.post('/api/announcements', requireAdmin, async (request, response) => {
  const values = validateAnnouncementWithMedia(request.body);
  if (!values) return response.status(400).json({ error: 'Tous les champs de l’annonce sont obligatoires.' });
  const result = await pool.query('INSERT INTO announcements (title, category, company, location, description, media) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', values);
  response.status(201).json(result.rows[0]);
});

app.delete('/api/announcements/:id', requireAdmin, async (request, response) => {
  await pool.query('DELETE FROM announcements WHERE id = $1', [request.params.id]);
  response.status(204).end();
});

app.post('/api/messages', async (request, response) => {
  const values = [clean(request.body.name), clean(request.body.email), clean(request.body.subject), clean(request.body.message)];
  if (!values.every(Boolean) || !values[1].includes('@')) return response.status(400).json({ error: 'Veuillez remplir correctement tous les champs.' });
  const result = await pool.query('INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id, created_at', values);
  response.status(201).json(result.rows[0]);
});

app.get('/api/messages', requireAdmin, async (_request, response) => {
  const result = await pool.query('SELECT id, name, email, subject, message, created_at FROM messages ORDER BY created_at DESC');
  response.json(result.rows);
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
  if (!title || !location || !description) return response.status(400).json({ error: 'Tous les champs de l’offre sont obligatoires.' });
  const me = await pool.query('SELECT data FROM users WHERE id = $1', [request.user.id]);
  const company = clean(me.rows[0]?.data?.companyName) || 'Entreprise vérifiée';
  const result = await pool.query(
    "INSERT INTO announcements (title, category, company, location, description, owner_id, organization_id) VALUES ($1, 'Offre d’emploi', $2, $3, $4, $5, $6) RETURNING *",
    [title, company, location, description, request.user.id, request.user.organization_id || null]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/jobs', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const result = await pool.query(
    'SELECT id, title, category, company, location, description, created_at FROM announcements WHERE owner_id = $1 OR organization_id = $2 ORDER BY created_at DESC',
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
  if (!announcementId) return response.status(400).json({ error: 'Offre invalide.' });
  const exists = await pool.query('SELECT id FROM announcements WHERE id = $1', [announcementId]);
  if (!exists.rows[0]) return response.status(404).json({ error: 'Offre introuvable.' });
  const duplicate = await pool.query('SELECT id FROM applications WHERE user_id = $1 AND announcement_id = $2', [request.user.id, announcementId]);
  if (duplicate.rows[0]) return response.status(409).json({ error: 'Vous avez déjà postulé à cette offre.' });
  const result = await pool.query(
    'INSERT INTO applications (user_id, announcement_id, cover_letter) VALUES ($1, $2, $3) RETURNING id, status, created_at',
    [request.user.id, announcementId, coverLetter]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/applications', requireUser, async (request, response) => {
  if (request.user.role !== 'candidat') return response.status(403).json({ error: 'Réservé aux comptes candidats.' });
  const result = await pool.query(
    `SELECT a.id, a.status, a.cover_letter, a.created_at, n.id AS announcement_id, n.title, n.company, n.location
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

// ============ SUIVI DES CANDIDATURES REÇUES (RECRUTEURS) ============
app.get('/api/my/applications/received', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const result = await pool.query(
    `SELECT ap.id, ap.status, ap.cover_letter, ap.created_at, ap.announcement_id,
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
