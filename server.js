const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { exec } = require('child_process'); 
require('dotenv').config();


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;
let db;
//let postcount = posts.length;
//let usercount = users.length; 

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/


//database setup

async function connectToDatabase() {
    db = await sqlite.open({ filename: 'indie_arcade.db', driver: sqlite3.Database });
    console.log('Connected to the SQLite database.');
    return db;
}

// Set up Handlebars view engine with custom helpers
//
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

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'IndieArcade';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
// We pass the posts and user variables into the home
// template
//
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

app.post('/posts', (req, res) => {
    // TODO: Add a new post and redirect to home
    addPost(req.body.title, req.body.content, getCurrentUser(req));
    res.redirect('/');
});
app.post('/like/:id', (req, res) => {
    // TODO: Update post likes
    console.log("liking post");
    let worked = updatePostLikes(req,res);
    console.log(posts);
if(worked){
    res.status(200).send({ message: "Like updated successfully" });
}
else{
    res.status(500).send({ message: "Failed to update like" });
}
   
});
app.get('/profile', isAuthenticated, (req, res) => {
    // TODO: Render profile page
    renderProfile(req,res);
});

app.get('/avatar/:username', (req, res) => {
    // TODO: Serve the avatar image for the user
    handleAvatar(req,res);
});
app.post('/register', (req, res) => {
    // TODO: Register a new user
    registerUser(req,res);
    
});
app.post('/login', (req, res) => {
    // TODO: Login a user
    loginUser(req,res);
});
app.get('/logout', (req, res) => {
    // TODO: Logout the user
    logoutUser(req,res);
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    // TODO: Delete a post if the current user is the owner
        console.log("deleting post");
        let user = getCurrentUser(req);
        if(user){
        deletePost(req, res);
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
let postcount = posts.length;
let usercount = users.length; 
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
}

init();

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Example data for posts and users
let posts = [
    { id: 1, title: 'Discovering Hidden Gems: "Celeste"',
        content: 'I recently finished "Celeste" and the tight platforming mechanics, along with the touching story, really impressed me. Madeline\'s journey is beautifully crafted.',
        username: 'PixelPioneer', timestamp: '2024-01-01 10:00', likes: [] },
    { id: 2, title: 'The Charm of "Stardew Valley"',
        content: 'I\'m completely hooked on "Stardew Valley." The game\'s relaxing vibe and the freedom to play at your own pace make it a cozy delight.',
        username: 'RetroRaven', timestamp: '2024-01-02 12:00', likes: [] },
    { id: 3, title: 'Epic Adventures in "The Legend of Zelda: Breath of the Wild"',
        content: 'Exploring the vast world of Hyrule in "Breath of the Wild" has been an incredible experience. The sense of freedom and discovery is unmatched.',
        username: 'GamerGuru', timestamp: '2024-01-03 14:00', likes: [] },
    { id: 4, title: 'The Intensity of "Dark Souls III"',
        content: '"Dark Souls III" offers a challenging yet rewarding experience. The intricate level design and tough enemies make every victory feel well-earned.',
        username: 'SoulSeeker', timestamp: '2024-01-04 16:00', likes: [] },
    { id: 5, title: 'Building Empires in "Civilization VI"',
        content: 'I love the strategic depth of "Civilization VI." Building my own empire and making crucial decisions keeps me engaged for hours on end.',
        username: 'StrategySavant', timestamp: '2024-01-05 18:00', likes: [] },
    { id: 6, title: 'Unwinding with "Animal Crossing: New Horizons"',
        content: '"Animal Crossing: New Horizons" is the perfect game to relax with. Designing my island and interacting with villagers brings a sense of calm and joy.',
        username: 'IslandInnovator', timestamp: '2024-01-06 20:00', likes: [] },
    { id: 7, title: 'Racing Thrills in "Mario Kart 8 Deluxe"',
        content: 'Nothing beats the excitement of racing friends in "Mario Kart 8 Deluxe." The tracks are beautifully designed and the gameplay is always fun.',
        username: 'SpeedDemon', timestamp: '2024-01-07 22:00', likes: [] },
    { id: 8, title: 'Puzzle Solving in "The Witness"',
        content: '"The Witness" offers a unique puzzle-solving experience that challenges my mind. The beautiful island setting adds to the overall charm.',
        username: 'PuzzleMaster', timestamp: '2024-01-08 09:00', likes: [] },
    { id: 9, title: 'Action-Packed Adventure in "Hades"',
        content: '"Hades" combines fast-paced action with a compelling story. The rogue-like elements keep each run fresh and exciting.',
        username: 'UnderworldExplorer', timestamp: '2024-01-09 11:00', likes: [] },
    { id: 10, title: 'Exploring Space in "No Man\'s Sky"',
        content: '"No Man\'s Sky" offers a vast universe to explore. The sheer scale of the game and the ability to discover new planets and creatures is truly impressive.',
        username: 'SpaceVoyager', timestamp: '2024-01-10 13:00', likes: [] }
];

let users = [
    { id: 1, username: 'PixelPioneer', avatar_url: '/avatars/PixelPioneer.png', memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'RetroRaven', avatar_url: '/avatars/RetroRaven.png', memberSince: '2024-01-02 09:00' },
    { id: 3, username: 'GamerGuru', avatar_url: '/avatars/GamerGuru.png', memberSince: '2024-01-03 10:00' },
    { id: 4, username: 'SoulSeeker', avatar_url: '/avatars/SoulSeeker.png', memberSince: '2024-01-04 11:00' },
    { id: 5, username: 'StrategySavant', avatar_url: '/avatars/StrategySavant.png', memberSince: '2024-01-05 12:00' },
    { id: 6, username: 'IslandInnovator', avatar_url: '/avatars/IslandInnovator.png', memberSince: '2024-01-06 13:00' },
    { id: 7, username: 'SpeedDemon', avatar_url: '/avatars/SpeedDemon.png', memberSince: '2024-01-07 14:00' },
    { id: 8, username: 'PuzzleMaster', avatar_url: '/avatars/PuzzleMaster.png', memberSince: '2024-01-08 15:00' },
    { id: 9, username: 'UnderworldExplorer', avatar_url: '/avatars/UnderworldExplorer.png', memberSince: '2024-01-09 16:00' },
    { id: 10, username: 'SpaceVoyager', avatar_url: '/avatars/SpaceVoyager.png', memberSince: '2024-01-10 17:00' }
];




function formatPostDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Function to find a user by username
/*
function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if (users[i].username === username){
            return users[i];
        }
    }
    return undefined;
}
*/






// Function to find a user by user ID
/*
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if (users[i].id === userId){
            return users[i];
        }
    }
    return undefined;
}
*/



// Function to add a new user
/*
function addUser(username) {
    // TODO: Create a new user object and add to users array
    let user = {id: usercount += 1, username: username, avatar_url: undefined, memberSince: formatPostDate(new Date()) };
    users.push(user);
}
*/


// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res) {
    const username = req.body.username;
    console.log("Attempting to register:", username);
    //console.log(users);
    console.log("username:" ,findUserByUsername(username));
    if (await findUserByUsername(username)){
        res.redirect('/register?error=Username+already+exists')
    } else {
        await addUser(username);
        req.session.loggedIn = true;
        req.session.userId = findUserByUsername(req.body.username).id;
        res.redirect('/');
    }
    console.log("registerUser");
}

// Function to login a user
function loginUser(req, res) {
    // TODO: Login a user and redirect appropriately
    const username = req.body.username;
    if (findUserByUsername(username) == undefined){
        res.redirect('/login?error=User+does+not+exist')
    } else {
        req.session.loggedIn = true;
        req.session.userId = findUserByUsername(req.body.username).id;
        res.redirect('/');
    }
    console.log("loginUser", users);
}

// Function to logout a user
function logoutUser(req, res) {
    // TODO: Destroy session and redirect appropriately
    req.session.loggedIn = false;
    req.session.userId = '';
    res.redirect('/');
}

// Function to render the profile page
/*
function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
    let user = getCurrentUser(req);
    let username = user.username;
    let userposts = [];
    posts.forEach((post) =>{
        if (post.username === username){
            userposts.push(post);
        }
    }
    );
    console.log(userposts)
    user.posts = userposts;
    res.render('profile', {user});

}
*/

/*
// Function to update post likes
function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met

    let user = getCurrentUser(req);
    if (user){
    for(let i = 0; i < posts.length; i++){
        console.log(posts[i].id);
        console.log(req.params.id);

        if (posts[i].id == req.params.id){
            let userIndex = posts[i].likes.indexOf(user.username);
            console.log('inside logs');
            if (userIndex === -1) {
                posts[i].likes.push(user.username);
            } else {
                posts[i].likes.splice(userIndex, 1);
            }
        }

    }
    console.log('inside update post likes', posts);
    return true;
}
else{
    return false;
}
}
*/
/*
// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
    const username = req.params.username;
    const user = findUserByUsername(username);

    const avatarPath = path.join(__dirname, 'public', 'avatars', `${username}.png`);

    if (fs.existsSync(avatarPath)) {
        return res.sendFile(avatarPath);
    } else {
        const avatarBuffer = generateAvatar(username.charAt(0).toUpperCase());
        fs.writeFileSync(avatarPath, avatarBuffer);
        user.avatar_url = `/avatars/${username}.png`;
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
            users[userIndex] = user;
        }
        return res.sendFile(avatarPath);
    }

    

    
}
*/

// Function to get the current user from session
async function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    return await findUserById(req.session.userId);
}
/*
// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
    console.log(users)
    posts.push({id: postcount += 1, title: title, content: content, username: user.username, timestamp: formatPostDate(new Date()), likes: [] })
    console.log(posts);
}
*/

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // TODO: Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer
    let char  = 124 - (letter.toLowerCase()).charCodeAt(0);
    console.log(char);
    const hex = parseInt((char/28) * 16777215).toString(16);
    console.log("int" , hex);
    let color = `#${hex}`;
    console.log("int" , color);
    const avatar = createCanvas(width, height);
    const ctx = avatar.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0,0,100,100);
    ctx.fillStyle = 'white';
    ctx.font = "48px serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 50, 50, 100);
    return avatar.toBuffer('image/png');
  /*
    const letter = 'O';
  let char  = letter.charCodeAt(0);
  const rgb = (char  % 26) * (255/26);
  let color = 'rgb(' + rgb + ',' + rgb + ','+ rgb')';
  const avatar = document.getElementById("canvas");
  const ctx = avatar.getContext('2d');
  ctx.strokeStyle="rgba(0,0,0,1)";
  ctx.strokeRect(0,0,100,100);
  ctx.font = "48px serif";
  ctx.fillStyle = color;
  ctx.fillRect(0,0,100,100);
  ctx.fillText(letter, 30, 65, 100);*/ 

}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Database queries
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

