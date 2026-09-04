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
app.use(express.json({ limit: '1mb' }));

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
    CREATE TABLE IF NOT EXISTS announcements (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Offre d’emploi', 'Annonce', 'Appel d’offre')),
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
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
  `);
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
function validateAnnouncement(body) {
  const values = [clean(body.title), clean(body.category), clean(body.company), clean(body.location), clean(body.description)];
  return values.every(Boolean) && ['Offre d’emploi', 'Annonce', 'Appel d’offre'].includes(values[1]) ? values : null;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/', (_request, response) => response.json({ name: 'Carrieres RDC API', status: 'ok', health: '/api/health' }));

app.post('/api/auth/login', async (request, response) => {
  const email = clean(request.body.email);
  const password = request.body.password || '';
  const validEmail = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const validPassword = await bcrypt.compare(password, await adminPasswordHashPromise);
  if (!validEmail || !validPassword) return response.status(401).json({ error: 'Identifiants incorrects.' });
  response.json({ token: jwt.sign({ email, role: 'admin' }, jwtSecret, { expiresIn: '8h' }) });
});

app.get('/api/announcements', async (request, response) => {
  const category = clean(request.query.category);
  const values = category ? [category] : [];
  const result = await pool.query(`SELECT id, title, category, company, location, description, created_at FROM announcements ${category ? 'WHERE category = $1' : ''} ORDER BY created_at DESC`, values);
  response.json(result.rows);
});

app.get('/api/announcements/:id', async (request, response) => {
  const result = await pool.query('SELECT id, title, category, company, location, description, created_at FROM announcements WHERE id = $1', [request.params.id]);
  if (!result.rows[0]) return response.status(404).json({ error: 'Annonce introuvable.' });
  response.json(result.rows[0]);
});

app.post('/api/announcements', requireAdmin, async (request, response) => {
  const values = validateAnnouncement(request.body);
  if (!values) return response.status(400).json({ error: 'Tous les champs de l’annonce sont obligatoires.' });
  const result = await pool.query('INSERT INTO announcements (title, category, company, location, description) VALUES ($1, $2, $3, $4, $5) RETURNING *', values);
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

app.use((_error, _request, response, _next) => response.status(500).json({ error: 'Erreur interne du serveur.' }));

initializeDatabase().then(() => app.listen(port, () => console.log(`API listening on port ${port}`))).catch((error) => { console.error(error); process.exit(1); });
