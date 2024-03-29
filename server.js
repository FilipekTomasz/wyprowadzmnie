require('dotenv').config();
//Do prawie wszystkiego
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
//Szyfrowanie hasła
const bcrypt = require('bcrypt');
const net = require('net')
const tls = require('tls')
//Potrzebne do req.flash() ==> notyfikacje
const session = require('express-session');
const httpProxy = require('http-proxy')
//Nie wiem do czego
const methodOverride = require('method-override');

//Do sql
const mysql = require('mysql2');

//Do autoryzacji uzytkownik
const jwt = require('jsonwebtoken');

//Chyba nic nie robi ale boje sie usuwac
const { json, text } = require('express');

//Do cookies
const cookieParser = require('cookie-parser');

//Do notyfikacji
const flush = require('connect-flash');

//Do zdjec
const fileUpload = require('express-fileupload');

//Chyba tez do zdjec
const bodyParser = require('body-parser');

//Do chatu
const http = require('http');
const socketio = require('socket.io'); // nwm czemu sciezka nie dziala




//Moje funkcje
const { getExtension, checkMimetype, getDataFromFile, handleImage } = require('./imageFunctions');
const authUser = require('./confirmUser');
const { addUser, addOffer, getOffers, confirmEmail, changePassword, getOffersByPage, isNumeric, getUserWithEmail, acceptOffer, checkIfOfferTaken, getEmailFromOfferID, getEmailOfUserWhoTookOffer, getMyOffers, getOffersIveTaken, checkIfYouTookOffer, getEmailsChatAccess, deleteOffer, saveChat, getChat, getUsers, banUser, getOffersLength, getNumber, editUser } = require('./sql-functions');
const { authenticateToken, checkIfNotLoggedIn, decodeToken, decodeTokenEmail, decodeTokenIO } = require('./jwt-functions');
const { sendEmail, emailSendPassword, emailSendNotification } = require('./nodeMailer-functions');
const verifyCaptcha = require('./verifyCaptcha');
const { schdeludeOfferDeletion, scheludeAll } = require('./scheduling');
const testData = require('./helpfulFunctions');


const port = process.env.PORT || 443;
//Opcje podlaczania do sql
const db = mysql.createConnection({
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    host: process.env.SQL_HOST,
})

//Podlaczenie do sql
db.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to mysql')
        scheludeAll(db); // Zaczyna daty
    }
});


//Ustawienia aplikacji
app.use(cookieParser());
app.use(express.json());

// app.use(express.bodyParser({ keepExtensions: true}));
app.use(bodyParser.urlencoded({ extended: false, limit: '1kb' }));
app.use(bodyParser.json({ limit: '1kb' }));

app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SESSION_SECRET, // mozliwe ze popsulem klucz
    resave: false,
    saveUninitialized: false
}));
app.use(methodOverride('_method'));
app.use(flush());

app.use(express.static(__dirname + '/views'));

app.use(fileUpload({
    limits: {
        fileSize: 1000000 //1mb
    },
    abortOnLimit: true,
    limitHandler: () => {
        console.log('file too big') // to nie powinno nic robic ale nwm czemu jak sie usunie to wszystko jest popsute
    }
}));


//ustawienia do chatu
const server = http.createServer(app);
const io = socketio(server);


//resetuje użytkowników
//  db.query("TRUNCATE TABLE offers", (err,result) =>{
//  if(err) console.log(err);
//  })

//Pokazuje wszystkie oferty w konsoli

//  db.query("SELECT * FROM offers", (err,result) =>{
//    console.log(result);
//  })
//io.attach(httpsServer);
//io.attach(server);


// Testowanie
//let testRoutes = require('./test');
//app.use('/test', testRoutes);


//#region logowanie i rejestracja


//Przkierowanie do strony logowania
app.get('/login', checkIfNotLoggedIn, (req, res) => {
    res.render('login.ejs', { message: req.flash('loginError') });
})

