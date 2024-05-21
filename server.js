const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
require('dotenv').config();


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;
let postcount = 2;
let usercount = 2; 

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
        let username = user.username;
        for(let i = 0; i < posts.length; i++){
            if (posts[i].username === username){
                posts.splice(i,1);
            }
        }
        console.log(posts);
        res.status(200).send({ message: "Deleted post successfully" });
    }
    else{
        res.status(500).send({ message: "Failed to delete post" });
    }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

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
        username: 'RetroRaven', timestamp: '2024-01-02 12:00', likes: [] }
];
let users = [
    { id: 1, username: 'PixelPioneer', avatar_url: '/avatars/PixelPioneer.png', memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'RetroRaven', avatar_url: '/avatars/RetroRaven.png', memberSince: '2024-01-02 09:00' },
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
function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if (users[i].username === username){
            return users[i];
        }
    }
    return undefined;
}

// Function to find a user by user ID
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    for(let i = 0; i < users.length; i++){
        if (users[i].id === userId){
            return users[i];
        }
    }
    return undefined;
}

// Function to add a new user
function addUser(username) {
    // TODO: Create a new user object and add to users array
    let user = {id: usercount += 1, username: username, avatar_url: undefined, memberSince: formatPostDate(new Date()) };
    users.push(user);
}

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
function registerUser(req, res) {
    const username = req.body.username;
    console.log("Attempting to register:", username);
    console.log(users);
    if (findUserByUsername(username)){
        res.redirect('/register?error=Username+already+exists')
    } else {
        addUser(username);
        req.session.loggedIn = true;
        req.session.userId = findUserByUsername(req.body.username).id;
        res.redirect('/');
    }
    console.log("registerUser", users);
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

// Function to get the current user from session
function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    return findUserById(req.session.userId);
}

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