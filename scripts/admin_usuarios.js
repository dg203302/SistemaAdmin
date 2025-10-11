const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)
let usuarios = []
const tabla_us = document.getElementById("tabla_usuarios")

window.onload = async function() {
    const { data, error } = await client
    .from("Clientes")
    .select("*");
    if (error) {
        console.error("Error al acceder a la base de datos:", error);
        alert("Error al acceder a la base de datos");
    } else {
        usuarios = data
        actualizar_tabla()
    }
}
function actualizar_tabla(){
    if (!tabla_us) return
    // Limpia cuerpo de la tabla (suponiendo que tabla_us es <tbody> o <table>)
    // Si es <table>, intentamos usar .tBodies[0]
    let body = tabla_us
    if (tabla_us.tagName === 'TABLE') {
        body = tabla_us.tBodies[0] || tabla_us.createTBody()
    }
    // Vaciar filas existentes
    while (body.firstChild) body.removeChild(body.firstChild)

    // Helper: escape HTML
    const esc = (str) => {
        if (str === null || str === undefined) return ''
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }

    // Helper: format fecha (fallbacks for different field names)
    const fmtFecha = (item) => {
        const possible = ['Fecha_creacion']
        let val = null
        for (const k of possible) {
            if (k in item && item[k]) { val = item[k]; break }
        }
        if (!val) return ''
        const d = new Date(val)
        if (isNaN(d)) return esc(val)
        const dd = String(d.getDate()).padStart(2,'0')
        const mm = String(d.getMonth()+1).padStart(2,'0')
        const yy = String(d.getFullYear()).slice(-2)
        const hh = String(d.getHours()).padStart(2,'0')
        const min = String(d.getMinutes()).padStart(2,'0')
        return `${dd}/${mm}/${yy} ${hh}:${min}`
    }

    // For each usuario, build a row
    usuarios.forEach((u) => {
        // Detect fields with fallbacks
        const name = u.Nombre
        const phone = u.Telef
        const saldo = u.Puntos

        const tr = document.createElement('tr')

        const tdName = document.createElement('td')
        tdName.innerHTML = esc(name)
        tr.appendChild(tdName)

        const tdPhone = document.createElement('td')
        tdPhone.innerHTML = esc(phone)
        tr.appendChild(tdPhone)

        const tdFecha = document.createElement('td')
        tdFecha.innerHTML = esc(fmtFecha(u))
        tr.appendChild(tdFecha)

        const tdSaldo = document.createElement('td')
        tdSaldo.innerHTML = esc(saldo)
        tr.appendChild(tdSaldo)

        const tdActions = document.createElement('td')
        tdActions.className = 'row-actions'
        
        const idArg = JSON.stringify(u.Telef)
        tdActions.innerHTML = `
            <button class="icon-btn" aria-label="Editar" onclick="editar_clien(${idArg})">✏️</button>
            <button class="icon-btn" aria-label="Eliminar" onclick="eliminar_clien(${idArg})">🗑️</button>
        `
        tr.appendChild(tdActions)

        body.appendChild(tr)
    })
}