//odpala sie gdy ktos nacisnie guzik login
app.post('/login', checkIfNotLoggedIn, async (req, res) => {
    try {
        let result = await authUser(req.body.email, req.body.password, db)
        if (result === 'ok') { // udalo sie zalogowac
            const payload = { email: req.body.email, loggedIn: true };
            const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET); // tworzy jwt token ktory potem jest uzywany do sprawdzania czy uzytkownik jest zalogowany
            res.cookie('jwt', accessToken, { httpOnly: true }); // potem dodac maxAge
            res.redirect('/menu');
        } else if (result === 'wrongPass') { //zle haslo lub nazwa uzytkownika
            req.flash('loginError', 'Email lub hasło jest niepoprwane');
            res.redirect('./login');
        } else if (result === 'emailNotConfirmed') {
            req.flash('loginError', 'Email nie jest potwierdzony');
            res.redirect('./login');
        } else if (result === 'banned') {
            req.flash('loginError', 'Twoje konto zostało zbanowane');
            res.redirect('./login');
        }
    } catch (e) { //error
        console.log(e);
        req.flash('loginError', 'Cos poszlo nie tak');
        res.redirect('./login');
    }
});

//Przkierowanie do strony rejestracji
app.get('/register', checkIfNotLoggedIn, (req, res) => {
    res.render('register.ejs', { message: req.flash('registerError') });
});

//Tworzenie konta
app.post('/register', checkIfNotLoggedIn, async (req, res) => { // W miejsach gdzie jest uzywana captcha nie moge uzywac res.redirect tylko res.json
    const captchaResult = await verifyCaptcha(req);
    if (captchaResult != 'success') {
        req.flash('registerError', captchaResult);
        return res.json({ success: false });
    } else {


        if (req.body.password !== req.body.password2) {
            req.flash('registerError', 'Hasła się nie zgadzają');
            return res.json({ success: false });
        }


        const testedData = testData(req.body.name, req.body.surname, req.body.password, req.body.email, req.body.phoneNumber, req.body.postCode);

        if (!testedData.name) {
            req.flash('registerError', 'Nieprawdziwe imię');
            return res.json({ success: false });
        }


        if (!testedData.surname) {
            req.flash('registerError', 'Nieprawdziwe nazwisko');
            return res.json({ success: false });
        }

        if (!testedData.password) {
            req.flash('registerError', 'Niepoprawne hasło');
            return res.json({ success: false });
        }

        if (!testedData.email) {
            req.flash('registerError', 'Niepoprawny email');
            return res.json({ success: false });
        }

        if (!testedData.telephone) {
            req.flash('registerError', 'Niepoprawny numer telefonu');
            return res.json({ success: false });
        }

        if (!testedData.postCode) {
            req.flash('registerError', 'Nieprawdziwy kod pocztowy');
            return res.json({ success: false });
        }



        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10); // robienie fajnego hasla zeby nie bylo zwyklym tekstem
            var user = [
                req.body.name,
                req.body.surname,
                req.body.email,
                req.body.phoneNumber,
                req.body.postCode,
                req.body.city,
                hashedPassword
            ]
            const result = await addUser(db, user);

            if (result === 'success') {
                const USER_EMAIL = user[2];
                sendEmail(USER_EMAIL);
                req.flash('confirmEmail', USER_EMAIL);
                return res.json({ success: true });
            } else if (result === 'emailTaken') {

                req.flash('registerError', 'Ten email jest już w użyciu');
                return res.json({ success: false });

            } else if (result === 'noNumber') {

                req.flash('registerError', 'Numer telefony musi być liczbą');
                return res.json({ success: false });

            }
        } catch (e) {
            console.log(e);
            req.flash('registerError', 'Cos poszlo nie tak');
            return res.json({ success: false });

        }
    }
});

//Wylogowywanie
app.get('/logout', (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 });
    req.flash('loginError', 'Pomyslnie się wylogowałeś');
    res.redirect('/login');
});



//#endregion

// #region rzeczy zwiazane z emailem: resetowanie, potwierdaznie itp

// Potwierdzenie emaila, unikalny token jest wysyłany w mailu, jesli wszystko sie uda to powinno przekierowac do loginu
app.get('/confirm/:token', checkIfNotLoggedIn, async (req, res) => {
    try {
        const DECODED_TOKEN = await decodeTokenEmail(req.params.token)
        const result = await confirmEmail(db, DECODED_TOKEN.email)
        if (result === 'success') {
            req.flash('loginError', 'Email został potwierdzony');
            res.redirect('/login');
        } else {
            res.render('confirmation.ejs', { message: 'Wystąpił błąd, spróbuj ponownie' });
        }


    } catch (e) {
        console.log(e)
    }
})


app.get('/newpass/:token', checkIfNotLoggedIn, (req, res) => {
    try {
        //
        res.render('newpass.ejs', { message: '', token: req.params.token });
    } catch (e) {
        console.log(e);
        res.render('newpass.ejs', { message: 'Wystąpił błąd, spróbuj ponownie', token: '' });
    }
})

