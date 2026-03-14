require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log("🌱 Starting seed...");

        // 1. Create Tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS links (
                id SERIAL PRIMARY KEY,
                category TEXT,
                name TEXT,
                url TEXT,
                description TEXT
            );
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE,
                password TEXT,
                saved_stuff TEXT
            );
            CREATE TABLE IF NOT EXISTS "session" (
                "sid" varchar NOT NULL COLLATE "default",
                "sess" json NOT NULL,
                "expire" timestamp(6) NOT NULL
            ) WITH (OIDS=FALSE);
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
        `);

        // 2. Initial Data
        const linksDatabase = {
            "Anime": [
                { name: "Crunchyroll", url: "https://www.crunchyroll.com", desc: "Official anime streaming" },
                { name: "HiAnime", url: "https://hianime.to", desc: "Free anime streaming" }
            ],
            "Books": [
                { name: "Open Library", url: "https://openlibrary.org", desc: "Free digital library" }
            ]
        };

        const res = await db.query('SELECT count(*) FROM links');
        if (parseInt(res.rows[0].count) === 0) {
            for (const [category, links] of Object.entries(linksDatabase)) {
                for (const link of links) {
                    await db.query('INSERT INTO links (category, name, url, description) VALUES ($1, $2, $3, $4)', 
                    [category, link.name, link.url, link.desc]);
                }
            }
            console.log("✅ Database Seeded! 💰");
        } else {
            console.log("🛡️ Data already exists, skipping...");
        }

    } catch (err) {
        console.error("❌ Seed failed:", err);
    } finally {
        await db.end();
    }
}

seed();