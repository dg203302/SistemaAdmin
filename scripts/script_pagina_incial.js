const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E'
const { createClient } = supabase
const client = createClient(supabaseUrl, supabaseKey)

const cantidad_clientes_activos = document.getElementById('clien_act');
const cantidad_puntos_totales_asign = document.getElementById('punt_totales_asign');
const cantidad_puntos_totales_rest = document.getElementById('punt_totales_rest');
const cantidad_promos_activas = document.getElementById('prom_act');
const cantidad_codigos_sin_valid = document.getElementById('codigos_sin_v');
const cantidad_codigos_validados = document.getElementById('codigos_v');

async function cargar_cantidades(){
  const [clientes, promos, codigos_promos] = await Promise.all([
    client.from('Clientes').select('Telef'),
    client.from('Promos_puntos').select('id_promo'),
    client.from('Codigos_promos_puntos').select('Canjeado')
  ]);

  if (clientes.error || promos.error || codigos_promos.error) {
    console.error('Error en alguna consulta:', {
      clientes: clientes.error,
      promos: promos.error,
      codigos_promos: codigos_promos.error
    });
  } else {
    cantidad_clientes_activos.textContent = clientes.data.length;

    cantidad_promos_activas.textContent = promos.data.length;
    cantidad_codigos_sin_valid.textContent = codigos_promos.data.filter(c => c.Canjeado === 0).length;
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
  // cargar y renderizar botón de sorteo primero
  await cargar_btn_sorteo()
  // luego verificar si debe mostrarse el botón de validar código ganador
  await verificar_ganador_existente()
}


// Wire the "Validar codigo ganador" quick action
document.getElementById('validarCodigoGanador')?.addEventListener('click', async (ev) => {
  ev.preventDefault();
  await validarCodigoGanadorFlow();
});

// Prompt for a winning code, validate against codigos tables and remove if matched
async function validarCodigoGanadorFlow(){
  const { value: codigoIngresado, isConfirmed } = await Swal.fire({
    title: 'Validar código ganador',
    input: 'text',
    inputPlaceholder: 'Ingrese código ganador',
    showCancelButton: true,
    confirmButtonText: 'Validar',
    cancelButtonText: 'Cancelar',
    inputValidator: (v) => !v && 'El código es requerido'
  });

  if (!isConfirmed || !codigoIngresado) return;

  const cleaned = String(codigoIngresado).trim();
  if (!cleaned) return;

  // Try to find and delete the code in candidate tables. Returns true when deleted.
  async function findAndDelete(){
      try{
        // try to find exact-match in likely code columns
        const { data: found, error: selErr } = await client.from('Codigos_sorteos').select('*').or('codigo_sorteo.eq.' + cleaned).limit(1).single();
        if (!selErr && found){
          // delete the exact matching row(s) for that code
          const { error: delErr } = await client.from('Codigos_sorteos').delete().eq('codigo_sorteo', cleaned);
          if (delErr){
            console.error('Error al eliminar en', 'Codigos_sorteos', delErr);
            return { ok: false, table: 'Codigos_sorteos', error: delErr };
          }
          return { ok: true, table: 'Codigos_sorteos' };
        }
      }catch(e){
        return { ok: false };
      }
    }
  const result = await findAndDelete();

  if (result.ok){
    await Swal.fire({ title: 'Código validado', text: `Disfrute de su premio`, icon: 'success' });
    cargar_cantidades();
    recargar_tablas();
    // Try to remove the Aviso that was created announcing the sorteo winner
    try{
      const { error: delAvisoErr } = await client.from('Avisos')
        .delete()
        .eq('titulo_aviso', 'Sorteo finalizado')
        .ilike('descripcion_aviso', `%${cleaned}%`);
      if (delAvisoErr){
        console.error('Error al eliminar aviso de sorteo:', delAvisoErr);
      }
    } catch(e){
      console.error('Exception al eliminar aviso de sorteo:', e);
    }
    // refresh the page to ensure UI/state consistency
    try { window.location.reload(); } catch(_) { }
    return;
  }
  await Swal.fire({ title: 'No encontrado', text: 'El código no coincide con ningún registro de sorteo', icon: 'warning' });
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
      const tdNom = document.createElement('td');
      tdNom.style.textAlign = "center";
      tdNom.textContent = await obtNomClie(cod.Telef) ?? '';
      tr.appendChild(tdNom);
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
      const tdNom = document.createElement('td');
      tdNom.style.textAlign = "center";
      tdNom.textContent = await obtNomClie(cod.Telef) ?? '';
      tr.appendChild(tdNom);
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

async function obtNomClie(tele){
  const {data,error} = await client
  .from("Clientes")
  .select("Nombre")
  .eq("Telef",tele)
  .single();

  if (error) {
    Swal.fire({
      title: 'Error',
      text: 'Error al cargar los Nombres de Clientes',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return null;
  }
  return data ? data.Nombre : null;
}
// Escapa HTML para insertar texto en HTML seguro
function escapeHtml(s){
  const str = s == null ? '' : String(s);
  return str.replace(/[&<>"]|'/g, function(ch){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
  });
}
function escapeAttr(s){
  const str = s == null ? '' : String(s);
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function limpiar_busqueda(){
  const input = document.getElementById('buscador_codigo');
  if (!input) return;
  input.value = '';
  // Mostrar todas las filas al limpiar
  document.querySelectorAll('#actividadBody tr, #tab_sin_validar_body tr, #tab_validados_body tr').forEach(f => {
    f.style.display = '';
  });
}
function buscar_codigo(){
  const input = document.getElementById('buscador_codigo');
  if (!input) return;
  const valor = input.value.trim();
  if (!valor) return;
  const q = valor.toLowerCase();
  let filas_historial = document.querySelectorAll('#actividadBody tr');
  let filas_cod_sin_val = document.querySelectorAll('#tab_sin_validar_body tr');
  let filas_cod_val = document.querySelectorAll('#tab_validados_body tr');
  filas_historial.forEach(fila => {
    const nombre = (fila.cells[0]?.textContent || '').toLowerCase();
    const telefono = (fila.cells[1]?.textContent || '').toLowerCase();
    if (nombre.includes(q) || telefono.includes(q)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
  filas_cod_sin_val.forEach(fila => {
    const nombre = (fila.cells[0]?.textContent || '').toLowerCase();
    const telefono = (fila.cells[1]?.textContent || '').toLowerCase();
    if (nombre.includes(q) || telefono.includes(q)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
  filas_cod_val.forEach(fila => {
    const nombre = (fila.cells[0]?.textContent || '').toLowerCase();
    const telefono = (fila.cells[1]?.textContent || '').toLowerCase();
    if (nombre.includes(q) || telefono.includes(q)) {
      fila.style.display = '';
    } else {
      fila.style.display = 'none';
    }
  });
}

async function cargar_btn_sorteo(){
  const { data, error } = await client
  .from('Promos_puntos')
  .select('Nombre_promo')
  .ilike('Nombre_promo', '%sorteo%');
  if (error) {
    Swal.fire({
      title: 'Error',
      text: 'Error al cargar el sorteo activo',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return null;
  }
  const sorteo = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const contenedorSorteo = document.getElementById('Sorteo');
  const btnSorteo = document.getElementById('span_sorteo');
  if (sorteo && btnSorteo && contenedorSorteo) {
    btnSorteo.textContent = "Realizar " + (sorteo.Nombre_promo || '');
    contenedorSorteo.style.display = '';
    // Wire click to iniciar sorteo
    contenedorSorteo.onclick = (ev) => { ev.preventDefault(); iniciarSorteoFlow(); };
    return;
  } else {
    if (contenedorSorteo) contenedorSorteo.style.display = 'none';
    return null;
  }
}

// Helper: obtiene códigos para sorteo. Intenta tabla 'Codigos_sorteo' y si no existe usa 'Codigos_promos_puntos'
async function getSorteoCodes(){
  // Try main candidate
  try{
    const tryTables = [
      // table name kept as-is; mapping normalizes to { codigo, telef }
      { table: 'Codigos_sorteo', map: r => ({ codigo: r.codigo_sorteo ?? r.codigo ?? r.codigo_canjeado ?? r.codigo_canjeado, telef: r.Telef ?? r.telef ?? r.telefono ?? r.telefono_cliente ?? null }) },
      { table: 'Codigos_sorteos', map: r => ({ codigo: r.codigo_sorteo ?? r.codigo ?? r.codigo_canjeado, telef: r.Telef ?? r.telef ?? r.telefono }) }
    ];
    for (const candidate of tryTables){
      try{
        const { data, error } = await client.from(candidate.table).select('*');
        if (!error && Array.isArray(data) && data.length > 0){
          const mapped = data.map(candidate.map).filter(x => x && (x.codigo || x.codigo === 0));
          // normalize codigo/telef to strings
          return mapped.map(m => ({ codigo: m.codigo == null ? '' : String(m.codigo), telef: m.telef == null ? '' : String(m.telef) }));
        }
      } catch(e){ /* ignore and try next */ }
    }
  } catch(e){ console.error(e); }
  return [];
}

function pickRandom(arr){
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// pick n unique random elements from array
function pickRandomMultiple(arr, n){
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const copy = arr.slice();
  const out = [];
  const limit = Math.min(n, copy.length);
  for (let i=0;i<limit;i++){
    const idx = Math.floor(Math.random()*copy.length);
    out.push(copy.splice(idx,1)[0]);
  }
  return out;
}

async function iniciarSorteoFlow(){
  const confirm = await Swal.fire({
    title: 'Iniciar sorteo',
    text: '¿Deseas confirmar la realización del sorteo?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirmar realización',
    cancelButtonText: 'Cancelar'
  });
  if (!confirm.isConfirmed) return;

  const codes = await getSorteoCodes();
  if (!codes || codes.length === 0){
    await Swal.fire({ title: 'Sin códigos', text: 'No se encontraron códigos para sortear.', icon: 'warning' });
    return;
  }

  // pick 3 unique winners
  if (codes.length < 3){
    await Swal.fire({ title: 'No hay suficientes códigos', text: 'Se requieren al menos 3 códigos para realizar el sorteo.', icon: 'warning' });
    return;
  }
  let currentWinners = pickRandomMultiple(codes, 3);

  // Function to show winner modal and handle actions
  async function showWinnerModal(){
    // build html listing the three winners
    const parts = [];
    for (let i=0;i<currentWinners.length;i++){
      const w = currentWinners[i];
      const name = w.telef ? (await obtNomClie(w.telef)) : '';
      parts.push(`<div style="margin-bottom:8px"><strong>#${i+1}:</strong> <span style=\"font-weight:700\">${escapeHtml(w.codigo || '')}</span> <span style=\"color:#666\">${escapeHtml(name || '')}</span></div>`);
    }
    const html = `<div style="text-align:center;">${parts.join('')}</div>`;

    const res = await Swal.fire({
      title: 'Ganadores',
      html,
      showCancelButton: true,
      showDenyButton: true,
      denyButtonText: 'Cambiar ganador',
      confirmButtonText: 'Terminar sorteo',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      width: '600px'
    });

    if (res.isDenied){
      // Show selection list
      await showSelectionList();
      // After selection, show winner modal again
      await showWinnerModal();
      return;
    }

    if (res.isConfirmed){
      const codesArr = currentWinners.map(w => w.codigo);
      await Swal.fire({ title: 'Sorteo finalizado', text: `Ganadores: ${codesArr.join(', ')}`, icon: 'success' });
      // create an Aviso announcing the winners
      try{
        await crearAvisoSorteo(currentWinners);
      } catch(e){ console.error('Error creando aviso de sorteo:', e); }
      await cleanupCodigosSorteo(codesArr);
      await eliminar_sorteo();
      // actualizar visibilidad del botón de validar (en caso de que no se haga reload)
      try{ await verificar_ganador_existente(); } catch(e){ /* ignore */ }
      window.location.reload();
      return;
    }
    // else cancelled
  }

  async function showSelectionList(){
    // Build HTML table of participants
    // Enrich with names
    const enriched = [];
    for (const c of codes){
      const nombre = c.telef ? (await obtNomClie(c.telef)) : '';
      enriched.push({ ...c, nombre: nombre || '' });
    }

    const rowsHtml = enriched.map((e, idx) => `
      <tr>
        <td style="padding:6px 8px">${escapeHtml(e.nombre) || ''}</td>
        <td style="padding:6px 8px">${escapeHtml(e.codigo)}</td>
        <td style="padding:6px 8px">
          <button class="select-winner-btn btn" data-idx="${idx}" data-winner-target="0">Como ganador 1</button>
          <button class="select-winner-btn btn" data-idx="${idx}" data-winner-target="1">Como ganador 2</button>
          <button class="select-winner-btn btn" data-idx="${idx}" data-winner-target="2">Como ganador 3</button>
        </td>
      </tr>
    `).join('');

    const listHtml = `
      <div style="max-height:50vh;overflow:auto;margin-top:6px">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th>Nombre</th><th>Código</th><th></th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    await Swal.fire({
      title: 'Seleccionar ganador',
      html: listHtml,
      showCancelButton: true,
      cancelButtonText: 'Volver',
      allowOutsideClick: false,
      didOpen: () => {
        // attach listeners
        document.querySelectorAll('.select-winner-btn').forEach(btnEl => {
          btnEl.addEventListener('click', (ev) => {
            const idx = Number(btnEl.getAttribute('data-idx'));
            const target = Number(btnEl.getAttribute('data-winner-target'));
            if (Number.isNaN(idx) || Number.isNaN(target) || !enriched[idx]) return;
            const selected = enriched[idx];
            const selCode = String(selected.codigo ?? '');
            // find if the selected participant is already one of the current winners
            const existingIndex = currentWinners.findIndex(w => String(w.codigo ?? '') === selCode);
            if (existingIndex === -1){
              // not present -> assign to target
              currentWinners[target] = selected;
            } else if (existingIndex === target){
              // already in the same position -> nothing to do
            } else {
              // already selected in another position -> swap to avoid duplicates
              const temp = currentWinners[target];
              currentWinners[target] = currentWinners[existingIndex];
              currentWinners[existingIndex] = temp;
            }
            Swal.close();
          });
        });
      }
    });
  }

  await showWinnerModal();
}

async function cleanupCodigosSorteo(codigos_ganadores){
  if (!client) return;
  try {
    // Normalizar ganadores a strings
    const winners = Array.isArray(codigos_ganadores) ? codigos_ganadores.map(c => String(c).trim()) : [String(codigos_ganadores).trim()];
    const winnersSet = new Set(winners.filter(x => x !== ''));

    // Leer todos los códigos existentes
    const { data, error: selErr } = await client.from('Codigos_sorteos').select('codigo_sorteo');
    if (selErr){
      console.error('Error leyendo Codigos_sorteos:', selErr);
      return;
    }
    const all = Array.isArray(data) ? data.map(r => String(r.codigo_sorteo == null ? '' : r.codigo_sorteo)) : [];

    // Calcular no-ganadores
    const toDelete = all.filter(c => c !== '' && !winnersSet.has(String(c).trim()));
    if (toDelete.length === 0){
      console.log('cleanupCodigosSorteo: no hay códigos para eliminar');
      return;
    }

    // Eliminar en una sola llamada (o en lotes si hace falta)
    const { error: delErr } = await client.from('Codigos_sorteos').delete().in('codigo_sorteo', toDelete);
    if (delErr){
      console.error('Error al eliminar no-ganadores en Codigos_sorteos:', delErr);
      await Swal.fire({ title: 'Error', text: 'No se pudieron eliminar las filas de la tabla de códigos de sorteo.', icon: 'error', confirmButtonText: 'OK' });
      return;
    }
    console.log(`Limpieza: eliminados ${toDelete.length} códigos no-ganadores en Codigos_sorteos`);
    return;
  } catch(err){
    console.error(err);
    await Swal.fire({ title: 'Error', text: 'No se pudieron eliminar las filas de la tabla de códigos de sorteo.', icon: 'error', confirmButtonText: 'OK' });
    return;
  }
}
async function eliminar_sorteo(){
  if (!client) return;
  try{
      const { error } = await client.from("Promos_puntos")
      .delete()
      .ilike("Nombre_promo", "%sorteo%");
      if (error){
        console.error('Error al eliminar el sorteo:', error);
        await Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el sorteo activo.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return;
      }
      console.log(`Sorteo eliminado de Promos_puntos`);
      // Recargar botón de sorteo
  await cargar_btn_sorteo();
  // actualizar visibilidad del botón de validar (si corresponde)
  try{ await verificar_ganador_existente(); } catch(e){ /* ignore */ }
      return;
    } catch(err){
      console.error(err);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo eliminar el sorteo activo.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
}

async function verificar_ganador_existente(){
  const btn = document.getElementById('validarCodigoGanador');
  if (!btn) return false;
  try{
    // Si aún existe una promo que contiene 'sorteo', consideramos que el sorteo está activo
    const { data: promos, error: promosErr } = await client.from('Promos_puntos').select('id_promo').ilike('Nombre_promo', '%sorteo%').limit(1);
    if (!promosErr && Array.isArray(promos) && promos.length > 0){
      // sorteo activo -> ocultar botón
      btn.style.display = 'none';
      return false;
    }

    // No hay promo de sorteo activa: mostrar el botón sólo si existen códigos candidatos
    const tryTables = ['Codigos_sorteos'];
    for (const table of tryTables){
      try{
        const { data, error } = await client.from(table).select('*').limit(3);
        if (!error && Array.isArray(data) && data.length > 0){
          btn.style.display = '';
          return true;
        }
      } catch(e){
        // tabla no disponible o error -> probar siguiente tabla
        console.debug('verificar_ganador_existente: error consultando', table, e?.message || e);
      }
    }
  } catch(err){
    console.error('verificar_ganador_existente error:', err);
  }
  btn.style.display = 'none';
  return false;
}

// Inserta un aviso en la tabla Avisos anunciando el ganador del sorteo
async function crearAvisoSorteo(ganador){
  if (!client || !ganador) return null;
  try{
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const vigenciaHoy = `${yyyy}-${mm}-${dd}`;

    let descripcion = '';
    if (Array.isArray(ganador)){
      const parts = [];
      for (let i=0;i<ganador.length;i++){
        const g = ganador[i];
        const code = g.codigo ?? '';
        const telef = g.telef ?? '';
        const nombre = telef ? (await obtNomClie(telef)) : '';
        parts.push(`#${i+1}: ${code}${nombre ? ' - ' + nombre : ''}`);
      }
      descripcion = `Se realizó un sorteo. Códigos ganadores: ${ganador.map(g=>g.codigo).join(', ')}. Ganadores: ${parts.join(' | ')}`;
    } else {
      const codigo = ganador.codigo ?? '';
      const telef = ganador.telef ?? '';
      const nombre = telef ? await obtNomClie(telef) : '';
      descripcion = `Se realizó un sorteo. Código ganador: ${codigo}${nombre ? ' - Ganador: ' + nombre : ''}`;
    }

    const { data, error } = await client.from('Avisos').insert([{
      titulo_flotante: 'Sorteo',
      titulo_aviso: 'Sorteo finalizado',
      descripcion_aviso: descripcion,
      vigencia: vigenciaHoy
    }]).select();
    if (error){
      console.error('Error al crear aviso de sorteo:', error);
      return null;
    }
    return data && data[0] ? data[0] : null;
  } catch(e){
    console.error('Exception creating aviso:', e);
    return null;
  }
}