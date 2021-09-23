const express = require('express')
const multer = require('multer')
const app = express()
const db = require("./database.js")
const bcrypt = require('bcrypt')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/CSS/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

const fileFilter = (req, file, cb ) => {
    if(file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
        cb(null, true)
    }
    else {
        cb(null, false)
    }
}

const upload = multer({ storage: storage, fileFilter: fileFilter}) 

const session = require('express-session')
app.use(session({
    secret: 'randomly generated secret'
}))

app.use(setCurrentUser)

app.set('view engine', 'ejs')

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'))

app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'))

app.use('/public', express.static('public'));

app.use(express.urlencoded())

function setCurrentUser(req, res, next) {
    if (req.session.loggedIn) {
        var sql = "SELECT * FROM user WHERE id =?"
        var params = [req.session.userId]
        db.get(sql, params, (err, row) => {
            if(row !== undefined) {
                res.locals.currentUser = row
            }
            return next()
        });
    } else {
        return next()
    }
}

app.get('/', checkAuth, function(req, res){
    res.render('login', {error: ""})
})

app.get('/register', function(req, res){
    res.render('register', {error: ""})
})

app.get('/new_post', function (req, res) {
    res.render('new_post')
})

app.get('/login', function (req, res) {
    res.render('login', {error: ""})
})

app.get('/home', function (req,res) {
    var sql1 = "SELECT * FROM user WHERE id = ?"
    var data1 = [req.session.userId]
    db.get(sql1, data1, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        var sql2 = "SELECT * FROM post WHERE id_user = ?"
        var data2 = [req.session.userId]
        db.all(sql2, data2, (err, rows) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render('home', {data: row, posts: rows})
        });
    });
})

app.post('/register', function (req, res) {
    bcrypt.hash(req.body.password, 10, function(err, hash) {
        var data = [
            req.body.name,
            req.body.surname,
            req.body.data_birth,
            req.body.country,
            req.body.number,
            req.body.email,
            hash,
            "public/CSS/4.jpg"
        ]
        var error = ""
        var sql = "INSERT INTO user (name, surname, data_birth, country, number, email, password, image, failed_logins) VALUES (?,?,?,?,?,?,?,?,0)"
        db.get(sql, data, function(err, result){
            if(err) {
                error = "Этот email уже зарегестрирован!"
                res.render('register', {error:error})
                return
            }
            res.render('register_answer', {formData: req.body})
        });
    });
})

app.post('/login', function (req, res) {
    var sql  = "SELECT * FROM user WHERE email = ?"
    var params = [req.body.email]
    var error = ""
    db.get(sql, params, (err, row) => {
        if (err) {
            error = err.message
        }
        
        if (row === undefined) {
            error = "Неправильный email или пароль!"
        }
        
        if (error !== "") {
            res.render('login', {error: error})
            return
        }
        bcrypt.compare(req.body.password, row["password"], function (err, hashRes) {
            if (hashRes === false) {
                error = "Неправильный email или пароль!"
                res.render('login', {error: error})
                return
            }
            
            req.session.userId = row["id"]
            req.session.loggedIn = true
            var sql1 = "SELECT * FROM post WHERE id_user = ?"
            var data1 = [req.session.userId]
            db.all(sql1, data1, (err, rows) => {
                if (err) {
                    res.status(400)
                    res.send("database error:" + err.message)
                    return
                }
                res.redirect('/home')
            })
        })
    })
})

function checkAuth (req, res, next) {
    if (req.session.loggedIn) {
        return next()
    } else {
        res.render('login', {error: ""})
    }
}

app.get('/logout', function (req, res) {
    req.session.userId = null
    req.session.loggedIn = false
    res.redirect("/")
})

app.get('/profile', checkAuth, function (req, res) {
    res.render('profile')
})

app.post('/profile', upload.single('avatar'), function (req, res) {
    bcrypt.hash(req.body.password, 10, function(err, hash) {
        if (req.file)
            {
                var data = [
                    req.body.name,
                    req.body.surname,
                    req.body.data_birth,
                    req.body.country,
                    req.body.number,
                    req.body.email,
                    './public/CSS/' + req.file.originalname,
                    hash,
                    req.session.userId
                ]
            }
        else 
            {
                var data = [
                    req.body.name,
                    req.body.surname,
                    req.body.data_birth,
                    req.body.country,
                    req.body.number,
                    req.body.email,
                    "./public/CSS/4.jpg",
                    hash,
                    req.session.userId
                ]
            }
        db.run(
            `UPDATE user SET
            name = COALESCE(?, name),
            surname = COALESCE(?, surname),
            data_birth = COALESCE(?, data_birth),
            country = COALESCE(?, country),
            number = COALESCE(?, number),
            email = COALESCE(?, email),
            image = COALESCE(?, image),
            password = COALESCE(?, password)
            WHERE id = ?`,
            data,
            function (err, result) {
                if (err) {
                    res.status(400)
                    res.send("database error:" + err.message)
                    return;
                }
                res.redirect('/home')
            });
    });
})

app.post('/new_post', function(req, res) {
    var sql = "INSERT INTO post (title, body, id_user) VALUES (?,?,?)"
    var data = [
        req.body.title,
        req.body.body,
        req.session.userId
    ]
    db.run(sql, data, function (err, result) {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return
        }
        var sql1 = "SELECT * FROM user WHERE id = ?"
        var data1 = [req.session.userId]
        db.get(sql1, data1, (err, row) => {
            if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
            }
            
            var sql2 = "SELECT * FROM post WHERE id_user = ?"
            var data2 = [req.session.userId]
            db.all(sql2, data2, (err, rows) => {
                if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
                }
                res.render('home', {data: row, posts: rows})
            });
        });
    });
})

app.get('/posts/:id/show', function (req, res) {
    var sql = "SELECT * FROM post WHERE id = ?"
    var params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        var sql1 = "SELECT * FROM comment WHERE post_id = ?"
        db.all(sql1, params, [], (err, comm) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render('show_post', {post: row, comment: comm})
        })
    })
})

app.post('/posts/:id/show', function (req, res) {
    var data = [
        req.body.author,
        req.body.comment,
        req.params.id
    ]
    var sql = "INSERT INTO comment (author, comment, post_id) VALUES (?,?,?)"
    
    db.run(sql, data, function (err, result) {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.redirect('/home')
    })
})

app.get('/posts/:id/edit', function (req, res) {
    var sql = "SELECT * FROM post WHERE id = ?"
    var params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.render('edit_post', {post:row})
    })
})

app.post('/posts/:id/edit', function (req,res) {
    var data = [
        req.body.title,
        req.body.body,
        req.params.id
    ]
    db.run(
        `UPDATE post SET
        title = COALESCE(?, title),
        body = COALESCE(?, body)
        WHERE id = ?`,
        data, 
        function (err, result) {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.redirect('/home')
        })
})

app.get('/posts/:id/delete', function (req, res) {
    var sql = "DELETE FROM post WHERE id = ?"
    var params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.redirect('/home')
    })
})

app.post('/home', function (req, res) {
    var sql = "SELECT * FROM user WHERE surname = ?"
    var params = [req.body.surname]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        if (row !== undefined) 
        {
            var sql1 = "SELECT * FROM post WHERE id_user = ?"
            var data = [row.id]
            db.all(sql1, data, (err, rows) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render('home', {data:row, posts:rows})
            })    
        }
        else {
            res.render('none_find')    
        }
        
    })
})

app.listen(666)