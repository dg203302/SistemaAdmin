import { hash_alfanum } from "/scripts/hashing.js"

window.onload = function(){
    if (sessionStorage.getItem("ingreso")){
        window.location.href = "/Templates/pagina_inicio.html"
    }
}

const contra_admin = "ContraAdmin123"
document.getElementById("Form-admin").addEventListener("submit", function(eve){
    eve.preventDefault()
    if (hash_alfanum(document.getElementById("contra-admin").value) === hash_alfanum(contra_admin)){
        sessionStorage.setItem("ingreso",true);
        window.location.href = "/Templates/pagina_inicio.html"
    }
    else{
        alert("contraseña incorrecta!")
    }
})