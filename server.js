const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { exec } = require('child_process'); 
const passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;
let db;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// OAuth Stuff
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Use environment variables for client ID and secret
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`,
    passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));


passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Set up Handlebars view engine with custom helpers
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
            ifEqual: function (arg1, arg2, options) {
                return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
            },
            calculateLikes: function (likes){
                let currentlikes = [];
                currentlikes = JSON.parse(likes);
                return currentlikes.length
            },
            userLikedPost: function (likes, username, options) {
                let currentLikes = JSON.parse(likes);
                if (currentLikes.includes(username)) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
            makeStars: function(rating) {
                const maxStars = 5;
                let stars = [];
                for (let i = 0; i < maxStars; i++) {
                    stars.push(i < rating ? 'checked' : '');
                }
                return stars;
            }
        },
    })
);

app.set('view engine', 'handlebars');

app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'IndieArcade';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    res.locals.hashedGoogleId = req.session.hashedGoogleId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.get('/auth/google', (req, res, next) => {
    passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, next);
});

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=Failed to authenticate with Google'}),
    async (req, res) => {
        // Extracts the user's Google ID.
        const googleId = req.user.id;
        const hashedGoogleId = hash(googleId);
        req.session.hashedGoogleId = hashedGoogleId;

        // Check if user already exists 
        try {
            // Hashes the Google ID and checks if the user exists in the database.
            let localUser = await findUserByHashedGoogleId(hashedGoogleId);
            if (localUser) {
                // If the user exists, sets session variables and redirects to home.
                req.session.userId = localUser.id;
                req.session.loggedIn = true;
                res.redirect('/');
            } else {
                // If the user does not exist, redirects to the /registerUsername route.
                res.redirect ('/registerUsername');
            }
        }
        catch(err) {
            res. redirect ('/error');
        }
    }
);

app.get('/registerUsername', (req, res) => {
    res.render('registerUsername', { error: req.query.error });
});

app.post('/registerUsername', async (req, res) => {
    const username = req.body.username;
    const hashedGoogleId = req.session.hashedGoogleId;

    try {
        // Checks if the username already exists in the database.
        let existingUser = await findUserByUsername(username);
        if (existingUser) {
            // If the username exists, re-renders the form with an error message.
            return res.render('registerUsername', { error: 'Username already taken' });
        }
        else {
            // If the username does not exist, creates a new user entry and sets session variables.
            await addUser(username, hashedGoogleId);

            let newUser = await findUserByUsername(username);
            req.session.userId = newUser.id;
            req.session.loggedIn = true;

            // Redirects to the home page on successful registration.
            res.redirect('/');
        }

        // Add the new user to the database
       
    } catch (err) {
        res.redirect('/error');
    }
});

app.get('/googleLogout', (req, res) => {
    res.render('googleLogout');
});

// Database setup

async function connectToDatabase() {
    db = await sqlite.open({ filename: 'indie_arcade.db', driver: sqlite3.Database });
    return db;
}

app.get('/emojis', async (req,res)=>{
    try {
        const response = await fetch(`https://emoji-api.com/emojis?access_key=${process.env.EMOJI_API_KEY}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).send('Error fetching emojis');
    }
});

// Home route: render home view with posts and user
// We pass the posts and user variables into the home template
//
app.get('/', async (req, res) => {
    const order = req.query.order || 'newest';
    const gameFilter = req.query.gameFilter || '';
    const posts = await getPosts(order, gameFilter);

    const user = await getCurrentUser(req) || {};
    const sortLabel = req.query.sortLabel || 'Newest';

    res.render('home', { posts, user, order, sortLabel, gameFilter });
});
    

// Register GET route is used for error response from registration
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes
app.post('/posts', async (req, res) => {
    // Add a new post and redirect to home
    console.log(req.body.rating)
    addPost(req.body.title, req.body.content, req.body.rating, req.body.tags, await getCurrentUser(req));
    res.redirect('/');
});

app.post('/like/:id', async (req, res) => {
    // Update post likes
    let worked = await updatePostLikes(req,res);
    
    if(worked) {
        res.status(200).send({ message: "Like updated successfully" });
    }
    else { 
        res.status(500).send({ message: "Failed to update like" });
    }
});

app.get('/profile', isAuthenticated, (req, res) => {
    // Render profile page
   renderProfile(req,res);
});

app.get('/avatar/:username', async (req, res) => {
    // Serve the avatar image for the user
    await handleAvatar(req,res);
});

app.post('/register', (req, res) => {
    // Register a new user
    registerUser(req,res);
});

app.post('/login', (req, res) => {
    // Login a user
    loginUser(req,res);
});

app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            // Handle the error appropriately
            return res.redirect('/error');
        }
        // After destroying the session, redirect to the Google logout page
        res.redirect('/googleLogout');
    });
});