app.post('/newpass', checkIfNotLoggedIn, async (req, res) => {
    if (req.body.password !== req.body.password2) {
        res.render('newpass.ejs', { message: 'Hasła się nie zgadzają', token: req.body.token });
    }
    if(req.body.password < 8 && req.body.password > 20){
        res.render('newpass.ejs', { message: 'Hasło musi mięc conajmniej 8 znaków', token: req.body.token });
    }

    const DECODED_TOKEN = await decodeTokenEmail(req.body.token)
    if (DECODED_TOKEN === 'err') {
        res.render('newpass.ejs', { message: 'Wystąpił błąd, spróbuj ponownie', token: req.body.token });
    } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 10); // robienie fajnego hasla zeby nie bylo zwyklym tekstem
        const passResult = await changePassword(db, hashedPassword, DECODED_TOKEN.email);

        if (passResult === 'success') {
            req.flash('loginError', 'Hasło zostało zmienione');
            res.redirect('/login');
        } else {
            res.render('newpass.ejs', { message: 'Wystąpił błąd, spróbuj ponownie', token: req.body.token });
        }
    }
})



// Potwierdzenie emaila, unikalny token jest wysyłany w mailu, jesli wszystko sie uda to powinno przekierowac do loginu
app.get('/resetpass', checkIfNotLoggedIn, (req, res) => {
    res.render('resetpass.ejs', { message: '' });
})

app.post('/resetpass', checkIfNotLoggedIn, (req, res) => {
    emailSendPassword(req.body.email);

    res.render('resetpass.ejs', { message: 'Email został wysłany' });
})



//Renderuje /confirmEmail.ejs
app.get('/confirmEmail', checkIfNotLoggedIn, (req, res) => {
    res.render('confirmEmail.ejs', { email: req.flash('confirmEmail'), message: req.flash('emailMessage') })
})

//Ponownie wysyła maila jeśli użytkownik go nie dostał
app.post('/resendEmail', checkIfNotLoggedIn, (req, res) => {
    const USER_EMAIL = req.body.email;

    sendEmail(USER_EMAIL);
    req.flash('confirmEmail', USER_EMAIL);
    req.flash('emailMessage', 'Email został ponownie wysłany');
    res.redirect('/confirmEmail')
})


//#endregion

// #region chat


app.get('/acceptOffer/:offerId', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req);
    const useremail = DECODED_TOKEN.email;
    const OFFER_ID = req.params.offerId;

    const otheremail = await getEmailFromOfferID(db, OFFER_ID);



    if (otheremail === useremail) {
        req.flash("offerError", "Nie można akceptować własnych ofert");
        res.redirect('/offers/0/pay');

    } else {
        req.flash('offerConfirmID', OFFER_ID);
        res.redirect('/offerConfirmed');
    }
})

app.get('/offerConfirmed', authenticateToken, (req, res) => {
    res.render('offerConfirmed.ejs', { id: req.flash('offerConfirmID') });
})

app.get('/redirectChat/:offerId', authenticateToken, (req, res) => {
    res.redirect(`/chat/${req.params.offerId}/${req.cookies.jwt}`)
})


