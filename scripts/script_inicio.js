const HASH="9d96fe8ef9239d2b6e2b9e1e163a68a23ab70d72baa74f5fdf1aec920a078d1d"

window.onload = function(){
    if (sessionStorage.getItem("ingreso")){
        window.location.href = "/templates/pagina_inicio.html"
    }
}
document.getElementById("Form-admin").addEventListener("submit", function(eve){
    eve.preventDefault()
    if ((CryptoJS.SHA256(document.getElementById("contra-admin").value).toString()) === HASH){
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