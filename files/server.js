const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const db = new Database('data.db');
const app = express();

app.use(cors());
app.use(express.json());

// 📂 This tells the server to show your HTML/CSS files
app.use(express.static(__dirname));

// 🍪 1. High-Security Cookie Setup
app.use(session({
    store: new SqliteStore({ client: db }),
    secret: 'change-this-to-a-random-unhinged-string', // Your "Master Key"
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie lasts 7 days
        httpOnly: true, // Prevents hackers from stealing cookies via JS
        sameSite: 'lax' 
    }
}));

// Create users table with password column
db.prepare('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT UNIQUE, password TEXT, saved_stuff TEXT)').run();

// 🔐 The Bouncer: Only Spark69 gets past here
const isAdmin = (req, res, next) => {
    if (req.session.userId) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
        if (user && user.name === 'Spark69') {
            return next(); // You're good, King.
        }
    }
    res.status(403).json({ error: "L + Ratio + Not Admin 💀" });
};

app.get('/api/links', (req, res) => {
    res.json({ message: "Connected to Local SQL, King! 👑" });
});

// 🔗 Fetch all links from database in category structure
app.get('/api/all-links', (req, res) => {
    // This pulls everything from your 'links' table
    const links = db.prepare('SELECT * FROM links').all();
    
    // Reformat it to match the category structure your UI expects
    const formattedData = links.reduce((acc, link) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push({ name: link.name, url: link.url, desc: link.desc });
        return acc;
    }, {});

    res.json(formattedData);
});

// 📝 2. SIGN UP (The "New User" Entry)
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Scramble it! 🌪️
    
    try {
        const stmt = db.prepare('INSERT INTO users (name, password) VALUES (?, ?)');
        stmt.run(username, hashedPassword);
        res.json({ success: true, message: "Account created!" });
    } catch (e) {
        res.status(400).json({ error: "Username taken!" });
    }
});

// 🔑 3. LOGIN (The "Auto-Sign-In" Logic)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(username);

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id; // Store ID in the session/cookie
        res.json({ success: true, user: { name: user.name } });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// 🕵️ 4. CHECK AUTH (Is the cookie still valid?)
app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.session.userId);
        res.json({ loggedIn: true, user });
    } else {
        res.json({ loggedIn: false });
    }
});

// �️ Apply the bouncer to 'write' routes
app.post('/api/add-link', isAdmin, (req, res) => {
    const { category, name, url, desc } = req.body;

    const stmt = db.prepare('INSERT INTO links (category, name, url, desc) VALUES (?, ?, ?, ?)');
    stmt.run(category, name, url, desc);
    
    res.json({ success: true });
});

app.post('/api/delete-link', isAdmin, (req, res) => {
    const { id } = req.body;
    const stmt = db.prepare('DELETE FROM links WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
});

app.post('/api/update-link', isAdmin, (req, res) => {
    const { id, category, name, url, desc } = req.body;
    const stmt = db.prepare('UPDATE links SET category = ?, name = ?, url = ?, desc = ? WHERE id = ?');
    stmt.run(category, name, url, desc, id);
    res.json({ success: true });
});

app.listen(3000, '0.0.0.0', () => {
    console.log(" your Server is LIVE! On your phone, go to:");
    console.log("http://192.168.31.203:3000/index.html");
});
