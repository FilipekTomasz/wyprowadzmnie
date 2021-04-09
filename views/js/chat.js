const socket = io();

const chatBox = document.getElementById('chatBox');

const chatForm = document.getElementById('chat-form');

//Biblioteka do dat
dayjs().format()


for (let i = 0; i < chat.length; i++) {
    let div = document.createElement('div');
    if (chat[i].sender === sender) {
        div.innerHTML = `${chat[i].sender} o ${dayjs(Number(chat[i].date)).format('HH:mm')}: ${chat[i].message} <br>`
        div.classList.add('chat__msg')
    } else {
        div.innerHTML = `${chat[i].sender} o ${dayjs(Number(chat[i].date)).format('HH:mm')}: ${chat[i].message} <br>`
        div.classList.add('chat__msga')
    }
    chatBox.appendChild(div);
}

const currentUrl = window.location.href;

const jwt = currentUrl.split('/')[5];
const offerId = currentUrl.split('/')[4];

socket.on("new_message", (data) => {
    const formattedMsg = { username: data.sender, text: data.message, date: data.date, offerId: data.offerId }
    otherOutput(formattedMsg);

})

socket.on("error_message", (msg) => {
    const div = document.createElement('div');
    div.innerHTML = msg

    chatBox.appendChild(div);
})

socket.emit('user_connected', sender);



//Gdy wiadomość zostanie wysłana
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = e.target.elements.msg.value; // zdobywa wiadmość

    const time = dayjs().format('HH:mm');

    //Wysyła wiadomość do serwera
    socket.emit("send_message", {
        sender: sender,
        receiver: receiver,
        message: msg,
        date: time,
        jwt: jwt,
        offerId: offerId
    });

    e.target.elements.msg.value = ''; //czysci inputa
    e.target.elements.msg.focus();

    let formattedMsg = { username: sender, text: msg, date: time, offerId: offerId }
    myOutput(formattedMsg);
})


function myOutput(message) {
    if (message.offerId == offerId) {
        const div = document.createElement('div');
        div.innerHTML = `${message.username} o ${message.date}: ${message.text}`
        div.classList.add('chat__msg');


        chatBox.appendChild(div);
        
        const scroll = document.querySelector(".chatBox__box");
        scroll.scrollTop = scroll.scrollHeight
    }
}

function otherOutput(message) {
    if (message.offerId == offerId) {
        const div = document.createElement('div');
        div.innerHTML = `${message.username} o ${message.date}: ${message.text}`
        div.classList.add('chat__msga');


        chatBox.appendChild(div);

        const scroll = document.querySelector(".chatBox__box");
        scroll.scrollTop = scroll.scrollHeight
    }
}


