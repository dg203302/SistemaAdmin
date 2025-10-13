export function encriptar(texto) {
  return texto
    .split("")
    .map(c => c.charCodeAt(0))
    .join("-");
}
export function desencriptar(textoEncriptado) {
  return textoEncriptado
    .split("-")
    .map(num => String.fromCharCode(parseInt(num)))
    .join("");
}