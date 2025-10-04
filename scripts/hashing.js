export function hash_alfanum(contrasenia){
    let hash = 0;
    for (let i = 0; i < contrasenia.length; i++) {
        hash = ((hash << 5) - hash) + contrasenia.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}