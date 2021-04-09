
window.addEventListener('load', () => { 
    document.getElementById('verifyForm').addEventListener('submit', e => {
        e.preventDefault();
        console.log(e);
        console.log('test');
        const name = document.querySelector('#name').value;
        const surname = document.querySelector('#surname').value;
        const email = document.querySelector('#email').value;
        const phoneNumber = document.querySelector('#phoneNumber').value;
        const postCode = document.querySelector('#inputKod').value;
        const city = document.querySelector('#citiesDropdown').value;
        const password = document.querySelector('#password').value;
        const password2 = document.querySelector('#password2').value;
        const captcha = document.querySelector('#g-recaptcha-response').value;
    
        return fetch('/register', {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify({ name, surname, email, phoneNumber, postCode, city, password, password2, captcha })
        }).then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = "/confirmEmail";
                } else {
                    window.location.href = "/register";
                }
    
            });
    })
}, false);
