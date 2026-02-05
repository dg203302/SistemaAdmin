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
          const telef = found?.Telef ?? found?.telef ?? found?.telefono ?? found?.telefono_cliente ?? found?.Telef_cliente ?? '';
          let nombre = '';
          try{
            if (telef) nombre = (await obtNomClie(telef)) || '';
          } catch(_){ /* ignore */ }
          // delete the exact matching row(s) for that code
          const { error: delErr } = await client.from('Codigos_sorteos').delete().eq('codigo_sorteo', cleaned);
          if (delErr){
            console.error('Error al eliminar en', 'Codigos_sorteos', delErr);
            return { ok: false, table: 'Codigos_sorteos', error: delErr };
          }
          return { ok: true, table: 'Codigos_sorteos', telef: telef ? String(telef) : '', nombre: nombre ? String(nombre) : '' };
        }
      }catch(e){
        return { ok: false };
      }
    }
  const result = await findAndDelete();

  if (result.ok){
    const infoHtml = `
      <div style="text-align:left;">
        <div style="margin-bottom:10px;">
          <div style="font-size:14px;color:#6b7280;margin-bottom:4px;">Código</div>
          <div style="font-size:18px;font-weight:800;letter-spacing:0.5px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;padding:8px 12px;display:inline-block;">${escapeHtml(cleaned)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><strong>Cliente:</strong> ${escapeHtml(result.nombre || 'Sin nombre')}</div>
          <div><strong>Teléfono:</strong> ${escapeHtml(result.telef || 'No disponible')}</div>
        </div>
        <div style="margin-top:12px;color:#111827;">Disfrute de su premio.</div>
      </div>
    `;
    await Swal.fire({ title: 'Código validado', html: infoHtml, icon: 'success', width: '650px' });
    try {
      const { data: remaining, error: selErr } = await client
        .from('Codigos_sorteos')
        .select('codigo_sorteo')
        .limit(1);
      if (!Array.isArray(remaining) || remaining.length === 0) {
        try {
          const { error: delAvisoErr } = await client.from('Avisos')
            .delete()
            .eq('titulo_aviso', 'Sorteo finalizado')
            .eq('titulo_flotante', 'Sorteo');
          if (delAvisoErr){
            console.error('Error al eliminar aviso de sorteo:', delAvisoErr);
          }
        } catch(e){
          console.error('Exception al eliminar aviso de sorteo:', e);
        }
      }
    }
    catch(e){
      console.error('Exception al verificar códigos restantes:', e);
    }
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
    confirmButtonText: 'Verificar',
    inputValidator: (value) => !value && 'El código es requerido'
  });

  if (!isConfirmed || !CodigoPromo) {
    return;
  }

  const codigo = String(CodigoPromo).trim();
  try {
    const { data: row, error } = await client
      .from('Codigos_promos_puntos')
      .select('*')
      .eq('codigo_canjeado', codigo)
      .limit(1)
      .single();

    if (error || !row) {
      await Swal.fire({
        title: 'No encontrado',
        text: 'Código no existe en promociones o no es válido',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    const nombreCliente = row?.Telef ? (await obtNomClie(row.Telef)) : '';
    let promoNombre = '';
    let promoDesc = '';
    let promoFechas = '';
    try {
      if (row?.id_promo != null) {
        const { data: promoRow } = await client
          .from('Promos_puntos')
          .select('*')
          .eq('id_promo', row.id_promo)
          .limit(1)
          .single();
        if (promoRow) {
          promoNombre = promoRow.Nombre_promo || '';
          promoDesc = promoRow.Descripcion_promo || '';
          const fi = promoRow.Fecha_inicio ? new Date(promoRow.Fecha_inicio).toLocaleDateString() : '';
          const ff = promoRow.Fecha_fin ? new Date(promoRow.Fecha_fin).toLocaleDateString() : '';
          promoFechas = fi && ff ? `${fi} - ${ff}` : (fi || ff);
        }
      }
    } catch(_) {}

    const estadoText = row.Canjeado === 1 ? 'Canjeado' : 'Sin validar';
    const estadoColor = row.Canjeado === 1 ? '#16a34a' : '#f59e0b';
    const detHtml = `
      <div style="text-align:left;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="font-size:18px;font-weight:700;letter-spacing:0.5px;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:8px;padding:8px 12px;display:inline-block;">${escapeHtml(row.codigo_canjeado || '')}</div>
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${estadoColor};color:#fff;font-weight:600;">${escapeHtml(estadoText)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div><strong>Cliente:</strong> ${escapeHtml(nombreCliente || '')}</div>
          <div><strong>Teléfono:</strong> ${escapeHtml(row.Telef || '')}</div>
          <div><strong>Fecha creación:</strong> ${row.fecha_creac ? escapeHtml(new Date(row.fecha_creac).toLocaleString()) : '-'}</div>
          <div><strong>Fecha validación:</strong> ${row.Fecha_validacion ? escapeHtml(new Date(row.Fecha_validacion).toLocaleString()) : '-'}</div>
        </div>
        <div style="border:1px solid #3b82f6;border-left:6px solid #3b82f6;background:linear-gradient(90deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02));border-radius:10px;padding:12px;margin:8px 0;">
          <div style="font-weight:700;color:#1f2937;margin-bottom:6px;">Promoción</div>
          <div style="font-size:16px;font-weight:700;color:#1f2937;margin-bottom:4px;">${escapeHtml(promoNombre || (row.id_promo != null ? `ID ${row.id_promo}` : 'Sin promoción asociada'))}</div>
          ${promoDesc ? `<div style="color:#374151;margin-bottom:4px;"><strong>Descripción:</strong> ${escapeHtml(promoDesc)}</div>` : ''}
          ${promoFechas ? `<div style="color:#374151;"><strong>Vigencia:</strong> ${escapeHtml(promoFechas)}</div>` : ''}
        </div>
      </div>
    `;

    const showValidate = row.Canjeado !== 1;
    const res = await Swal.fire({
      title: 'Verificación de código',
      html: detHtml,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      showConfirmButton: showValidate,
      confirmButtonText: 'Validar',
      width: '700px'
    });

    if (!res.isConfirmed) return;

    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const pad = n => String(Math.floor(Math.abs(n))).padStart(2, '0');
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19);
    const localWithOffset = `${local}${sign}${pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;

    const { data: upd, error: updErr } = await client
      .from('Codigos_promos_puntos')
      .update({ Canjeado: 1, Fecha_validacion: localWithOffset })
      .eq('codigo_canjeado', codigo)
      .eq('Canjeado', 0)
      .select();

    if (updErr) {
      await Swal.fire({
        title: 'Error',
        text: 'Error al validar el código',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!upd || upd.length === 0) {
      await Swal.fire({
        title: 'No válido',
        text: 'Código no encontrado o ya fue canjeado',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    await Swal.fire({
      title: 'Éxito',
      text: 'Código validado correctamente',
      icon: 'success',
      confirmButtonText: 'OK'
    });
    cargar_cantidades();
    recargar_tablas();
  } catch(e) {
    await Swal.fire({
      title: 'Error',
      text: 'Ocurrió un error al verificar el código',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
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
  window.location.reload();
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

// Key used to enforce "one winner per person".
// Prefer phone (Telef) when present; fallback to code when phone is missing.
function personKey(entry){
  if (!entry) return '';
  const telef = entry.telef == null ? '' : String(entry.telef).trim();
  if (telef) return `tel:${telef}`;
  const codigo = entry.codigo == null ? '' : String(entry.codigo).trim();
  return `code:${codigo}`;
}

function groupByPerson(entries){
  const map = new Map();
  for (const e of (entries || [])){
    const key = personKey(e);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return map;
}

// Picks N winners where each winner is a unique person (based on phone).
// If a person has multiple codes, pick 1 random code for that person.
function pickWinnersUniqueByPerson(entries, n){
  const groups = groupByPerson(entries);
  const keys = Array.from(groups.keys());
  if (keys.length === 0) return [];
  const pickedKeys = pickRandomMultiple(keys, n);
  const winners = [];
  for (const k of pickedKeys){
    const list = groups.get(k) || [];
    const picked = pickRandom(list) || list[0];
    if (picked) winners.push(picked);
  }
  return winners;
}

// Ensures currentWinners has unique people; replaces duplicates with available candidates.
function enforceUniqueWinners(currentWinners, allCandidates){
  const winners = Array.isArray(currentWinners) ? currentWinners.slice() : [];
  const used = new Set();

  const groups = groupByPerson(allCandidates);
  const availableKeys = Array.from(groups.keys());

  for (let i = 0; i < winners.length; i++){
    const w = winners[i];
    const key = personKey(w);
    if (!key) continue;
    if (!used.has(key)){
      used.add(key);
      continue;
    }

    // Duplicate: replace with a new person not used yet
    const replacementKey = availableKeys.find(k => !used.has(k));
    if (!replacementKey) continue;
    const list = groups.get(replacementKey) || [];
    const replacement = pickRandom(list) || list[0];
    if (replacement){
      winners[i] = replacement;
      used.add(replacementKey);
    }
  }

  return winners;
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

  // pick 3 unique winners by person (phone)
  const uniquePeopleCount = groupByPerson(codes).size;
  if (uniquePeopleCount < 3){
    await Swal.fire({
      title: 'No hay suficientes participantes',
      text: 'Se requieren al menos 3 personas distintas para realizar el sorteo (1 ganador por persona).',
      icon: 'warning'
    });
    return;
  }
  let currentWinners = pickWinnersUniqueByPerson(codes, 3);
  currentWinners = enforceUniqueWinners(currentWinners, codes);

  // Function to show winner modal and handle actions
  async function showWinnerModal(){
    // build html listing the three winners
    const parts = [];
    for (let i=0;i<currentWinners.length;i++){
      const w = currentWinners[i];
      const name = w.telef ? (await obtNomClie(w.telef)) : '';
      const phone = w.telef ? String(w.telef) : '';
      const phoneHtml = phone ? ` <span style=\"color:#888\">(${escapeHtml(phone)})</span>` : '';
      parts.push(`<div style=\"margin-bottom:8px\"><strong>#${i+1}:</strong> <span style=\"font-weight:700\">${escapeHtml(w.codigo || '')}</span> <span style=\"color:#666\">${escapeHtml(name || '')}</span>${phoneHtml}</div>`);
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
      const nombresArr = [];
      for (const w of currentWinners){
        let nombre = '';
        try{
          nombre = w?.telef ? (await obtNomClie(w.telef)) : '';
        } catch(_){ /* ignore */ }
        nombresArr.push((nombre || '').trim() || 'Sin nombre');
      }
      await Swal.fire({ title: 'Sorteo finalizado', text: `Ganadores: ${nombresArr.join(' | ')}`, icon: 'success' });
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

    const rowsHtml = enriched.map((e, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
      return `
        <tr style="background:${bg}">
          <td style="padding:10px 12px">${escapeHtml(e.nombre) || ''}</td>
          <td style="padding:10px 12px;color:#374151">${escapeHtml(e.telef || '')}</td>
          <td style="padding:10px 12px;font-weight:600">${escapeHtml(e.codigo)}</td>
          <td style="padding:10px 12px;text-align:right;white-space:nowrap;">
            <button class="select-winner-btn" data-idx="${idx}" data-winner-target="0" style="margin:2px 4px;padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827;font-weight:600">🥇 Ganador 1</button>
            <button class="select-winner-btn" data-idx="${idx}" data-winner-target="1" style="margin:2px 4px;padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827;font-weight:600">🥈 Ganador 2</button>
            <button class="select-winner-btn" data-idx="${idx}" data-winner-target="2" style="margin:2px 4px;padding:6px 10px;border-radius:8px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827;font-weight:600">🥉 Ganador 3</button>
          </td>
        </tr>
      `;
    }).join('');

    const listHtml = `
      <div style="font-size:14px;color:#374151;margin-top:6px;margin-bottom:8px">Elige quién será <strong>ganador 1</strong>, <strong>ganador 2</strong> o <strong>ganador 3</strong>. Los ganadores deben ser únicos; si seleccionas el mismo participante, se reubicará automáticamente.</div>
      <div style="max-height:50vh;overflow:auto;border:1px solid #e5e7eb;border-radius:10px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="text-align:left;padding:10px 12px;color:#111827">Nombre</th>
              <th style="text-align:left;padding:10px 12px;color:#111827">Teléfono</th>
              <th style="text-align:left;padding:10px 12px;color:#111827">Código</th>
              <th style="text-align:right;padding:10px 12px;color:#111827">Seleccionar</th>
            </tr>
          </thead>
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
      width: '800px',
      didOpen: () => {
        // attach listeners
        document.querySelectorAll('.select-winner-btn').forEach(btnEl => {
          btnEl.addEventListener('click', (ev) => {
            const idx = Number(btnEl.getAttribute('data-idx'));
            const target = Number(btnEl.getAttribute('data-winner-target'));
            if (Number.isNaN(idx) || Number.isNaN(target) || !enriched[idx]) return;
            const selected = enriched[idx];

            // enforce uniqueness by person (phone); fallback to code when phone missing
            const selKey = personKey(selected);
            const existingIndex = currentWinners.findIndex(w => personKey(w) === selKey);
            if (existingIndex === -1){
              currentWinners[target] = selected;
            } else if (existingIndex === target){
              // already in the same position
            } else {
              // swap to keep unique people
              const temp = currentWinners[target];
              currentWinners[target] = currentWinners[existingIndex];
              currentWinners[existingIndex] = temp;
            }

            // final safety: if there are duplicates, replace them automatically
            currentWinners = enforceUniqueWinners(currentWinners, enriched);
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

    const resolveNombre = async (g) => {
      const telef = g?.telef ?? g?.Telef ?? '';
      const nombre = telef ? (await obtNomClie(telef)) : '';
      return (nombre || '').trim() || 'Sin nombre';
    };

    let descripcion = '';
    if (Array.isArray(ganador)){
      const nombres = [];
      for (let i=0;i<ganador.length;i++){
        nombres.push(await resolveNombre(ganador[i]));
      }
      // Hay 3 ganadores por sorteo: listar solo nombres (sin códigos)
      const parts = nombres.map((n, idx) => `#${idx + 1}: ${n}`);
      descripcion = `Se realizó un sorteo. Ganadores: ${parts.join(' | ')}`;
    } else {
      const nombre = await resolveNombre(ganador);
      descripcion = `Se realizó un sorteo. Ganador #1: ${nombre}`;
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