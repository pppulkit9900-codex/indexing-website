const Database = require('better-sqlite3');
const db = new Database('data.db');
//https://github.com/pppulkit9900-codex/indexing-website.git
// 1. Create the links table (for your content)
db.prepare(`
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name TEXT,
        url TEXT,
        desc TEXT
    )
`).run();

// 2. CREATE THE USERS TABLE (This is what you were missing! 🔑)
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        password TEXT,
        saved_stuff TEXT
    )
`).run();

// 3. The data from your index.html
const linksDatabase = {
    "Anime": [
        { name: "Crunchyroll", url: "https://www.crunchyroll.com", desc: "Official anime streaming" },
        { name: "Netflix", url: "https://www.netflix.com", desc: "Anime and more" },
        { name: "HiAnime", url: "https://hianime.to", desc: "Free anime streaming" }
    ],
    "Books": [
        { name: "Open Library", url: "https://openlibrary.org", desc: "Free digital library" },
        { name: "Z-Library", url: "https://z-lib.io", desc: "Digital library" }
    ]
};

// 4. Insert it into the "red" file (Check if empty first to avoid duplicates)
const rowCount = db.prepare('SELECT count(*) as count FROM links').get();

if (rowCount.count === 0) {
    const insert = db.prepare('INSERT INTO links (category, name, url, desc) VALUES (?, ?, ?, ?)');
    for (const [category, links] of Object.entries(linksDatabase)) {
        links.forEach(link => {
            insert.run(category, link.name, link.url, link.desc);
        });
    }
    console.log("Database Seeded! 💰");
} else {
    console.log("Database already has data, skipping seed to avoid duplicates! 🛡️");
}