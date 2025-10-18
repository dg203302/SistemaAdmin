import { hash_alfanum } from "/scripts/hashing.js"

window.onload = function(){
    if (sessionStorage.getItem("ingreso")){
        window.location.href = "/templates/pagina_inicio.html"
    }
}

const contra_admin = "lote2025"
document.getElementById("Form-admin").addEventListener("submit", function(eve){
    eve.preventDefault()
    if (hash_alfanum(document.getElementById("contra-admin").value) === hash_alfanum(contra_admin)){
    sessionStorage.setItem("ingreso",true);
    window.location.href = "/templates/pagina_inicio.html"
    }
    else{
        if (typeof Swal !== "undefined" && Swal && typeof Swal.fire === "function"){
            Swal.fire({
                title: "Contraseña incorrecta",
                text: "Por favor, inténtalo de nuevo.",
                icon: "error",
                confirmButtonText: "Entendido"
            });
            return;
        } else {
            alert("Contraseña incorrecta. Por favor, inténtalo de nuevo.");
            return;
        }
    }   
})