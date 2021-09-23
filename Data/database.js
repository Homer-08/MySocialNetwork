var sqlite3 = require('sqlite3').verbose() 

var DBSOURCE = "./db/db.sqlite" 

var db = new sqlite3.Database(DBSOURCE, (err) => { 
    if (err) {
        console.error(err.message)
        throw err
    }else{
        console.log('Connected to the SQLite database.') 
        db.run(`CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            surname TEXT,
            data_birth DATA,
            country TEXT,
            number TEXT,
            email TEXT UNIQUE,
            password TEXT,
            image BLOB,
            failed_logins INTEGER,
            CONSTRAINT email_unique UNIQUE (email)
            )`,
               (err) => {
            if (err) {
                console.log("Table users is already created" + err.message)
            }else{
                console.log("Table users is created")
            }
        });
        db.run(
            `CREATE TABLE post (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            body TEXT,
            id_user INTEGER
            )`,
            (err) => {
                if (err) {
                    console.log("Table posts id already created:" + err.message)
                }else {
                    console.log("Table posts is created")
                }
            });
        db.run(`CREATE TABLE comment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                author TEXT,
                comment TEXT,
                post_id INTEGER)`,
               (err) => {
            if (err) {
                console.log("Table comment id already created:" + err.message)
            }else {
                console.log("Table comment is created")
            }
        })
    }
});



module.exports = db 