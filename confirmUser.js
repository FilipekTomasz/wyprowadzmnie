const bcrypt = require('bcrypt');

var user = [];


async function authenticateUser(email, password, database) {
    try {
        let val = await checkIfEmailMaches(email, database, password);
        let confirm = await checkIfValidUser(val);
        if (confirm === 'ok') {
            let emailConfirmed = await checkIFEmailConfirmed(database, email)
            if (emailConfirmed === 'ok') {
                let banned = await checkIfBanned(database, email);
                return banned;
            } else {
                return emailConfirmed;
            }
        } else {
            return confirm;
        }
    } catch (err) {
        console.log(err);
    }
};

function checkIFEmailConfirmed(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT confirmEmail FROM users WHERE email = ?", [email], (err, result) => {
            if (err) reject(err);
            if (result[0].confirmEmail == 1) {
                resolve('ok')
            } else {
                resolve('emailNotConfirmed');
            }
        })
    })
}





function checkIfEmailMaches(email, database, password) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
            if (err) {
                reject(err);
            } else {
                user = result;
                let resolveValue = {
                    email: email,
                    database: database,
                    password: password
                }
                resolve(resolveValue);

            }
        })
    })
}

function checkIfValidUser(result) {
    return new Promise((resolve, reject) => {
        if (user === undefined || user.length == 0) {
            resolve('wrongPass');
        } else {
            result.database.query("SELECT password FROM users WHERE email = ?", [result.email], (err, queryResult) => {
                if (err) reject(err);
                bcrypt.compare(result.password, queryResult[0].password, (err, res) => {
                    if (err) reject(err);
                    if (res) {
                        resolve('ok');
                    } else {
                        resolve('wrongPass');
                    }
                })
            })
        }
    })
}

function checkIfBanned(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT ban FROM users WHERE email = ?", [email], (err, result) => {
            if (err) reject(err);
            if (result[0].ban == 0) {
                resolve('ok')
            } else {
                resolve('banned');
            }
        })
    })
}

module.exports = authenticateUser;