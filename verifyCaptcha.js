const {stringify} = require('querystring');
const fetch = require('node-fetch');
require('dotenv').config()

async function verify(req) {
    if (!req.body.captcha) { 
        return 'Captcha nie jest zaznaczona'
    }
    // Secret key
    const secretKey = process.env.CAPTCHA_SECRET;

    // Verify URL
    const query = stringify({
        secret: secretKey,
        response: req.body.captcha,
        remoteip: req.connection.remoteAddress
    });
    const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;

    // Make a request to verifyURL
    const body = await fetch(verifyURL)//.then(res => {
    //console.log(res.json());
    //res.json()});

    // If not successful
    if (body.success !== undefined && !body.success) {
        return 'Captcha sie nie udała'
    }
    //return res.json({ success: false, msg: 'Failed captcha verification' });

    // If successful
    //return res.json({ success: true, msg: 'Captcha passed' });
    return 'success';
}

module.exports = verify;