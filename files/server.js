require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

// 🌊 Connect to Neon Postgres
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🍪 Session Setup for Postgres
app.use(session({
    store: new pgSession({ pool: db, tableName: 'session' }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' // Better for Render
    }
}));

// 🔐 The Bouncer (Upgraded to Async)
const isAdmin = async (req, res, next) => {
    if (req.session.userId) {
        const result = await db.query('SELECT name FROM users WHERE id = $1', [req.session.userId]);
        const user = result.rows[0];
        if (user && user.name === process.env.ADMIN_USERNAME) {
            return next();
        }
    }
    res.status(403).json({ error: "L + Ratio + Not Admin 💀" });
};

// 🔗 Fetch all links
app.get('/api/all-links', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM links');
        const formattedData = result.rows.reduce((acc, link) => {
            if (!acc[link.category]) acc[link.category] = [];
            acc[link.category].push({ id: link.id, name: link.name, url: link.url, desc: link.description });
            return acc;
        }, {});
        res.json(formattedData);
    } catch (err) {
        res.status(500).json({ error: "Database ghosted us 👻" });
    }
});

// 📝 SIGN UP
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        await db.query('INSERT INTO users (name, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: "Username taken or DB error" });
    }
});

// 🔑 LOGIN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE name = $1', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user.id;
        res.json({ success: true, user: { name: user.name } });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// 🕵️ CHECK AUTH
app.get('/api/me', async (req, res) => {
    if (req.session.userId) {
        const result = await db.query('SELECT name FROM users WHERE id = $1', [req.session.userId]);
        res.json({ loggedIn: true, user: result.rows[0] });
    } else {
        res.json({ loggedIn: false });
    }
});

// 🏗️ GOD MODE ROUTES
app.post('/api/add-link', isAdmin, async (req, res) => {
    const { category, name, url, desc } = req.body;
    await db.query('INSERT INTO links (category, name, url, description) VALUES ($1, $2, $3, $4)', [category, name, url, desc]);
    res.json({ success: true });
});

app.post('/api/delete-link', isAdmin, async (req, res) => {
    await db.query('DELETE FROM links WHERE id = $1', [req.body.id]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server vibing on port ${PORT} 🚀`));