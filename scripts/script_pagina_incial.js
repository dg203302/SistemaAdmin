const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)

const cantidad_clientes_activos= document.getElementById(id="clien_act")
const cantidad_puntos_totales = document.getElementById(id="punt_totales")
const cantidad_promos_activas = document.getElementById(id="prom_act")
const cantidad_codigos_sin_valid = document.getElementById(id="codigos_sin_v")

async function cargar_cantidades(){
    const [clientes,historial_puntos,promos,codigos_promos] = await Promise.all([
        client.from('Clientes').select('Telef'),
        client.from("Historial_Puntos").select('Cantidad_Puntos'),
        client.from('Promos_puntos').select('id_promo'),
        client.from('Codigos_promos_puntos').select('codigo_canjeado').eq('Canjeado',0)
    ])
    if (clientes.error || historial_puntos.error || promos.error || codigos_promos.error){
        console.error('Error en alguna consulta:', {
            clientes: clientes.error,
            historial_puntos: historial_puntos.error,
            promos: promos.error,
            codigos_promos: codigos_promos.error
        })
    }
    else{
        cont = 0
        for (const clie in clientes.data) {
            if (clie){
                cont+=1;
            }
        }
        cantidad_clientes_activos.textContent = cont;
        cont = 0

        for (const punt in historial_puntos.data){
            cont += punt.Cantidad_puntos;
        }
        cantidad_puntos_totales.textContent = cont
        cont=0

        for(const promo in promos.data){
            if(promo){
                cont+=1
            }
        }
        cantidad_promos_activas.textContent = cont;
        cont=0

        for(const codigs in codigos_promos.data){
            if (codigs){
                cont+=1
            }
        }
        cantidad_codigos_sin_valid.textContent = cont
        cont = 0
    }
}
window.onload = cargar_cantidades()