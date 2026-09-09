import 'dotenv/config';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({
	connectionString: databaseUrl,
});
const db = (await pool.query('SELECT current_database()')).rows[0].current_database;
const tables = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")).rows;
console.log('Connecté à la base :', db);
console.log('Tables :', tables.map(t => t.table_name).join(', '));
await pool.end();
