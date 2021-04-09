function hideNotif() {
    setTimeout(() => {
        let redNotif = document.querySelector('.notification')
        if (redNotif != null) {
            redNotif.style.display = "none";
        } else {
            document.querySelector('.notification--green').style.display = "none";
        }
    }, 7000);
}


window.onload=hideNotif();