const fs = require('fs');


function getExtension(filename) {
    return filename.substring(filename.indexOf('.'));
}

function checkMimetype(file) {
    if (file.mimetype == "image/jpeg" || file.mimetype == "image/png" || file.mimetype == "image/jpg") {
        return true;
    } else {
        return false;
    }
}

function getDataFromFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, function (err, data) {
            if (err) {
                console.log(err);
                resolve('err');
            } else {
                resolve(data)
            }
        })
    })
}

function handleImage(req, res) {
    return new Promise((resolve, reject) => {
        const file = req.files.image;
        const extension = getExtension(file.name);
        const fileName = Date.now() + extension;

        if (file.truncated) {
            req.flash('offerMessage', 'Plik jest zbyt duży, max=1mb')
            res.redirect('/addOffer');
            resolve('default.png');
        }
        else {
            if (!checkMimetype(file)) {
                req.flash('offerMessage', 'Plik musi być .png, .jpg lub .jpeg')
                res.redirect('/addOffer');
                resolve('default.png');
            }
            else {


                file.mv('./images/' + fileName, function (err) {
                    if (err){
                        console.log(err);
                        resolve('default.png');
                    }
                    else {
                        resolve(fileName);
                    }
                });

            }
        }
    })
}


module.exports = { getExtension, checkMimetype, getDataFromFile, handleImage };
