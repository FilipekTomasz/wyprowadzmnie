const jwt = require('jsonwebtoken');
require('dotenv').config()

//sprawdza czy token jest dobry
function authenticateToken(req, res, next) {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                console.log(err);
                res.redirect('/login');
            } else {
                req.payload = payload;
                next();
            }
        })
    }
    else {
        res.redirect('/login');
    }
}

function checkIfNotLoggedIn(req,res,next){
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                console.log(err);
                res.redirect('/menu');
            } else {
                res.redirect('/menu')
            }
        })
    }
    else {
        next();
    }
}





function decodeToken(req) {
    const token = req.cookies.jwt;
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                console.log(err);
                resolve(err);
            }
            resolve(payload);
        });
    })

}


function decodeTokenEmail(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.EMAIL_SECRET, (err, payload) => {
            if (err) {
                console.log('Najprawdopodobniej ktos probowal cos zrobic bez tokenu');
                resolve('err');
            }
            resolve(payload);
        });
    })

}

function decodeTokenIO(token){
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(payload);
        });
    })
}


module.exports = { authenticateToken, decodeToken, decodeTokenEmail, checkIfNotLoggedIn, decodeTokenIO};    