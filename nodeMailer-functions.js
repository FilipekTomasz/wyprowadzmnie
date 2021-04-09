const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const ejs = require('ejs');
require('dotenv').config();
let aws = require("@aws-sdk/client-ses");

// configure AWS SDK
let transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
})

const confirmUrl ="https://wyprowadzmnie.com/confirm/"; //url do /confirm
const resetUrl = "https://wyprowadzmnie.com/newpass/"; //url do /resetpass


//"<a href=" + confirmUrl + token + "> 'Nacisnij ten link aby potwierdzić swój adres email'</a>"

async function sendEmail(email) {
    const payload = { email: email };
    const token = jwt.sign(payload, process.env.EMAIL_SECRET); //tworzy token ktory jest uzywany do potwierdzenia emaila

    const urlToken = confirmUrl + token;

    const data = await ejs.renderFile(__dirname + "/emailMessage/email_confirm.ejs", { url: urlToken });


    //Opcje emaila
    let mailOptions = {
        from: '"Wyprowadz mnie" <mail@wyprowadzmnie.com>',
        to: email,
        subject: "Potwierdzenie Emaila",
        html: data
    }


    //Wysyla email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Wyslano email do: ' + mailOptions.to);
        }
    })

}

async function emailSendPassword(email) {
    const payload = { email: email };
    const token = jwt.sign(payload, process.env.EMAIL_SECRET); //tworzy token ktory jest uzywany do potwierdzenia emaila

    const urlToken = resetUrl + token;

    const data = await ejs.renderFile(__dirname + "/emailMessage/email_reset.ejs", { url: urlToken });

    //Opcje emaila
    let mailOptions = {
        from: '"Wyprowadz mnie" <mail@wyprowadzmnie.com>',
        to: email,
        subject: "Reset hasła",
        html: data
    }


    //Wysyla email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Wyslano email do: ' + mailOptions.to);
        }
    })

}

async function emailSendNotification(email, url) {

    const data = await ejs.renderFile(__dirname + "/emailMessage/email_notification.ejs", { url: url });

    //Opcje emaila
    let mailOptions = {
        from: '"Wyprowadz mnie" <mail@wyprowadzmnie.com>',
        to: email,
        subject: "Oferta zaakceptowana",
        html: data
    }


    //Wysyla email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Wyslano email do: ' + mailOptions.to);
        }
    })

}

module.exports = { sendEmail, emailSendPassword, emailSendNotification};