const cron = require('node-cron');
const { deleteOffer, getAllOfferEndDate } = require('./sql-functions')
const dayjs = require('dayjs');
const objectSupport = require("dayjs/plugin/objectSupport");
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
dayjs.extend(objectSupport);



const DELETE_OFFER_DELAY = 24; // godzin

function schdeludeOfferDeletion(oldDate, id, db) {
    const date = addDelay(oldDate);

    const endDate = new Date(new Date().getFullYear(), date.month - 1, date.day, date.hour, date.minute);
    const CURRENT_DATE = Date.now();




    if (CURRENT_DATE > endDate) {
        console.log(`uswanie oferty ID:${id}`);
        deleteOffer(db, id);
    }

    cron.schedule(`${date.minute} ${date.hour} ${date.day} ${date.month} *`, () => {
        console.log(`uswanie oferty ID:${id}`)

        deleteOffer(db, id);
    });

}

function addDelay(date) {
    const delayDate = dayjs(date).add(DELETE_OFFER_DELAY, 'hour');
    const newDate = {
        month: Number(dayjs(delayDate).format('M')) - 1, // -1 bo cos tam liczy miesiace 0-11 a cos 1-12
        day: Number(dayjs(delayDate).format('D')),
        hour: Number(dayjs(delayDate).format('H')),
        minute: date.minute
    }
    return newDate;

}

async function scheludeAll(db) {
    const offerData = await getAllOfferEndDate(db);



    for (let i = 0; i < offerData.length; i++) {
        const id = offerData[i].id;
        const date = {
            month: offerData[i].toMonth,
            day: offerData[i].toDay,
            hour: offerData[i].toHour,
            minute: offerData[i].toMinute

        }


        schdeludeOfferDeletion(date, id, db);
    }
}




module.exports = { schdeludeOfferDeletion, scheludeAll }