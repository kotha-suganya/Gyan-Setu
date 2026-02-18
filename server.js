const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'templates')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Initialize Database
const db = new sqlite3.Database('./gyansetuu.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to Gyan Setu SQLite database.');
});

// Create Tables
db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        contact TEXT UNIQUE,
        username TEXT UNIQUE,
        password TEXT,
        security_question TEXT,
        security_answer TEXT,
        class TEXT,
        section TEXT,
        streak INTEGER DEFAULT 0,
        highest_streak INTEGER DEFAULT 0,
        last_login_date TEXT
    )`);

    // 2. Teachers Table
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        email TEXT UNIQUE,
        subject TEXT,
        password TEXT
    )`);

    // 3. Announcements Table
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        target_type TEXT, 
        target_value TEXT, 
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- STUDENT ROUTES ---

app.post('/signup', (req, res) => {
    const { fullname, contact, username, password, security_question, security_answer, class: studentClass, section } = req.body;
    
    db.get("SELECT * FROM users WHERE username = ? OR contact = ?", [username, contact], (err, row) => {
        if (row) {
            return res.status(400).json({ success: false, message: "User already exists with this username or contact number." });
        }

        const query = `INSERT INTO users (fullname, contact, username, password, security_question, security_answer, class, section, streak, highest_streak) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`;
        
        db.run(query, [fullname, contact, username, password, security_question, security_answer, studentClass, section], function(err) {
            if (err) {
                console.error("Signup Error:", err.message);
                return res.status(500).json({ success: false, message: "Database error during signup." });
            }
            res.status(201).json({ success: true });
        });
    });
});

app.post('/signin', (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM users WHERE username = ?`,
        [username],
        (err, user) => {
            if (err || !user) {
                return res.status(404).json({ success: false, message: "Account not found" });
            }

            if (user.password !== password) {
                return res.status(401).json({ success: false, message: "Incorrect password" });
            }

            const todayStr = new Date().toISOString().split('T')[0];
            let newStreak = 1;

            if (user.last_login_date) {
                const last = new Date(user.last_login_date);
                const today = new Date(todayStr);
                const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) newStreak = user.streak;
                else if (diffDays === 1) newStreak = user.streak + 1;
            }

            const highest = Math.max(newStreak, user.highest_streak || 0);

            db.run(
                `UPDATE users SET last_login_date=?, streak=?, highest_streak=? WHERE id=?`,
                [todayStr, newStreak, highest, user.id],
                () => {
                    res.json({
                        success: true,
                        user: {
                            ...user,
                            streak: newStreak,
                            highest_streak: highest,
                            last_login_date: todayStr
                        }
                    });
                }
            );
        }
    );
});

app.post('/forgot-password', (req, res) => {
    const { mobile } = req.body;
    db.get(`SELECT security_question FROM users WHERE contact = ?`, [mobile], (err, row) => {
        if (err || !row) return res.status(404).json({ success: false, message: "Mobile number not found." });
        res.json({ success: true, question: row.security_question });
    });
});

app.post('/verify-answer', (req, res) => {
    const { mobile, answer } = req.body; 
    db.get(`SELECT password FROM users WHERE contact = ? AND security_answer = ?`, 
    [mobile, answer], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (!row) return res.status(401).json({ success: false, message: "Incorrect answer." });
        res.json({ success: true, password: row.password });
    });
});

// --- TEACHER ROUTES ---

app.post('/teachsignup', (req, res) => {
    const { fullname, email, subject, password } = req.body;
    const query = `INSERT INTO teachers (fullname, email, subject, password) VALUES (?, ?, ?, ?)`;
    
    db.run(query, [fullname, email, subject, password], function(err) {
        if (err) {
            return res.status(400).json({ success: false, message: "Email already exists." });
        }
        res.json({ success: true });
    });
});

app.post('/teacher-signin', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM teachers WHERE email = ?`, [email], (err, teacher) => {
        if (err || !teacher) return res.status(404).json({ success: false, message: "Teacher account not found." });
        if (teacher.password !== password) return res.status(401).json({ success: false, message: "Incorrect password." });
        res.json({ success: true, teacher: { fullname: teacher.fullname, email: teacher.email, subject: teacher.subject } });
    });
});

// --- NAVIGATION & SEARCH ---

// server.js - Updated Search Students Route
// server.js - Ensure 'highest_streak' is in the query
// server.js snippet
// server.js - Updated Search Students Route
app.get('/search-students', (req, res) => {
    const { username, class: sClass, section } = req.query;
    
    // Ensure 'highest_streak' is included in this SELECT statement
    let query = `SELECT fullname, username, streak, highest_streak, class, section FROM users WHERE 1=1`;
    let params = [];

    if (username) {
        query += ` AND (username LIKE ? OR fullname LIKE ?)`;
        params.push(`%${username}%`, `%${username}%`);
    }
    if (sClass) {
        query += ` AND class = ?`;
        params.push(sClass);
    }
    if (section) {
        query += ` AND section = ?`;
        params.push(section.toUpperCase());
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, students: rows });
    });
});
app.get('/teachsignin', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachsignin.html')));
app.get('/teachindex', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachindex.html')));
app.get('/teachsignup', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachsignup.html')));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});