app.post('/delete/:id', isAuthenticated, async (req, res) => {
    // TODO: Delete a post if the current user is the owner
        let user = await getCurrentUser(req);
        if(user){
        await deletePost(req, res);
        res.status(200).send({ message: "Deleted post successfully" });
    }
    else{
        res.status(500).send({ message: "Failed to delete post" });
    }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
async function init(){
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
    
init();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to hash user's Google ID
function hash(key){
    return Math.log((parseInt(key) % 240) ** 2) * (10 ** 16); 
}

// Function to format post date for posts
function formatPostDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    // Destroy session and redirect appropriately
    req.session.loggedIn = false;
    req.session.userId = '';
    res.redirect('/');
}

// Function to get the current user from session
async function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    return await findUserById(req.session.userId);
}

// Function to generate an image avatar with a letter
function generateAvatar(letter, width = 100, height = 100) {
    // 1. Choose a color scheme based on the letter
    let char  = 124 - (letter.toLowerCase()).charCodeAt(0);
    const hex = parseInt((char/28) * 16777215).toString(16);
    let color = `#${hex}`;
    
    // 2. Create a canvas with the specified width and height
    const avatar = createCanvas(width, height);
    const ctx = avatar.getContext('2d');
    
    // 3. Draw the background color
    ctx.fillStyle = color;
    ctx.fillRect(0,0,100,100);

    // 4. Draw the letter in the center
    ctx.fillStyle = 'white';
    ctx.font = "48px serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 50, 50, 100);

    // 5. Return the avatar as a PNG buffer
    return avatar.toBuffer('image/png');
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Database queries
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

async function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    try {
        let find = await db.get('SELECT * FROM Users WHERE username = ?', [username]);
        return find;
    } catch (error) {
        return undefined;
    }
}

async function findUserById(userId) {
    // Return user object if found, otherwise return undefined
    try {
        let find = await db.get('SELECT * FROM Users WHERE id = ?', [userId]);
        return find;
    } catch (error) {
        return undefined;
    }
}

async function findUserByHashedGoogleId(hashedGoogleId) {
    // Return user object if found, otherwise return undefined
    try {
        let find = await db.get('SELECT * FROM Users WHERE hashedGoogleId = ?', [hashedGoogleId]);
        return find;
    } catch (error) {
        return undefined;
    }
}

async function addUser(username, hashedGoogleId) {
    // Create a new user object and add to users array
    let user = {username: username, hashedGoogleId: hashedGoogleId, avatar_url: undefined, memberSince: formatPostDate(new Date()) };
    db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
    );
}

async function renderProfile(req, res) {
    // Fetch user posts and render the profile page
    let user = await getCurrentUser(req);
    let username = user.username;
    let userposts = await db.all('SELECT * FROM posts WHERE username = ?', [username]);
    user.posts = userposts;
    res.render('profile', {user});
}

async function updatePostLikes(req, res) {
    // Increment post likes if conditions are met
    let user = await getCurrentUser(req);
    if (user) {
        let post = await db.get('SELECT likes FROM posts WHERE id = ?', [req.params.id]);
        let likes = [];
        likes = JSON.parse(post.likes);
        const userIndex = likes.indexOf(user.username);
        if (userIndex === -1) {
            likes.push(user.username);
        } else {
            likes.splice(userIndex, 1);
        }
        await db.run('UPDATE posts SET likes = ? WHERE id = ?', [JSON.stringify(likes),req.params.id]);
        return true;
    }
    else {
        return false;
    }
}

async function handleAvatar(req, res) {
    const username = req.params.username;

    const user = await findUserByUsername(username);
    if (!user) {
        return res.status(404).send('User not found');
    }

    const avatarDir = path.join(__dirname, 'public', 'avatars');
    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }

    const avatarPath = path.join(avatarDir, `${username}.png`);

    if (fs.existsSync(avatarPath)) {
        return res.sendFile(avatarPath);
    } else {
        const avatarBuffer = generateAvatar(username.charAt(0).toUpperCase());
        fs.writeFileSync(avatarPath, avatarBuffer);
        await db.run('UPDATE users SET avatar_url = ? WHERE username = ?', [`/avatars/${username}.png`, username]);
        return res.sendFile(avatarPath);
    }
}

async function getPosts(order = 'newest', filter = '') {
    let query = 'SELECT * FROM posts';
    let params = [];

    if (filter) {
        query += ' WHERE tags LIKE ?';
        params.push(`%${filter}%`);
    }

    if (order === 'newest') {
        query += ' ORDER BY timestamp DESC';
    } else if (order === 'oldest') {
        query += ' ORDER BY timestamp ASC';
    } else if (order === 'mostLikes') {
        query += ' ORDER BY json_array_length(likes) DESC';
    }

    console.log(query)
    return await db.all(query, params);
}

// Function to add a new post
async function addPost(title, content, rating, tags, user) {
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes, tags, rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, content, user.username, formatPostDate(new Date()), JSON.stringify([]), tags, rating]
    );
}

async function deletePost(req,res, id){
    let user = await getCurrentUser(req);
    let username = user.username;
    let post = await db.get('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (post) {
        if (post.username === username) {
            await db.run('DELETE FROM posts WHERE id = ?', [req.params.id]);
        }
    }
}
