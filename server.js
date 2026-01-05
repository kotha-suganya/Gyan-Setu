const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'templates')));

// Initialize Database
const db = new sqlite3.Database('./gyansetuu.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to Gyan Setuu SQLite database.');
});

// Create Users Table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    contact TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT,
    security_question TEXT,
    security_answer TEXT,
    streak INTEGER DEFAULT 0,
    last_login_date TEXT
)`);


// const path = require('path');
// This tells Express to serve files inside the "assets" folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));




// Navigation Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'signin.html')));
app.get('/signin', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'signin.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'signup.html')));
app.get('/index', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'index.html')));

// Sign Up Route
// app.post('/signup', (req, res) => {
//     const { fullname, contact, username, password, security_question, security_answer } = req.body;
//     const sql = `INSERT INTO users (fullname, contact, username, password, security_question, security_answer, streak) VALUES (?, ?, ?, ?, ?, ?, 0)`;
    
//     db.run(sql, [fullname, contact, username, password, security_question, security_answer], function(err) {
//         if (err) return res.status(400).json({ success: false, message: "User with this contact or username already exists." });
//         res.json({ success: true });
//     });
//     res.status(201).json({ 
//         success: true, 
//         message: "User registered successfully" 
//     });
// });

app.post('/signup', (req, res) => {
    const { fullname, contact, username, password, security_question, security_answer } = req.body;

    // 1. Check if user already exists
    db.get("SELECT * FROM users WHERE username = ? OR contact = ?", [username, contact], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        
        if (row) {
            return res.status(400).json({ success: false, message: "User already exists with this username or contact." });
        }

        // 2. Insert the new user
        const query = `INSERT INTO users (fullname, contact, username, password, security_question, security_answer, streak) VALUES (?, ?, ?, ?, ?, ?, 0)`;
        
        db.run(query, [fullname, contact, username, password, security_question, security_answer], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Error creating user account." });
            }

            // 3. Success response
            return res.status(201).json({ 
                success: true, 
                message: "User registered successfully" 
            });
        });
    });
});
// Sign In Route with Streak Logic
app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(404).json({ success: false, message: "Account does not exist. Please Sign Up." });
        if (user.password !== password) return res.status(401).json({ success: false, message: "Incorrect password." });

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        let newStreak = user.streak || 0;

        if (!user.last_login_date) {
            newStreak = 1;
        } else if (user.last_login_date !== today) {
            const lastLogin = new Date(user.last_login_date);
            const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) newStreak++;
            else if (diffDays > 1) newStreak = 1;
        }

        db.run(`UPDATE users SET last_login_date = ?, streak = ? WHERE id = ?`, [today, newStreak, user.id], () => {
            res.json({ success: true, user: { fullname: user.fullname, username: user.username, streak: newStreak } });
        });
    });
});

// Forgot Password Flow
app.post('/forgot-password', (req, res) => {
    const { mobile } = req.body;
    db.get(`SELECT security_question FROM users WHERE contact = ?`, [mobile], (err, row) => {
        if (err || !row) return res.status(404).json({ success: false, message: "Mobile number not found." });
        res.json({ success: true, question: row.security_question });
    });
});

// app.post('/verify-answer', (req, res) => {
//     const { mobile, answer } = req.body;
//     db.get(`SELECT password FROM users WHERE contact = ? AND security_answer = ?`, [mobile, answer], (err, row) => {
//         if (err || !row) return res.status(401).json({ success: false, message: "Incorrect answer." });
//         res.json({ success: true, password: row.password });
//     });
// });



// Verify answer and return the password
app.post('/verify-answer', (req, res) => {
    // Note: ensure the frontend sends 'security_answer' or 'answer' consistently
    const { mobile, answer } = req.body; 
    
    db.get(`SELECT password FROM users WHERE contact = ? AND security_answer = ?`, 
    [mobile, answer], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (!row) return res.status(401).json({ success: false, message: "Incorrect answer." });
        
        // Return the password to the user
        res.json({ success: true, password: row.password });
    });
});



app.listen(3000, () => console.log('Server running on http://localhost:3000'));


// Add Teacher table creation at the top with other tables
db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT,
    email TEXT UNIQUE,
    subject TEXT,
    password TEXT
)`);

// Create the signup route
app.post('/teachsignup', (req, res) => {
    const { fullname, email, subject, password } = req.body;
    const query = `INSERT INTO teachers (fullname, email, subject, password) VALUES (?, ?, ?, ?)`;
    
    db.run(query, [fullname, email, subject, password], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(400).json({ success: false, message: "Email already exists." });
        }
        res.json({ success: true });
    });
});


// Teacher Sign In Route
// Teacher Sign In Route

app.post('/teacher-signin', (req, res) => {
    const { email, password } = req.body;
    
    // Search the teachers table for the provided email
    db.get(`SELECT * FROM teachers WHERE email = ?`, [email], (err, teacher) => {
        if (err || !teacher) {
            return res.status(404).json({ success: false, message: "Teacher account not found." });
        }
        
        // Verify that the password matches
        if (teacher.password !== password) {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }

        // Return the teacher's profile data to be stored in the frontend
        res.json({ 
            success: true, 
            teacher: { 
                fullname: teacher.fullname, 
                email: teacher.email, 
                subject: teacher.subject 
            } 
        });
    });
});


// Add this in the Navigation Routes section
// Navigation Route for the Teacher Dashboard
app.get('/teachindex', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'teachindex.html'));
});


// Navigation Routes in server.js
app.get('/teachsignin', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachsignin.html')));
app.get('/teachindex', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachindex.html')));
app.get('/teachsignup', (req, res) => res.sendFile(path.join(__dirname, 'templates', 'teachsignup.html')));


app.listen(3000, () => console.log('Server running on http://localhost:3001'));






// // #################              teacher dashboard            ##########################


// // Add this under the existing users table creation in server.js
// // Ensure this table creation runs at the top with your student table
// db.run(`CREATE TABLE IF NOT EXISTS teachers (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     fullname TEXT,
//     email TEXT UNIQUE,
//     subject TEXT,
//     password TEXT
// )`);

// // Endpoint to handle Teacher Signup
// app.post('/teachsignup', (req, res) => {
//     const { fullname, email, subject, password } = req.body;

//     // Check for existing email
//     db.get("SELECT * FROM teachers WHERE email = ?", [email], (err, row) => {
//         if (err) return res.status(500).json({ success: false, message: "Database error" });
//         if (row) return res.status(400).json({ success: false, message: "Email already registered." });

//         const query = `INSERT INTO teachers (fullname, email, subject, password) VALUES (?, ?, ?, ?)`;
//         db.run(query, [fullname, email, subject, password], function(err) {
//             if (err) return res.status(500).json({ success: false, message: "Error saving teacher." });
//             res.status(201).json({ success: true });
//         });
//     });
// });