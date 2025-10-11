const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)
const usuarios = []
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
function 