app.get('/chat/:offerId/:jwt', authenticateToken, async (req, res) => {
    if (req.params.jwt === 'new') {
        const DECODED_TOKEN = await decodeToken(req);
        const useremail = DECODED_TOKEN.email;

        const result = await acceptOffer(db, useremail, req.params.offerId);

        if (result === 'offerAlreadyTaken') {
            res.send('Oferta juz wzieta, potem tu bedzie jakas fajna notyfikacja')
        }

        if (result === 'err') {
            res.send('Wystapil error, potem tu bedzie jakas fajna notyfikacja')
        }

        if (result === 'success') {
            // Wysyla emaila z powiadomieniem
            //Zdobywa email osoby do ktorej nalezy oferta
            const OTHER_EMAIL = await getEmailFromOfferID(db, req.params.offerId);

            emailSendNotification(OTHER_EMAIL, `http://176.122.245.14/redirectChat/${req.params.offerId}`);



            res.redirect(`/chat/${req.params.offerId}/${req.cookies.jwt}`);
        }
    } else {


        const DECODED_TOKEN = await decodeToken(req);
        const useremail = DECODED_TOKEN.email;

        const OFFER_ID = req.params.offerId;

        const otheremail = await getEmailFromOfferID(db, OFFER_ID);



        if (otheremail === useremail) {

            if (checkIfOfferTaken(db, OFFER_ID)) {
                const emailOfPersonWhoTookOffer = await getEmailOfUserWhoTookOffer(db, OFFER_ID);
                const OTHER_USER = await getUserWithEmail(db, emailOfPersonWhoTookOffer);
                const OTHER_NAME = `${OTHER_USER[0].name} ${OTHER_USER[0].surname}`;
                const OTHER_NUMBER = await getNumber(db, emailOfPersonWhoTookOffer);

                let chat = await getChat(db, OFFER_ID);
                res.render('chat.ejs', { youremail: useremail, otheremail: emailOfPersonWhoTookOffer, chat: chat, otherName: OTHER_NAME, otherNumber: OTHER_NUMBER[0].phoneNumber  });

            } else {
                res.send('Error: nikt jeszcze nie przyjal tej oferty')
            }
        } else {
            let authorized = await checkIfYouTookOffer(db, useremail, OFFER_ID);

            if (authorized) {
                const OTHER_USER = await getUserWithEmail(db, otheremail);
                const OTHER_NAME = `${OTHER_USER[0].name} ${OTHER_USER[0].surname}`;
                const OTHER_NUMBER = await getNumber(db, otheremail);

                let chat = await getChat(db, OFFER_ID);
                res.render('chat.ejs', { youremail: useremail, otheremail: otheremail, chat: chat, otherName: OTHER_NAME, otherNumber: OTHER_NUMBER[0].phoneNumber });
            } else {
                res.redirect('/accessDenied')
            }
        }
    }
})





app.get('/myAcceptedOffers', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req);
    const myEmail = DECODED_TOKEN.email;
    const offersIveTaken = await getOffersIveTaken(db, myEmail);
    const LOGGED_AS = await getUser(req);

    res.render('acceptedOffers.ejs', { offersIveTaken: offersIveTaken, loggedAs: LOGGED_AS });
})

app.get('/myOffers', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req);
    const myEmail = DECODED_TOKEN.email;

    const myOffers = await getMyOffers(db, myEmail);
    const LOGGED_AS = await getUser(req);

    res.render('myOffers.ejs', { myOffers: myOffers, loggedAs: LOGGED_AS });
})









var users = [];

io.on('connection', (socket) => {

    socket.on("user_connected", (username) => {
        // zapisz id w arrayu ktore potem jest uzywane do napisania do konkretnej osoby
        users[username] = socket.id;

    });


    socket.on("send_message", async (data) => {
        //autoryzacja 
        const DECODED_TOKEN = await decodeTokenIO(data.jwt);
        const myEmail = DECODED_TOKEN.email;

        if (DECODED_TOKEN === 'err') return;

        if (myEmail !== data.sender) {
            let socketIdSender = users[myEmail];
            io.to(socketIdSender).emit("error_message", 'Error: Problem z autoryzacją1');
            return;
        }

        const emailsAccess = await getEmailsChatAccess(db, myEmail);

        let access = false;

        for (let i = 0; i < emailsAccess.length; i++) {
            if (data.receiver === emailsAccess[i]) {
                access = true;
            }
        }

        if (!access) {
            let socketIdSender = users[myEmail];
            io.to(socketIdSender).emit("error_message", 'Error: Problem z autoryzacją2');
            return;
        }


        const htmlMessage = data.message;
        const textMessage = htmlMessage.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");

        data.message = textMessage;

        //zapisz dane w db

        const saveChatData = [
            `nodesql.${data.offerId}`, // musi byc stringem
            data.sender,
            data.message,
            `${Date.now()}` // musi byc stringem

        ]

        // mozliwe ze musi byc await jesli beda bugi
        saveChat(db, saveChatData);

        // Wysyla wiadomosc do uzytkownka (data.receiver)
        let socketId = users[data.receiver];
        io.to(socketId).emit("new_message", data);

    });


})






//#endregion

// #region oferty

//Przkierowanie do strony głównej po zalogowaniu
app.get('/addOffer', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req);
    const LOGGED_AS = await getUser(req);
    res.render('addOffer.ejs', { email: DECODED_TOKEN.email, message: req.flash('offerMessage'), loggedAs: LOGGED_AS });
})



