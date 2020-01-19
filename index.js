// REQUIRE EXTERNAL MODULES
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const session = require('express-session');
const fileUpload = require('express-fileupload');

const app = express();

// SETUP SERVER
let port = process.env.PORT || 3000;
app.listen(port, ()=>{
    console.log('node3 server listening to port 3000');
})

// EXPRESS MIDDLEWARE AND STATIC FILES
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
app.use(fileUpload());
app.use(bodyParser.json());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
const urlEncodedParser = bodyParser.urlencoded({ extended:false });

// COMMON FUNCTIONS
const connection = function(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345678',
        database: 'login_system'
    })
}

// GET ROUTES
// plain
app.get('/', (req, res) => {
    res.render('index');
})
// signup
app.get('/signup', (req, res)=>{
    res.render('signup');
})
// set profile picture
app.get('/profilepic', (req, res)=>{
    res.render('profilepic');
})
// login
app.get('/login', (req, res)=>{
    res.render('index');
})
// homepage
app.get('/home', (req, res)=>{
    if(req.session.loggedIn){
    let queryString = 'select * from users where username = ?';
    connection().query(queryString, [req.session.username], (err, rows, fields)=>{
            // fetch posts
            let queryString2 = 'SELECT posts.content, posts.username, posts.likes, posts.dislikes, users.image FROM posts INNER JOIN users ON posts.username = users.username;';
            connection().query(queryString2, (err, results, fields) => {
                const myPosts = results.filter(
                    function(result){
                        if(result.username== req.session.username ){
                            return true;
                        }
                    }
                );
                // console.log(myPosts);
                // fetch online users
                let queryString3 = 'select username from users where online = 1';
                connection().query(queryString3, (err, onlineUsers, fields) => {
                    // console.log(results[0].content);
                    res.render('homepage',{
                        username: req.session.username,
                        posts: results,
                        user: rows,
                        online: onlineUsers,
                        myPosts: myPosts
                        });
                        // console.log(results[0]);
                    });
                })
        })
    }else{
        res.render('index');
        }
    })
// profile
app.get('/profile', (req, res)=>{
    let queryString = 'select * from users where username = ?';
    connection().query(queryString, [req.session.username], (err, rows, fields)=>{
            // fetch posts
            let queryString2 = 'select * from posts';
            connection().query(queryString2, (err, results, fields) => {
                const myPosts = results.filter(
                    function(result){
                        if(result.username== req.session.username ){
                            return true;
                        }
                    }
                );
                console.log(req.session.username);
                // fetch online users
                res.render('profile',{
                    username: req.session.username,
                    posts: myPosts,
                    user: rows,
                })
                // console.log(results[0]);  
                })
    })
})
// profile
app.get('/profile/:username', (req, res)=>{
    let queryString = 'select * from users where username = ?';
    connection().query(queryString, [req.params.username], (err, rows, fields)=>{
            // fetch posts
            let queryString2 = 'select * from posts';
            connection().query(queryString2, (err, results, fields) => {
                const myPosts = results.filter(
                    function(result){
                        if(result.username== req.params.username ){
                            return true;
                        }
                    }
                );
                console.log(req.params.username);
                // fetch online users
                res.render('profile',{
                    username: req.params.username,
                    posts: myPosts,
                    user: rows,
                })
                // console.log(results[0]);  
                })
    })
})
// settings
app.get('/settings', (req, res) => {
    res.render('settings');
})
// logout
app.get('/logout', (req, res)=>{
    console.log(req.session.username + " is logged out");

    let queryString3 = 'UPDATE users SET online = 0 WHERE username = ?';
    connection().query(queryString3,[req.session.username], (err, rows2, fields) => {
    })
    
    req.session.destroy((err)=>{
        if(err){
            console.log(err);
        }else{}
        res.render('index');
    })
})

