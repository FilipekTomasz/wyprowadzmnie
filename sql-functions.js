const mysql = require('mysql2');
const jwt = require('jsonwebtoken')


// let user = [
//     req.body.name,         0
//     req.body.surname,      1
//     req.body.email,        2
//     req.body.phoneNumber,  3
//     req.body.postCode,     4
//     hashedPassword         5
//  ]


//if (typeof (homeNum) === 'undefined') user[6] = 0;
//console.log('test' + user[6])


async function addUser(database, user) {

    const USER_EMAIL = user[2];
    const EMAIL_TAKEN = await checkIfEmailTaken(database, USER_EMAIL);

    if (EMAIL_TAKEN === 'no') {
        const result = await addUserToDB(database, user)
        return result;
    } else {
        return EMAIL_TAKEN; // jesli jest zajety to zwraca wiadomosc
    }

}


function checkIfEmailTaken(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => { // sprawdza czy juz istnieje taki email w bazie danych
            if (err) {
                console.log(err);
                resolve('Error: ' + err);
            }
            if (result.length === 0) {
                resolve('no');
            } else { // name taken
                resolve('emailTaken');
            }
        })
    })
}

function addUserToDB(database, user) {
    const USER_PHONE_NUMBER = user[3];
    return new Promise((resolve, reject) => {

        if (!isNumeric(USER_PHONE_NUMBER)) resolve('noNumber') //sprawdza czy numery sa napewno liczba
        else {
            database.query("INSERT INTO users (name,surname,email,phoneNumber,postCode,city,password) VALUES (?)", [user], (err) => { // dodaje uzytkownika jesli imie jest unikalne
                if (err) {
                    resolve('Error: ' + err);
                    throw err;
                }
                resolve('success');
            });
        }
    })
}

function getUserWithEmail(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    })
}


// sprawdza czy string jest numerem
function isNumeric(value) {
    return /^\d+$/.test(value);
}


async function addOffer(database, offerData, userEmail) {
    const userData = await getUserWithEmail(database, userEmail);

    let dataToInsert = offerData;



    //Dodaje wartosci uzytkownika do zmiennej kotra potem insertuje
    dataToInsert.push(userData[0].name);
    dataToInsert.push(userData[0].surname);
    dataToInsert.push(userData[0].email);
    dataToInsert.push(userData[0].postCode);
    dataToInsert.push(userData[0].city);

    //Dodanie oferty do bazy danychs
    return new Promise((resolve, reject) => {
        database.query("INSERT INTO offers (dogName, dogType, fromMonth, fromDay, fromHour,	fromMinute, toMonth, toDay,	toHour, toMinute, pay, filename, name, surname, email, postCode, city) VALUES (?)", [dataToInsert], (err, results) => {
            if (err) { reject(err) };
            resolve(results.insertId)
        })
    }).catch(err => { console.log(err) });
}

function getOffers(database) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers", (err, result) => {
            if (err) throw err;
            resolve(result);
        });
    }).catch((err) => {
        console.log(err);
    })
}
//znajdz uzytkownika o tym emailu, 
function confirmEmail(database, email) {
    return new Promise((resolve) => {
        database.query("UPDATE users SET confirmEmail = true WHERE email = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                reject();
            }
            resolve('success');
        })
    })
}

function changePassword(database, password, email) {


    return new Promise((resolve, reject) => {
        database.query("UPDATE users SET password = ? WHERE email = ?", [password, email], (err, result) => {
            if (err) {
                console.log(err);
                resolve(err);
            }
            resolve('success');
        })
    })
}


