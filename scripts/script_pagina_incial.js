const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)

const cantidad_clientes_activos= document.getElementById(id="clien_act")
const cantidad_puntos_totales = document.getElementById(id="punt_totales")
const cantidad_promos_activas = document.getElementById(id="prom_act")
const cantidad_codigos_sin_valid = document.getElementById(id="codigos_sin_v")

async function cargar_cantidades(){
  const [clientes, historial_puntos, promos, codigos_promos] = await Promise.all([
    client.from('Clientes').select('Telef'),
    client.from('Historial_Puntos').select('Cantidad_Puntos'),
    client.from('Promos_puntos').select('id_promo'),
    client.from('Codigos_promos_puntos').select('codigo_canjeado').eq('Canjeado', 0)
  ]);

  if (clientes.error || historial_puntos.error || promos.error || codigos_promos.error) {
    console.error('Error en alguna consulta:', {
      clientes: clientes.error,
      historial_puntos: historial_puntos.error,
      promos: promos.error,
      codigos_promos: codigos_promos.error
    });
  } else {
    cantidad_clientes_activos.textContent = clientes.data.length;

    const totalPuntos = historial_puntos.data.reduce((acc, p) => acc + (p.Cantidad_Puntos || 0), 0);
    cantidad_puntos_totales.textContent = totalPuntos;

    cantidad_promos_activas.textContent = promos.data.length;
    cantidad_codigos_sin_valid.textContent = codigos_promos.data.length;
  }
}
window.onload = cargar_cantidades()