//Tworzenie oferty
app.post('/addOffer', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req)
    const USER_EMAIL = DECODED_TOKEN.email;

    const testedData = testData(req.body.dogName, req.body.dogType);

    if(!testedData.name){
        req.flash('offerMessage', 'Nieprawdziwe imię')
        res.redirect('/addOffer');
        return;
    } 

    if(!testedData.surname){
        req.flash('offerMessage', 'Nieprawdziwa rasa')
        res.redirect('/addOffer');
        return;
    }
    
    //sprawdza czy wartosci ktore musza byc liczba sa liczba
    if (!isNumeric(req.body.fromMonth) || req.body.fromMonth > 12|| !isNumeric(req.body.fromDay) || req.body.fromDay > 32|| !isNumeric(req.body.fromMinute) || req.body.fromMinute > 60|| isNumeric(!req.body.fromHour) || req.body.fromHour > 24||
        !isNumeric(req.body.toMonth) || req.body.toMonth > 12|| !isNumeric(req.body.toDay) || req.body.toDay > 32 || !isNumeric(req.body.toMinute)  || req.body.toMinute > 60|| !isNumeric(req.body.toHour)  || req.body.toHour > 24 || !isNumeric(req.body.pay) || req.body.pay > 500 ||
        req.body.fromDay <= 0 || req.body.toDay <= 0 || req.body.toMonth < 0 || req.body.fromMonth < 0 || req.body.toHour < 0 || req.body.fromHour < 0 || req.body.toMinute < 0 || req.body.fromMinute < 0 
        ) {
        req.flash('offerMessage', 'Niepoprawna data')
        res.redirect('/addOffer');
    } else {

        // fix na js skrypt w nazwie/gatunku psa
        if (/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g.test(req.body.dogName) || /<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g.test(req.body.dogType)) {
            req.flash('offerMessage', 'Nazwa/gatunek psa zawiera nieodpowiednie znaki')
            res.redirect('/addOffer');
        } else {


            let filename = 'default.png'

            //Jesli uzytkownik przeslal obrazek
            if (req.files) {
                filename = await handleImage(req, res)
            }

            const offerData = [
                req.body.dogName,
                req.body.dogType,
                req.body.fromMonth,
                req.body.fromDay,
                req.body.fromHour,
                req.body.fromMinute,
                req.body.toMonth,
                req.body.toDay,
                req.body.toHour,
                req.body.toMinute,
                req.body.pay,
                filename
            ]



            const OFFER_ID = await addOffer(db, offerData, USER_EMAIL); // to tworzy tez tablice offerid w sql

            const dateToDelete = {
                month: req.body.toMonth,
                day: req.body.toDay,
                hour: req.body.toHour,
                minute: req.body.toMinute

            }

            schdeludeOfferDeletion(dateToDelete, OFFER_ID, db); // usuwa oferte jakis czas po skonczeniu sie
            res.redirect('/myOffers');
        }
    }
});


//Wyswietlanie ofert
app.get('/offers', (req, res) => {
    res.redirect('/offers/0/pay');
})

app.get('/offers/:page/:filter', authenticateToken, async (req, res) => {
    try {
        const page = req.params.page;
        if (page < 0) {
            res.redirect('/offers/0/pay');
        } else {

            let filter = { type: req.params.filter, value: '' };
            const DECODED_TOKEN = await decodeToken(req);
            const user = await getUserWithEmail(db, DECODED_TOKEN.email);


            if (filter.type === 'city') {
                filter = {
                    type: req.params.filter,
                    value: user[0].city
                }
            }
            if (filter.type === 'postCode') {
                filter = {
                    type: req.params.filter,
                    value: user[0].postCode
                }
            }


            const offerList = await getOffersByPage(db, page * 8, filter);

            const LOGGED_AS = await getUser(req);

            const OFFERS_LENGTH = await getOffersLength(db);

            res.render('offers.ejs', { offers: offerList, loggedAs: LOGGED_AS, offersLength: OFFERS_LENGTH, message: req.flash("offerError")});
        }
    } catch (err) {
        console.log(err);
    }
})


app.post('/deleteOffer/:offerId', authenticateToken, async (req, res) => {
    const DECODED_TOKEN = await decodeToken(req)
    const USER_EMAIL = DECODED_TOKEN.email;

    const myOffers = await getMyOffers(db, USER_EMAIL);

    let authorized = false;


    for (let i = 0; i < myOffers.length; i++) {
        if (req.params.offerId == myOffers[i].id) {
            authorized = true;

            const deleteOfferResult = await deleteOffer(db, req.params.offerId);


            if (deleteOfferResult) {
                res.redirect('/myOffers')
            } else {
                res.send('Cos poszlo nie tak, potem to bedzie notyfikacja')
            }

        }
    }

    if (!authorized) {
        res.redirect('/accessDenied');
    }
})



//#endregion