function getOffersByPage(database, page, filter) {
    const pageNumber = Number(page);
    if (Number.isNaN(pageNumber)) {
        console.log('PageNumber isnt number')
        return;
    }

    if(filter.type === 'date'){
        return new Promise((resolve, reject) => {
            database.query("SELECT * FROM offers WHERE TakenBy = '' ORDER BY fromMonth DESC, fromDay ASC LIMIT ? ,8", [pageNumber], (err, result) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                resolve(result);
            });
        }).catch((err) => {
            console.log(err);
            resolve(null);
        })
    }



    if(filter.type === 'pay'){
        return new Promise((resolve, reject) => {
            database.query("SELECT * FROM offers WHERE TakenBy = '' ORDER BY pay DESC LIMIT ? ,8", [pageNumber], (err, result) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                resolve(result);
            });
        }).catch((err) => {
            console.log(err);
            resolve(null);
        })
    }

    if(filter.type === 'postCode'){
        return new Promise((resolve, reject) => {
            database.query("SELECT * FROM offers WHERE TakenBy = '' AND postCode = ? ORDER BY pay DESC LIMIT ? ,8", [filter.value, pageNumber], (err, result) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                resolve(result);
            });
        }).catch((err) => {
            console.log(err);
            resolve(null);
        })
    }

    if(filter.type === 'city'){
        return new Promise((resolve, reject) => {
            database.query("SELECT * FROM offers WHERE TakenBy = '' AND city = ? ORDER BY pay DESC LIMIT ? ,8", [filter.value, pageNumber], (err, result) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                resolve(result);
            });
        }).catch((err) => {
            console.log(err);
            resolve(null);
        })
    }

}

async function acceptOffer(database, email, offerId) {

    const promise = await new Promise(async(resolve, reject) => {
        let offerTaken = await checkIfOfferTaken(database, offerId);

        if (!offerTaken) {


            database.query("UPDATE offers SET TakenBy = ? WHERE id = ?", [email, offerId], (err, result) => {
                if (err) {
                    console.log(err);
                    resolve(err);
                }



                resolve('success');
            })

        } else {
            resolve('offerAlreadyTaken');
        }
    })

    if (promise !== 'success') return promise;

    const createTableResult = await createTable(database, offerId);

    return createTableResult;

}

function checkIfOfferTaken(database, offerId) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers WHERE id = ?", [offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false);
            }


            if (result == null || result === '' || result[0] == null) { resolve(false); } else {
                if (result[0].TakenBy != null && result[0].TakenBy != '') {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }

        })
    })
}

function getEmailFromOfferID(database, offerId) {
    return new Promise((resolve, reject) => {
        database.query("SELECT email FROM offers WHERE id = ?", [offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            if (result[0] != null && result[0] != '') {
                resolve(result[0].email)
            } else {
                resolve('err');
            }

        })
    })
}

function getEmailOfUserWhoTookOffer(database, offerId) {
    return new Promise((resolve, reject) => {
        database.query("SELECT TakenBy FROM offers WHERE id = ?", [offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(result[0].TakenBy)
        })
    })
}

function getMyOffers(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers WHERE email = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(result)
        })
    })
}

function getOffersIveTaken(database, email) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers WHERE TakenBy = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(result)
        })
    })
}

function checkIfYouTookOffer(database, email, offerId) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers WHERE TakenBy = ? AND id = ?", [email, offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false);
            }
            if (result.length > 0 && result[0] != null) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
    })
}

async function getEmailsChatAccess(database, email) {
    let offersITook = await new Promise((resolve, reject) => {
        database.query("SELECT email FROM offers WHERE TakenBy = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(result)
        })
    })

    let myAcceptedOffers = await new Promise((resolve, reject) => {
        database.query("SELECT TakenBy FROM offers WHERE email = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err');
            }
            resolve(result)
        })
    })

    let formattedOffersITook = offersITook.map((offer) => {
        return offer.email;
    })

    let formattedMyOffers = myAcceptedOffers.map((offer) => {
        return offer.TakenBy;
    })

    formattedOffersITook.push(...formattedMyOffers);


    return formattedOffersITook;

}

function createTable(database, offerId) {

    let offerIdToString = `${offerId}`

    return new Promise((resolve, reject) => {
        database.query("CREATE TABLE ?? (sender VARCHAR(255), message VARCHAR(255), date VARCHAR(255))", [offerIdToString], (err, result) => {
            if (err) {
                console.log(err);
                resolve('err')
            }
            resolve('success');
        })
    })
}

