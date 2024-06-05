// populatedb.js

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'indie_arcade.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes TEXT NOT NULL,
            tags TEXT NOT NULL,
            rating INTEGER
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'PixelPioneer', hashedGoogleId: 'hashedGoogleId1', avatar_url: '/avatars/PixelPioneer.png', memberSince: '2024-01-01 08:00' },
        { username: 'RetroRaven', hashedGoogleId: 'hashedGoogleId2', avatar_url: '/avatars/RetroRaven.png', memberSince: '2024-01-02 09:00' },
        { username: 'GamerGuru', hashedGoogleId: 'hashedGoogleId3', avatar_url: '/avatars/GamerGuru.png', memberSince: '2024-01-03 10:00' },
        { username: 'SoulSeeker', hashedGoogleId: 'hashedGoogleId4', avatar_url: '/avatars/SoulSeeker.png', memberSince: '2024-01-04 11:00' },
        { username: 'StrategySavant', hashedGoogleId: 'hashedGoogleId5', avatar_url: '/avatars/StrategySavant.png', memberSince: '2024-01-05 12:00' },
        { username: 'IslandInnovator',hashedGoogleId: 'hashedGoogleId6', avatar_url: '/avatars/IslandInnovator.png', memberSince: '2024-01-06 13:00' },
        { username: 'SpeedDemon', hashedGoogleId: 'hashedGoogleId7', avatar_url: '/avatars/SpeedDemon.png', memberSince: '2024-01-07 14:00' },
        { username: 'PuzzleMaster', hashedGoogleId: 'hashedGoogleId8', avatar_url: '/avatars/PuzzleMaster.png', memberSince: '2024-01-08 15:00' },
        { username: 'UnderworldExplorer', hashedGoogleId: 'hashedGoogleId9', avatar_url: '/avatars/UnderworldExplorer.png', memberSince: '2024-01-09 16:00' },
        { username: 'SpaceVoyager', hashedGoogleId: 'hashedGoogleId10', avatar_url: '/avatars/SpaceVoyager.png', memberSince: '2024-01-10 17:00' }
    ];

    const posts = [
        {
            title: 'Discovering Hidden Gems: "Celeste"',
            content: 'I recently finished "Celeste" and the tight platforming mechanics, along with the touching story, really impressed me. Madeline\'s journey is beautifully crafted.',
            username: 'PixelPioneer',
            timestamp: '2024-01-01 10:00',
            likes: JSON.stringify([]),
            tags: 'Celeste,Platformer,Indie',
            rating: 5
        },
        {
            title: 'The Charm of "Stardew Valley"',
            content: 'I\'m completely hooked on "Stardew Valley." The game\'s relaxing vibe and the freedom to play at your own pace make it a cozy delight.',
            username: 'RetroRaven',
            timestamp: '2024-01-02 12:00',
            likes: JSON.stringify([]),
            tags: 'Stardew Valley,Simulation,Relaxing',
            rating: 5
        },
        {
            title: 'Epic Adventures in "The Legend of Zelda: Breath of the Wild"',
            content: 'Exploring the vast world of Hyrule in "Breath of the Wild" has been an incredible experience. The sense of freedom and discovery is unmatched.',
            username: 'GamerGuru',
            timestamp: '2024-01-03 14:00',
            likes: JSON.stringify([]),
            tags: 'The Legend of Zelda,Action-Adventure,Open World',
            rating: 5
        },
        {
            title: 'The Intensity of "Dark Souls III"',
            content: '"Dark Souls III" offers a challenging yet rewarding experience. The intricate level design and tough enemies make every victory feel well-earned.',
            username: 'SoulSeeker',
            timestamp: '2024-01-04 16:00',
            likes: JSON.stringify([]),
            tags: 'Dark Souls III,Challenging,Action RPG',
            rating: 4
        },
        {
            title: 'Building Empires in "Civilization VI"',
            content: 'I love the strategic depth of "Civilization VI." Building my own empire and making crucial decisions keeps me engaged for hours on end.',
            username: 'StrategySavant',
            timestamp: '2024-01-05 18:00',
            likes: JSON.stringify([]),
            tags: 'Civilization VI,Strategy,Simulation',
            rating: 5
        },
        {
            title: 'Unwinding with "Animal Crossing: New Horizons"',
            content: '"Animal Crossing: New Horizons" is the perfect game to relax with. Designing my island and interacting with villagers brings a sense of calm and joy.',
            username: 'IslandInnovator',
            timestamp: '2024-01-06 20:00',
            likes: JSON.stringify([]),
            tags: 'Animal Crossing,Simulation,Relaxing',
            rating: 4
        },
        {
            title: 'Racing Thrills in "Mario Kart 8 Deluxe"',
            content: 'Nothing beats the excitement of racing friends in "Mario Kart 8 Deluxe." The tracks are beautifully designed and the gameplay is always fun.',
            username: 'SpeedDemon',
            timestamp: '2024-01-07 22:00',
            likes: JSON.stringify([]),
            tags: 'Mario Kart 8 Deluxe,Racing,Multiplayer',
            rating: 5
        },
        {
            title: 'Puzzle Solving in "The Witness"',
            content: '"The Witness" offers a unique puzzle-solving experience, but the difficulty spikes can be frustrating. Some puzzles feel overly obtuse and took away from my enjoyment.',
            username: 'PuzzleMaster',
            timestamp: '2024-01-08 09:00',
            likes: JSON.stringify([]),
            tags: 'The Witness,Puzzle,Indie',
            rating: 2
        },
        {
            title: 'Action-Packed Adventure in "Hades"',
            content: '"Hades" combines fast-paced action with a compelling story. The rogue-like elements keep each run fresh and exciting.',
            username: 'UnderworldExplorer',
            timestamp: '2024-01-09 11:00',
            likes: JSON.stringify([]),
            tags: 'Hades,Rogue-Like,Action',
            rating: 4
        },
        {
            title: 'Exploring Space in "No Man\'s Sky"',
            content: 'While "No Man\'s Sky" offers a vast universe to explore, I found the gameplay to be repetitive and the procedural generation lacking in variety. The initial excitement wore off quickly, and I was left wanting more meaningful interactions and content.',
            username: 'SpaceVoyager',
            timestamp: '2024-01-10 13:00',
            likes: JSON.stringify([]),
            tags: 'No Man\'s Sky,Space,Exploration',
            rating: 2
        }
    ];
    

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
        
    }));
    
    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes, tags, rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes, post.tags, post.rating]
        );
    }));

    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});