//#region inne sciezki
//Przkierowanie do strony głównej
app.get('/', checkIfNotLoggedIn, (req, res) => {
    res.render('home.ejs');
})




app.get('/image/:filename', authenticateToken, async (req, res) => {
    if (req.params.filename == null && req.params.filename === '') {
        res.redirect('/image/default.png');
    }

    const filePath = './images/' + req.params.filename;

    const file = await getDataFromFile(filePath);

    if (file === 'err') {
        res.redirect('/image/default.png');
        return;
    }


    res.write(file);
    res.end();
})

app.get('/defaultImage.png', async (req, res) => {
    const filePath = './images/pies.png';

    const file = await getDataFromFile(filePath);

    res.write(file);
    res.end();
})



//#endregion

app.get('/menu', authenticateToken, async (req, res) => {
    const LOGGED_AS = await getUser(req);
    res.render('menu.ejs', { loggedAs: LOGGED_AS })
})

app.get('/terms', (req, res) => {
    res.render('terms.ejs')
})

app.get('/edit', authenticateToken, async (req, res) => {
    const LOGGED_AS = await getUser(req);
    const DECODED_TOKEN = await decodeToken(req);
    const useremail = DECODED_TOKEN.email;
    const user = await getUserWithEmail(db, useremail);
    

    res.render('edit.ejs', {loggedAs: LOGGED_AS, email: useremail, telephone: user[0].phoneNumber, postCode: user[0].postCode, city: user[0].city, message: req.flash('editError')});
})

app.post('/edit', authenticateToken, async (req,res) =>{
    const DECODED_TOKEN = await decodeToken(req);
    const useremail = DECODED_TOKEN.email;
    if(req.body.pass1 != '' && req.body.pass1 != req.body.pass2){
        req.flash('editError', 'Hasła sie nie zgadzają');
        res.redirect('/edit');
        return;
    }

    if(req.body.postCode != '' && req.body.citiesDropdown == null){
        req.flash('editError', 'Nieprawidłowy kod pocztowy');
        res.redirect('/edit');
        return;
    }

    
    const testedData = testData("","", req.body.pass1, "", req.body.tel, req.body.postCode);


    if (!testedData.password && req.body.pass1 != '') {
        req.flash('editError', 'Niepoprawne hasło');
        res.redirect('/edit');
        return;
    }

    if (!testedData.telephone && req.body.tel != '') {
        req.flash('editError', 'Niepoprawny numer telefonu');
        res.redirect('/edit');
        return;
    }

    if (!testedData.postCode && req.body.postCode != '') {
        req.flash('editError', 'Nieprawdziwy kod pocztowy');
        res.redirect('/edit');
        return;
    }


    const hashedPassword = await bcrypt.hash(req.body.pass1, 10);
    await editUser(db, req.body, hashedPassword, useremail);


    req.flash('editError', "Pomyślnie zaktualizowano profil");
    res.redirect('/edit');
})





//#region sciezki errorow

app.get('/accessDenied', (req, res) => {
    res.render('accessDenied.ejs')
})


//admin

app.get('/adminPage/bE7oM58iVixOU', (req, res) => {
    res.render('admin.ejs');
})

app.post('/adminGetData', async (req, res) => {
    if (req.body.pass === process.env.ADMIN_PASSWORD) {
        const users = await getUsers(db);
        const offers = await getOffers(db);

        return res.json({ users: users, offers: offers });
    }
})
app.post('/adminBanUser', async (req, res) => {

    if (req.body.pass === process.env.ADMIN_PASSWORD) {
        await banUser(db, req.body.email);
        return res.json({ text: `Pomyślnie zbanowano użytkownika ${req.body.email}` });
    } else {
        return res.json({ text: `Złe hasło` });
    }

})

app.post('/adminDelOffer', async (req, res) => {

    if (req.body.pass === process.env.ADMIN_PASSWORD) {
        await deleteOffer(db, req.body.offerID);
        return res.json({ text: `Pomyślnie usunięto oferte ID ${req.body.offerID}` });
    } else {
        return res.json({ text: `Złe hasło` });
    }

})



//#endregion

async function getUser(req) {
    const DECODED_TOKEN = await decodeToken(req)
    const USER_EMAIL = DECODED_TOKEN.email;
    const USER = await getUserWithEmail(db, USER_EMAIL);

    return `${USER[0].name} ${USER[0].surname}`
}


app.get("*", (req, res) => {
    res.render('404.ejs');
})


//Slucha na podanym porcie
server.listen(port);
module.exports = db;