async function deleteOffer(database, offerId) {

      const offerTaken = await checkIfOfferTaken(database, offerId);

    const deleteOfferByIDResult = await deleteOfferByID(database, offerId);


    if (offerTaken) {
     var deleteTableResult = await deleteTable(database, `${offerId}`);
    } else if (!offerTaken && deleteOfferByIDResult) {
        return true;
    }


     if (deleteTableResult && deleteOfferByIDResult) return true;
    if (deleteOfferByIDResult) return true;

    return false;
}


function deleteTable(database, name) {
    return new Promise((resolve, reject) => {
        database.query("DROP TABLE ??", [name], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false)
            }
            resolve(true);
        })
    })
}

function deleteOfferByID(database, offerId) {
    return new Promise((resolve, reject) => {
        database.query(" DELETE FROM offers WHERE id = ?", [offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false)
            }
            resolve(true);
        })
    })
}

// data = [
//     0 - offerId
//     1 - sender
//     2 - message
//     3 - date
// ] 

function saveChat(database, data) {


    //wtf to nie ma sensu
    const l = [data[1], data[2], data[3]]
    const t = data[0];




    return new Promise((resolve, reject) => {
        database.query("INSERT INTO ?? (sender, message, date) VALUES (?)", [t, l], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false)
            }

            resolve(true);
        })
    })
}

function getChat(database, offerId) {
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM ??", [offerId], (err, result) => {
            if (err) {
                console.log(err);
                resolve(false)
            }

            resolve(result);
        })
    })
}

function getUsers(db) {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM users WHERE confirmEmail = true AND ban = false", (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    })
}

function banUser(database, email) {
    return new Promise((resolve, reject) => {
        database.query("UPDATE users SET ban = 1 WHERE email = ?", [email], (err, result) => {
            if (err) {
                console.log(err);
                resolve(err);
            }
            resolve('success');
        })
    })
}

function getAllOfferEndDate(database) {
    return new Promise((resolve, reject) => {
        database.query("SELECT toMonth, toDay, toHour, toMinute, id FROM offers", (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    }).catch(err => console.log(err))
}

function getOffersLength(database){
    return new Promise((resolve, reject) => {
        database.query("SELECT * FROM offers WHERE TakenBy = '' ", (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result.length);
        })
    }).catch(err => console.log(err))
}

function getNumber(database, email){
    return new Promise((resolve, reject) => {
        database.query("SELECT phoneNumber FROM users WHERE email = ? ", [email], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    }).catch(err => console.log(err))
}

async function editUser(database, data, pass, email){
    if(pass != ''){
        await editPass(database, pass, email);
    }

    if(data.postCode != '' && data.citiesDropdown != ''){
        await editCity(database, data.postCode, data.citiesDropdown, email);
    }
    
    if(data.tel != ''){
        await editTel(database, data.tel, email);
    }
    
    return;
}

function editPass(database, pass, email){
    return new Promise((resolve, reject) => {
        database.query("UPDATE users SET password = ? WHERE email = ? ", [pass, email], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    }).catch(err => console.log(err))
}

function editCity(database, postCode, city, email){
    return new Promise((resolve, reject) => {
        database.query("UPDATE users SET postCode = ?, city = ?  WHERE email = ? ", [postCode, city, email], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    }).catch(err => console.log(err))
}

function editTel(database, telephone, email){
    return new Promise((resolve, reject) => {
        database.query("UPDATE users SET phoneNumber = ? WHERE email = ? ", [telephone, email], (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(result);
        })
    }).catch(err => console.log(err))
}

module.exports = { addUser, addOffer, getOffers, confirmEmail, changePassword, getOffersByPage, isNumeric, getUserWithEmail, acceptOffer, checkIfOfferTaken, getEmailFromOfferID, getEmailOfUserWhoTookOffer, getMyOffers, getOffersIveTaken, checkIfYouTookOffer, getEmailsChatAccess, deleteOffer, saveChat, getChat, getUsers, banUser, getAllOfferEndDate, getOffersLength, getNumber, editUser };