const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)

const cantidad_clientes_activos = document.getElementById('clien_act');
const cantidad_puntos_totales = document.getElementById('punt_totales');
const cantidad_promos_activas = document.getElementById('prom_act');
const cantidad_codigos_sin_valid = document.getElementById('codigos_sin_v');
const cantidad_codigos_validados = document.getElementById('codigos_v');

async function cargar_cantidades(){
  const [clientes, historial_puntos, promos, codigos_promos] = await Promise.all([
    client.from('Clientes').select('Telef'),
    client.from('Historial_Puntos').select('Cantidad_Puntos'),
    client.from('Promos_puntos').select('id_promo'),
    client.from('Codigos_promos_puntos').select('Canjeado')
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
    cantidad_codigos_validados.textContent = codigos_promos.data.filter(c => c.Canjeado === 1).length;
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
  // Ajustar alto del contenedor de tabs para que no corte el contenido
  try { window.adjustTabContentHeight?.(); } catch(_) {}
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
  // also try to expand/collapse the codes tables if present
  const codSin = document.getElementById('tab_sin_validar_body');
  const codVal = document.getElementById('tab_validados_body');

  const expandAll = () => {
    if (bodytabla){ bodytabla.style.maxHeight = 'none'; bodytabla.style.overflowY = 'visible'; }
    if (codSin){ codSin.style.maxHeight = 'none'; codSin.style.overflowY = 'visible'; }
    if (codVal){ codVal.style.maxHeight = 'none'; codVal.style.overflowY = 'visible'; }
    btn.textContent = 'Contraer';
    btn.onclick = collapseAll;
    try { requestAnimationFrame(() => window.adjustTabContentHeight?.()); } catch(_) {}
  };

  const collapseAll = () => {
    if (bodytabla){ bodytabla.style.maxHeight = 'calc(44px * 3)'; bodytabla.style.overflowY = 'hidden'; }
    if (codSin){ codSin.style.maxHeight = 'calc(44px * 3)'; codSin.style.overflowY = 'hidden'; }
    if (codVal){ codVal.style.maxHeight = 'calc(44px * 3)'; codVal.style.overflowY = 'hidden'; }
    btn.textContent = 'Expandir';
    btn.onclick = btnexp;
    // readjust height when collapsing
    try { window.adjustTabContentHeight?.(); } catch(_) {}
  };

  expandAll();
}
// Ajusta la altura visible del contenedor de tabs al alto del panel activo
function adjustTabContentHeight(){
  const container = document.querySelector('.tabs .tab-content');
  const active = document.querySelector('.tab-panel.active');
  if (!container || !active) return;
  // medir altura visible del contenido interno (no el scroll total)
  const style = window.getComputedStyle(active);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const inner = active.querySelector('.table-wrap') || active.firstElementChild || active;
  const visibleH = (inner.clientHeight || inner.scrollHeight) + padTop + padBottom;
  container.style.height = visibleH + 'px';
}

document.querySelectorAll(".tab-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const target = document.querySelector(btn.dataset.tabTarget);
            if (target) target.classList.add("active");
            try { window.adjustTabContentHeight?.(); } catch(_) {}
          });
        });

window.adjustTabContentHeight = adjustTabContentHeight;

window.onload = async function(){
  cargar_cantidades()
  cargar_actividad_reciente()
  cargar_codigos_validados_no_validados()
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

  const now = new Date();
  const tzOffset = -now.getTimezoneOffset(); // minutes
  const sign = tzOffset >= 0 ? '+' : '-';
  const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19); // YYYY-MM-DDTHH:mm:ss
  const localWithOffset = `${local}${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;

  const { data, error } = await client
    .from('Codigos_promos_puntos')
    .update({ Canjeado: 1, Fecha_validacion: localWithOffset })
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
  cargar_cantidades();
  recargar_tablas();
}
async function cargar_codigos_validados_no_validados(){
  const {data,error} = await client
  .from('Codigos_promos_puntos')
  .select('*')
  .order("fecha_creac", { ascending: false });
  if (error){
    Swal.fire({
      title: 'Error',
      text: 'Error al cargar los códigos',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
  const contenedor_cod_sin_val = document.getElementById('tab_sin_validar_body');
  const contenedor_cod_val = document.getElementById('tab_validados_body');
  if (!contenedor_cod_sin_val || !contenedor_cod_val) return;
  contenedor_cod_sin_val.innerHTML = '';
  contenedor_cod_val.innerHTML = '';
  for (const cod of data){
    if (cod.Canjeado === 0){
      const tr = document.createElement('tr');
      const tdCod = document.createElement('td');
      tdCod.style.textAlign = "center";
      tdCod.textContent = cod.codigo_canjeado ?? '';
      tr.appendChild(tdCod);
      const tdFec = document.createElement('td');
      tdFec.style.textAlign = "center";
      tdFec.textContent = cod.fecha_creac ? new Date(cod.fecha_creac).toLocaleString() : '';
      tr.appendChild(tdFec);
      contenedor_cod_sin_val.appendChild(tr);
    }
    else{
      const tr = document.createElement('tr');
      const tdCod = document.createElement('td');
      tdCod.style.textAlign = "center";
      tdCod.textContent = cod.codigo_canjeado ?? '';
      tr.appendChild(tdCod);
      const tdFec = document.createElement('td');
      tdFec.style.textAlign = "center";
      tdFec.textContent = cod.Fecha_validacion ? new Date(cod.Fecha_validacion).toLocaleString() : '';
      tr.appendChild(tdFec);
      contenedor_cod_val.appendChild(tr);
    }
  }
}
  async function recargar_tablas(){
    cargar_actividad_reciente()
    cargar_codigos_validados_no_validados()
  }