async function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    console.log(username);
    try {
        let find = await db.get('SELECT * FROM Users WHERE username = ?', [username]);
        console.log(find);
        return find;
    } catch (error) {
        console.error('Error finding user by username:', error);
        return undefined;
    }
}

async function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    console.log(userId);
    try {
        let find = await db.get('SELECT * FROM Users WHERE hashedGoogleId = ?', [userId]);
        console.log(find);
        return find;
    } catch (error) {
        console.error('Error finding user by Id:', error);
        return undefined;
    }
}

async function addUser(username) {
    // TODO: Create a new user object and add to users array
    //TODO 2: fix hashed googleID
    let user = {username: username, hashedGoogleId: String(Math.random() * 100), avatar_url: undefined, memberSince: formatPostDate(new Date()) };
    //users.push(user);
    db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
    );
}

async function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
    let user = getCurrentUser(req);
    let username = user.username;
    let userposts = [];
    posts.forEach((post) =>{
        if (post.username === username){
            userposts.push(post);
        }
    }
    );
    console.log(userposts)
    user.posts = userposts;
    res.render('profile', {user});

}

async function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met

    let user = getCurrentUser(req);
    if (user){
    for(let i = 0; i < posts.length; i++){
        console.log(posts[i].id);
        console.log(req.params.id);

        if (posts[i].id == req.params.id){
            let userIndex = posts[i].likes.indexOf(user.username);
            console.log('inside logs');
            if (userIndex === -1) {
                posts[i].likes.push(user.username);
            } else {
                posts[i].likes.splice(userIndex, 1);
            }
        }

    }
    console.log('inside update post likes', posts);
    return true;
}
else{
    return false;
}
}

async function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
    const username = req.params.username;
    const user = findUserByUsername(username);

    const avatarPath = path.join(__dirname, 'public', 'avatars', `${username}.png`);

    if (fs.existsSync(avatarPath)) {
        return res.sendFile(avatarPath);
    } else {
        const avatarBuffer = generateAvatar(username.charAt(0).toUpperCase());
        fs.writeFileSync(avatarPath, avatarBuffer);
        user.avatar_url = `/avatars/${username}.png`;
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex !== -1) {
            users[userIndex] = user;
        }
        return res.sendFile(avatarPath);
    }

    

    
}

async function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
async function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
    console.log(users)
    posts.push({id: postcount += 1, title: title, content: content, username: user.username, timestamp: formatPostDate(new Date()), likes: [] })
    console.log(posts);
}

async function deletePost(req,res, id){
    let user = getCurrentUser(req);
    let username = user.username;
        for(let i = 0; i < posts.length; i++){
            if (posts[i].username === username){
                posts.splice(i,1);
            }
        }
}