import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('candidat', 'recruteur')),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  `);
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb");
  await pool.query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS owner_id BIGINT");
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
    request.admin = jwt.verify(token, jwtSecret);
    next();
  } catch {
    response.status(401).json({ error: 'Session administrateur invalide.' });
  }
}

function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
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

  // 1. Comptes utilisateurs (candidats / recruteurs)
  try {
    const result = await pool.query('SELECT id, role, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      return response.json({
        token: jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' }),
        role: user.role,
        email: user.email,
      });
    }
  } catch {
    // La table users n'existe pas encore : on continue vers l'admin.
  }

  // 2. Administrateur
  const validEmail = email === process.env.ADMIN_EMAIL.toLowerCase();
  const validPassword = await bcrypt.compare(password, await adminPasswordHashPromise);
  if (!validEmail || !validPassword) return response.status(401).json({ error: 'Identifiants incorrects.' });
  response.json({ token: jwt.sign({ email, role: 'admin' }, jwtSecret, { expiresIn: '8h' }), role: 'admin', email });
});

function requireUser(request, response, next) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return response.status(401).json({ error: 'Authentification requise.' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== 'candidat' && payload.role !== 'recruteur') return response.status(403).json({ error: 'Compte utilisateur requis.' });
    request.user = payload;
    next();
  } catch {
    response.status(401).json({ error: 'Session expirée ou invalide.' });
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
  const result = await pool.query(
    'INSERT INTO users (role, email, password_hash, data) VALUES ($1, $2, $3, $4) RETURNING id, role, email, created_at',
    [role, email, hash, JSON.stringify(data)]
  );
  const user = result.rows[0];
  response.status(201).json({
    user,
    token: jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' }),
  });
});

app.get('/api/me', requireUser, async (request, response) => {
  const result = await pool.query('SELECT id, role, email, data, created_at FROM users WHERE id = $1', [request.user.id]);
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
    "INSERT INTO announcements (title, category, company, location, description, owner_id) VALUES ($1, 'Offre d’emploi', $2, $3, $4, $5) RETURNING *",
    [title, company, location, description, request.user.id]
  );
  response.status(201).json(result.rows[0]);
});

app.get('/api/my/jobs', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const result = await pool.query('SELECT id, title, category, company, location, description, created_at FROM announcements WHERE owner_id = $1 ORDER BY created_at DESC', [request.user.id]);
  response.json(result.rows);
});

app.delete('/api/my/jobs/:id', requireUser, async (request, response) => {
  const result = await pool.query('DELETE FROM announcements WHERE id = $1 AND owner_id = $2 RETURNING id', [request.params.id, request.user.id]);
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
     WHERE n.owner_id = $1
     ORDER BY ap.created_at DESC`,
    [request.user.id]
  );
  response.json(result.rows);
});

app.patch('/api/my/applications/received/:id', requireUser, async (request, response) => {
  if (request.user.role !== 'recruteur') return response.status(403).json({ error: 'Réservé aux comptes recruteurs.' });
  const status = clean(request.body.status);
  if (!['En attente', 'Examinée', 'Acceptée', 'Refusée'].includes(status)) return response.status(400).json({ error: 'Statut invalide.' });
  const result = await pool.query(
    `UPDATE applications ap SET status = $1 FROM announcements n
     WHERE ap.id = $2 AND ap.announcement_id = n.id AND n.owner_id = $3 RETURNING ap.id, ap.status`,
    [status, request.params.id, request.user.id]
  );
  if (!result.rows[0]) return response.status(404).json({ error: 'Candidature introuvable.' });
  response.json(result.rows[0]);
});

app.use((_error, _request, response, _next) => response.status(500).json({ error: 'Erreur interne du serveur.' }));

initializeDatabase().then(() => app.listen(port, () => console.log(`API listening on port ${port}`))).catch((error) => { console.error(error); process.exit(1); });
