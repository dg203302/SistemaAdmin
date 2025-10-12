(function(){
  // Mapeo por tipo: tabla y nombres de columnas reales en la BDD
  const CONFIG = {
    Avisos: {
      table: 'Avisos',
      cols: { id: 'id_aviso', title: 'titulo_aviso', description: 'descripcion_aviso', vigencia:'vigencia', flotante: 'titulo_flotante' }
    },
    Promociones: {
      table: 'Promos_puntos',
      // Ejemplo: si tu tabla usa id_promo como PK
      cols: { id: 'id_promo', title: 'Nombre_promo', description: 'descripcion_promo', puntos: 'cantidad_puntos_canjeo', vigencia: 'validez', emoji: 'emoji_promo' }
    },
    Ofertas: {
      table: 'Ofertas',
      cols: { id: 'id_promocion', title: 'nombre', description: 'desripcion', vigencia:'vigencia', emoji: 'emoji_ofertas', flotante: 'campo_flotante' }
    }
  };

  /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
  let supabase = null;

  function getEl(id){ return document.getElementById(id); }

  function ensureSupabase(){
    if (window.supabaseClient) {
      supabase = window.supabaseClient;
      return supabase;
    }
    if (!window.__supabaseConfigured) return null;
    if (supabase) return supabase;
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return supabase;
  }

  function setSectionVisible(visible){
    const section = getEl('adminSection');
    if (!section) return;
    section.hidden = !visible;
  }

  function setHelperVisible(visible){
    const helper = getEl('sectionHelper');
    if (!helper) return;
    helper.hidden = !visible;
  }

  function setTitle(text){
    const t = getEl('sectionTitle');
    if (t) t.textContent = text;
  }

  function clearTbody(){
    const tbody = getEl('itemsBody');
    if (tbody) tbody.innerHTML = '';
  }

  function clearEditor(){
    const ed = getEl('editorContainer');
    if (ed){ ed.hidden = true; ed.innerHTML = ''; }
  }

  function renderEmpty(message, tipo){
    const tbody = getEl('itemsBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    // Columnas visibles: Título, Descripción, (Puntos si Promociones), Vigencia, Acciones
    const baseCols = 4;
    const colSpan = tipo === 'Promociones' ? baseCols + 1 : baseCols;
    td.colSpan = colSpan;
    td.innerHTML = `<div class="empty">${message}</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderRow(item, cols, tipo, onEdit, onDelete){
    const tr = document.createElement('tr');

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = item[cols.title] ?? '';
    tr.appendChild(tdTitulo);

    const tdDesc = document.createElement('td');
    tdDesc.className = 'hide-sm';
    tdDesc.textContent = item[cols.description] ?? '';
    tr.appendChild(tdDesc);

    // Solo para Promociones mostramos puntos
    if (tipo === 'Promociones' && cols.puntos){
      const tdPuntos = document.createElement('td');
      tdPuntos.textContent = item[cols.puntos] ?? '';
      tr.appendChild(tdPuntos);
    }

    // Vigencia si existe en el mapeo
    const tdVig = document.createElement('td');
    tdVig.textContent = cols.vigencia ? (item[cols.vigencia] ?? '') : '';
    tr.appendChild(tdVig);

    const tdAcciones = document.createElement('td');
    tdAcciones.className = 'right';
    const wrap = document.createElement('span');
    wrap.className = 'row-actions';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn small';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => onEdit(item));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn small';
    btnDel.textContent = 'Eliminar';
    btnDel.addEventListener('click', () => onDelete(item));

    wrap.appendChild(btnEdit);
    wrap.appendChild(btnDel);
    tdAcciones.appendChild(wrap);
    tr.appendChild(tdAcciones);

    return tr;
  }

  async function loadItems(tipo){
    clearTbody();
    const tbody = getEl('itemsBody');
    const client = ensureSupabase();
    if (!client){
      renderEmpty('Configura Supabase para cargar datos.', tipo);
      setHelperVisible(true);
      return;
    }

    setHelperVisible(false);

    const cfg = CONFIG[tipo];
    if (!cfg){
      renderEmpty('Tipo no soportado.', tipo);
      return;
    }

    const { table, cols } = cfg;
    let q = client.from(table).select('*');
    if (cols.id) q = q.order(cols.id, { ascending: false });
    const { data, error } = await q;

    if (error){
      console.error(error);
      renderEmpty('Error al cargar datos.', tipo);
      return;
    }

    if (!data || data.length === 0){
      renderEmpty('No hay elementos. Crea el primero.', tipo);
      return;
    }

    const onEdit = (item) => openInlineForm('edit', tipo, cols, item, client, table);

    const onDelete = async (item) => {
      if (!confirm('¿Eliminar este elemento?')) return;
      const { error: delErr } = await client.from(table).delete().eq(cols.id, item[cols.id]);
      if (delErr){ alert('Error al eliminar'); return; }
      await loadItems(tipo);
    };

    // Mostrar/ocultar encabezado de Puntos según tipo
    const thPuntos = document.getElementById('thPuntos');
    if (thPuntos) thPuntos.hidden = (tipo !== 'Promociones');

    for (const it of data){
      tbody.appendChild(renderRow(it, cols, tipo, onEdit, onDelete));
    }
  }

  function crearItem(tipo){
    const client = ensureSupabase();
    if (!client) { alert('Configura Supabase primero'); return; }
    const cfg = CONFIG[tipo];
    if (!cfg) { alert('Tipo no soportado'); return; }
    const { table, cols } = cfg;
    openInlineForm('create', tipo, cols, null, client, table);
  }

  function openInlineForm(mode, tipo, cols, item, client, table){
    clearEditor();
    const ed = getEl('editorContainer');
    if (!ed) return;
    ed.hidden = false;

  const isPromo = (tipo === 'Promociones' && cols.puntos);
    const titleVal = item ? (item[cols.title] ?? '') : '';
    const descVal = item ? (item[cols.description] ?? '') : '';
    const ptsVal = item && isPromo ? (item[cols.puntos] ?? '') : '';
    const vigVal = item && cols.vigencia ? (item[cols.vigencia] ?? '') : '';
  const flotVal = item && cols.flotante ? (item[cols.flotante] ?? '') : '';
  const emojiVal = item && cols.emoji ? (item[cols.emoji] ?? '') : '';

    ed.innerHTML = `
      <div class="inline-card" role="region" aria-label="${mode === 'create' ? 'Crear' : 'Editar'} ${tipo}">
        <div class="inline-header">
          <div class="inline-title">${mode === 'create' ? 'Crear' : 'Editar'} ${tipo}</div>
          <button type="button" class="icon-btn" id="btnCloseEditor" aria-label="Cerrar">✕</button>
        </div>
        <div class="inline-body">
          <form class="inline-form" id="inlineForm">
            <div class="field">
              <label for="fTitulo">Título</label>
              <input id="fTitulo" type="text" value="${escapeHtml(titleVal)}" required />
            </div>
            <div class="field">
              <label for="fDesc">Descripción</label>
              <textarea id="fDesc" rows="2">${escapeHtml(descVal)}</textarea>
              <div class="inline-hint">Escribe una descripción breve y clara.</div>
            </div>
            ${cols.flotante ? `
              <div class="field">
                <label for="fFlot">Título flotante</label>
                <input id="fFlot" type="text" value="${escapeAttr(flotVal)}" placeholder="Texto destacado" />
              </div>
            ` : ''}
            ${isPromo ? `
              <div class="field">
                <label for="fPuntos">Puntos</label>
                <input id="fPuntos" type="number" step="1" min="0" value="${escapeAttr(ptsVal)}" />
                <div class="inline-hint">Solo números enteros.</div>
              </div>
            ` : ''}
            ${cols.emoji ? `
              <div class="field">
                <label for="fEmoji">Emoji</label>
                <input id="fEmoji" type="text" class="w-emoji" value="${escapeAttr(emojiVal)}" placeholder="p.ej. 🎉" />
                <div class="inline-hint">Pega un emoji que identifique la ${tipo.toLowerCase()}.</div>
              </div>
            ` : ''}
            <div class="field">
              <label for="fVig">Vigencia</label>
              <input id="fVig" type="text" value="${escapeAttr(vigVal)}" placeholder="p.ej. 2025-12-31 o 30 días" />
            </div>
            <div id="formError" class="error" hidden></div>
            <div class="inline-actions">
              <button type="submit" class="btn primary" id="btnSubmit">${mode === 'create' ? 'Crear' : 'Guardar'}</button>
              <button type="button" class="btn" id="btnCancelar">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('inlineForm');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnClose = document.getElementById('btnCloseEditor');
    const errorBox = document.getElementById('formError');
    if (btnCancelar) btnCancelar.onclick = () => clearEditor();
    if (btnClose) btnClose.onclick = () => clearEditor();

    // Cancelar con Escape
    form.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { e.preventDefault(); clearEditor(); } });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const titulo = document.getElementById('fTitulo').value.trim();
      const descripcion = document.getElementById('fDesc').value.trim();
  const puntos = isPromo ? document.getElementById('fPuntos').value : undefined;
  const flotante = cols.flotante ? document.getElementById('fFlot')?.value.trim() : undefined;
  const emoji = cols.emoji ? document.getElementById('fEmoji')?.value.trim() : undefined;
      const vig = document.getElementById('fVig').value.trim();

      // Validaciones básicas
      if (!titulo){ errorBox.hidden = false; errorBox.textContent = 'El título es obligatorio.'; return; }
      if (isPromo && puntos !== undefined && puntos !== '' && isNaN(Number(puntos))){
        errorBox.hidden = false; errorBox.textContent = 'Puntos debe ser un número.'; return;
      }
      errorBox.hidden = true; errorBox.textContent = '';

      const payload = { [cols.title]: titulo, [cols.description]: descripcion };
      if (cols.vigencia) payload[cols.vigencia] = vig;
      if (isPromo && cols.puntos) payload[cols.puntos] = puntos ? Number(puntos) : null;
  if (cols.flotante) payload[cols.flotante] = flotante ?? null;
  if (cols.emoji) payload[cols.emoji] = emoji ?? null;

      // Loading state
      const btnSubmit = document.getElementById('btnSubmit');
      const oldLabel = btnSubmit.textContent;
      btnSubmit.textContent = 'Guardando...';
      btnSubmit.disabled = true;
  let err;
      if (mode === 'create'){
        ({ error: err } = await client.from(table).insert(payload));
      } else {
        ({ error: err } = await client.from(table).update(payload).eq(cols.id, item[cols.id]));
      }
      btnSubmit.textContent = oldLabel;
      btnSubmit.disabled = false;
      if (err){ errorBox.hidden = false; errorBox.textContent = 'Error al guardar. Revisa los datos.'; return; }
      clearEditor();
      await loadItems(tipo);
    };
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[ch]));
  }
  function escapeAttr(s){
    return String(s).replace(/"/g, '&quot;');
  }

  function init(){
    const btnAdmin = document.getElementById('btnAdministrar');
    const sel = document.getElementById('opciones');
    const btnCrear = document.getElementById('btnCrear');

    if (!btnAdmin || !sel || !btnCrear) return;

    btnAdmin.addEventListener('click', async () => {
      const tipo = sel.value;
      if (!tipo){ alert('Selecciona una opción'); return; }

      setTitle(tipo);
      setSectionVisible(true);
      await loadItems(tipo);

      btnCrear.onclick = () => crearItem(tipo);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();