// POST ROUTES
// signup
app.post('/signup', urlEncodedParser, (req, res)=>{
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let mobile = req.body.mobile;
    
    const queryString = 'INSERT INTO users(username, email, password, mobile) values(?, ?, ?, ?)';

    connection().query(queryString, [username, email, password, mobile], (err, results, fields)=>{
        if(err){
            res.sendStatus(500);
        }else{
            console.log('row added!')
        }
    });
    req.session.loggedIn = true;
    req.session.username = username;
    console.log(username +' is logged in!');

    // let queryString2 = 'select * from posts';
    // connection().query(queryString2, (err, results, fields) => {
    //     res.render('homepage', {username: username, posts: results});
    // });
    res.render('profilepic');
})

// add profile picture
app.post('/profilepic', urlEncodedParser,  (req, res)=>{
    let file = req.files.profilepict;
    console.log(file);
    file.mv(`public/images/ ${file.name}`, (err)=>{
        if(err){
            res.sendStatus(500);
        }else{
            console.log('file moved! ');
            // console.log(req.session.username);
            let username = req.session.username;
            let queryString = 'UPDATE users SET image = ? WHERE username = ?';
            connection().query(queryString, [`public/images/${file.name}`, username], (err, results, fields) => {
                if(err){
                    console.log(err);
                }else{
                    console.log('profilepic uploaded!');
                    req.session.destroy((err)=>{
                        if(err){
                            console.log(err);
                        }else{}
                        res.render('index');
                    })
                }
            });
            }
    })
})

// login
 app.post('/login', urlEncodedParser, (req, res)=>{
    let username = req.body.username;
    let password = req.body.password;

    let queryString = 'select * from users where username = ? and password = ?';
    connection().query(queryString, [username, password], (err, rows, fields)=>{
        if(rows.length>0){
            req.session.loggedIn = true;
            req.session.username = username;
            // fetch posts
            let queryString2 = 'SELECT posts.content, posts.username, posts.likes, posts.dislikes, users.image FROM posts INNER JOIN users ON posts.username = users.username;';
            connection().query(queryString2, (err, results, fields) => {
                const myPosts = results.filter(
                    function(result){
                        if(result.username== req.session.username ){
                            return true;
                        }
                    }
                );
                // console.log(results);
                // update online users
                let queryString3 = 'UPDATE users SET online = 1 WHERE username = ?';
                connection().query(queryString3,[req.session.username], (err, rows2, fields) => {
                    console.log(`${req.session.username} added to online users!`);
                    // fetch online users
                    let queryString4 = 'select username from users where online = 1';
                    connection().query(queryString4, (err, onlineUsers, fields) => {
                        res.render('homepage',{
                            username: username,
                            posts: results,
                            user: rows,
                            online: onlineUsers,
                            myPosts: myPosts
                            });
                            // console.log(rows);
                            // console.log(results[0]);
                        })
                    })
                })
        }else{
            console.log('incorrect username and/or password!');
            res.render('index');
        }
    })
 })

 // submit post
 app.post('/post', urlEncodedParser, (req, res) => {
    let post = req.body.content;
     // let username = req.session.username;

    let queryString = 'insert into posts(content, username) values(?, ?)';
    connection().query(queryString, [post, req.session.username], (err, results, fields) => {
        console.log('connection established!');
        console.log(`${post}`);
        if(err){
            console.log(err);
            res.sendStatus(500);
        }else{
            // console.log(`post added by ${req.session.username}!`);
        }
        res.end();
    })
 });

 // follow user
 app.post('/follow', urlEncodedParser, (req, res) => {
    let username = req.session.username;
    let followed = req.body.followed;
    console.log('follow request received!');
    // check if user is trying to follow him/herself
    if(username == followed){
        console.log('you can not follow yourself!');
        res.send(JSON.stringify({ message: 'you can not follow yourself' }));
    }else{
        // check if user already follows the other user
        let queryString = 'select * from follows where follower = ? and followed = ?';
        connection().query(queryString, [username, followed], (err, results, fields) => {
        if(results.length == 0){
            // insert new follow
            let queryString = 'insert into follows(follower, followed) values(?, ?)';
            connection().query(queryString, [username, followed], (err, results, fields) => {
            console.log(`${username} attempting to follow ${followed}`);
            console.log('attempting to follow user!');
            if(err){
                console.log(err);
                res.sendStatus(500);
            }else{
                // update users followers
                let queryString = 'UPDATE users SET followers = followers+1 WHERE username = ?';
                connection().query(queryString, [followed], (err, results, fields) => {
                    // fetch new following
                    let queryString = 'select followers from users where username = ?';
                    connection().query(queryString, [followed], (err, followingResult, fields) => {
                        console.log('user follow attempt success!');
                        console.log(followingResult[0].followers);
                        let queryString = 'UPDATE users SET following = following+1 WHERE username = ?';
                        connection().query(queryString, [username], (err, followingResult, fields) => {})
                        res.send(JSON.stringify({ newfollowing: followingResult[0].followers }))
                    })
                })
            }
            })

        }else{
            console.log(`${username} already follows ${followed}!`);
            res.end();
            }
        })
    }

 });

