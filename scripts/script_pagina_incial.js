const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)

const cantidad_clientes_activos = document.getElementById('clien_act');
const cantidad_puntos_totales = document.getElementById('punt_totales');
const cantidad_promos_activas = document.getElementById('prom_act');
const cantidad_codigos_sin_valid = document.getElementById('codigos_sin_v');

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

async function cargar_actividad_reciente(){
  const contenedor_act = document.getElementById('actividadBody');
  const {data,error} = await client
  .from('Historial_Puntos')
  .select('*')
  .order("Fecha_Asing", { ascending: false });
  
  if (error){
    console.error('error al cargar la actividad reciente', error);
    return;
  }
  if (!contenedor_act) return;
  contenedor_act.innerHTML = '';
  for (const act of data){
    contenedor_act.appendChild(await renderiz_act(act));
  }
}

async function renderiz_act(actividad){
  // actividad is expected to have: Telef_cliente, Fecha_Asing, Cantidad_Puntos, Monto_gastado
  const tr = document.createElement('tr');

  const tdNom = document.createElement('td');
  tdNom.style.textAlign = "center";
  tdNom.textContent = await obtnom(actividad.Telef_cliente);
  tr.appendChild(tdNom);

  const tdTel = document.createElement('td');
  tdTel.style.textAlign = "center";
  tdTel.textContent = actividad.Telef_cliente ?? actividad.Telef ?? '';
  tr.appendChild(tdTel);

  const tdFecha = document.createElement('td');
  tdFecha.style.textAlign = "center";
  tdFecha.textContent = actividad.Fecha_Asing ? new Date(actividad.Fecha_Asing).toLocaleString() : (actividad.Fecha_asignacion ? new Date(actividad.Fecha_asignacion).toLocaleString() : '');
  tr.appendChild(tdFecha);

  const tdPuntos = document.createElement('td');
  tdPuntos.style.textAlign = "center";
  tdPuntos.textContent = (actividad.Cantidad_Puntos ?? actividad.Cantidad_puntos ?? '') + '';
  tr.appendChild(tdPuntos);

  const tdMonto = document.createElement('td');

  tdMonto.style.textAlign = "center";
  tdMonto.textContent = (actividad.Monto_gastado ?? actividad.Monto_gasto ?? actividad.Monto ?? '') + '';
  tr.appendChild(tdMonto);

    return tr;
  }

async function obtnom(tele){
  const {data,error} = await client
  .from("Clientes")
  .select("Nombre")
  .eq("Telef",tele)
  .single()
  if(error){
    console.log(error)
  }
  else{
    return data.Nombre;
  }
}

function btnexp(){
  let btn=document.getElementById("boton_exp")
  let bodytabla = document.getElementById("actividadBody")
  if (!btn || !bodytabla) return
  bodytabla.style.maxHeight = "none";
  bodytabla.style.overflowY = "visible";
  btn.textContent = "Contraer"
  btn.onclick = function (){
    let btn=document.getElementById("boton_exp")
    let bodytabla = document.getElementById("actividadBody")
    if (!btn || !bodytabla) return
    bodytabla.style.maxHeight = "calc(44px * 3)";
    bodytabla.style.overflowY = "hidden";
    btn.textContent = "Expandir"
    btn.onclick = btnexp;
  }
}
window.onload = async function(){
  cargar_cantidades()
  cargar_actividad_reciente()
}

document.getElementById("validarCodigos").onclick = async function(){
  const { value: CodigoPromo, isConfirmed } = await Swal.fire({
    title: 'Ingresa el codigo de la promoción',
    input: 'text',
    inputPlaceholder: 'Código de promoción',
    inputAttributes: { autocapitalize: 'off' },
    showCancelButton: true,
    confirmButtonText: 'Validar',
    inputValidator: (value) => !value && 'El código es requerido'
  });

  if (!isConfirmed || !CodigoPromo) {
    return;
  }

  const { data, error } = await client
  .from('Codigos_promos_puntos')
  .update({ Canjeado: 1 })
  .eq('codigo_canjeado', CodigoPromo)
  .eq('Canjeado', 0)
  .select();

  if (error) {
    Swal.fire({
      title: 'Error',
      text: 'Error al validar el código',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  if (!data || data.length === 0) {
    Swal.fire({
      title: 'No válido',
      text: 'Código no encontrado o ya fue canjeado',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  Swal.fire({
    title: 'Éxito',
    text: 'Código validado correctamente',
    icon: 'success',
    confirmButtonText: 'OK'
  });
}