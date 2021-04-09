function testData(name = 'a', surname = 'a', password = '', email = '', telephone = '', postCode = '') {
    let returnData = {
        name: false,
        surname: false,
        password: false,
        email: false,
        telephone: false,
        postCode: false
    }

    if (password.length > 7 && password.length < 255) {
        returnData.password = true;
    }

    if (name.match(/[ą-żĄ-Ża-zA-Z-]+/gi) != null) {
        if (name.match(/[ą-żĄ-Ża-zA-Z-]+/gi)[0] == name && name.length > 2 && name.length < 15) {
            returnData.name = true;
        }
    }

    if (surname.match(/[ą-żĄ-Ż a-zA-Z-]+/gi) != null) {
        if (surname.match(/[ą-ż Ą-Ża-zA-Z-]+/gi)[0] == surname && surname.length > 2 && surname.length < 15) {
            returnData.surname = true;
        }
    }

    if (email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/) != null) {
        if (email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)[0] == email && email.length < 60) {
            returnData.email = true;
        }
    }

  //  if (telephone.match(/[+][0-9]{2}[ ]{1}[0-9]{3}[-]{1}[0-9]{3}[-]{1}[0-9]{3}/) != null || telephone.match(/[+][0-9]{2}[ ]{1}[0-9]{3}[ ]{1}[0-9]{3}[ ]{1}[0-9]{3}/) != null) {
    //    returnData.telephone = true;
    //}
    if(telephone.length == 9){
        returnData.telephone = true;
    }

    if (postCode.match(/[0-9]{2}[-][0-9]{3}/) != null) {
        if (postCode.match(/[0-9]{2}[-][0-9]{3}/)[0] == postCode) {
            returnData.postCode = true;
        }
    }

    return returnData;
}

module.exports = testData;