// unfollow user
app.post('/unfollow', (req, res) => {
    let username = req.session.username;
    let followed = req.body.followed;
    console.log('unfollow request received!');
    // check if user is trying to follow him/herself
    if(username == followed){
        console.log('you can not unfollow yourself!');
        res.send(JSON.stringify({ message: 'you can not unfollow yourself' }));
    }else{
        // check if user already follows the other user
        let queryString = 'select * from follows where follower = ? and followed = ?';
        connection().query(queryString, [username, followed], (err, results, fields) => {
        if(results.length){
            // delete follow
            let queryString = 'delete from follows where follower = ? and followed = ?';
            connection().query(queryString, [username, followed], (err, results, fields) => {
            console.log(`${username} attempting to unfollow ${followed}`);
            console.log('attempting to unfollow user!');
            if(err){
                console.log(err);
                res.sendStatus(500);
            }else{
                // update users followers
                let queryString = 'UPDATE users SET followers = followers-1 WHERE username = ?';
                connection().query(queryString, [followed], (err, results, fields) => {
                    // fetch new following
                    let queryString = 'select followers from users where username = ?';
                    connection().query(queryString, [followed], (err, followingResult, fields) => {
                        console.log('user follow attempt success!');
                        console.log(followingResult[0].followers);
                        // update users following
                        let queryString = 'UPDATE users SET following = following-1 WHERE username = ?';
                        connection().query(queryString, [username], (err, followingResult, fields) => {})
                        res.send(JSON.stringify({ newfollowing: followingResult[0].followers }))
                    })
                })
            }
            })

        }else{
            console.log(`${username} doesnt follow ${followed}!`);
            res.end();
            }
        })
    }
})

// like post{
app.post('/like', (req, res) =>{
    console.log(req.body.content);
    let queryString = 'UPDATE posts SET likes = likes+1 WHERE content = ?';
    connection().query(queryString, [req.body.content], (err, results, fields) => {
        if(err){
            console.log(err);
        }else{
            console.log('filtering post...');
            console.log('post liked!');
            // fetch new likes
            let queryString = 'select likes from posts where content = ?';
            connection().query(queryString, [req.body.content], (err, rows, fields) => {
                if(err){
                    console.log(err);
                }else{
                    console.log(rows[0].likes);
                    res.send(JSON.stringify( {likes: rows[0].likes}));
                }
            })
        }
    })
})   

// dislike post{
app.post('/dislike', (req, res) =>{
    console.log(req.body.content);
    let queryString = 'UPDATE posts SET dislikes = dislikes+1 WHERE content = ?';
    connection().query(queryString, [req.body.content], (err, results, fields) => {
        if(err){
            console.log(err);
        }else{
            console.log('filtering post...');
            console.log('post disliked!');
            // console.log(results);
            // fetch new dislikes
            let queryString = 'select dislikes from posts where content = ?';
            connection().query(queryString, [req.body.content], (err, rows, fields) => {
                if(err){
                    console.log(err);
                }else{
                    console.log(rows[0].dislikes);
                    res.send(JSON.stringify( {dislikes: rows[0].dislikes}));
                }
            })
        }
    })
})