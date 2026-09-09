import 'dotenv/config';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const client = new pg.Client({
	connectionString: databaseUrl,
	connectionTimeoutMillis: 10000,
	ssl: databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false },
});
await client.connect();
const db = (await client.query('SELECT current_database()')).rows[0].current_database;
const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")).rows;
console.log('Connecté à la base :', db);
console.log('Tables :', tables.map(t => t.table_name).join(', '));
await client.end();
