window.addEventListener('scroll', () => { 
    if(window.scrollY > 275){
        document.getElementById('arrow').style.opacity = "1";
    }else{
        document.getElementById('arrow').style.opacity = "0";
    }
})
document.querySelector('#arrow').addEventListener("click", function () {
    window.scrollTo(0,0);
})