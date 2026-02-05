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

  // SweetAlert2: helper para toasts
  let __toastMixin = null;
  function waitForSwal(){
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if (window.Swal){ clearInterval(iv); resolve(); }
      }, 50);
    });
  }
  async function ensureSwal(){
    if (window.Swal) return window.Swal;
    if (!document.getElementById('swal2-script')){
      const s = document.createElement('script');
      s.id = 'swal2-script';
      s.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      document.head.appendChild(s);
    }
    await waitForSwal();
    return window.Swal;
  }
  async function showToast(icon, title, opts){
    try{
      const Swal = await ensureSwal();
      if (!__toastMixin){
        __toastMixin = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          showCloseButton: true,
          background: 'var(--bg)',
          color: 'var(--text)'
        });
      }
      __toastMixin.fire(Object.assign({ icon, title }, opts||{}));
    } catch(_){
      try { alert(title); } catch {}
    }
  }

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

  // Placeholders para avisos especiales
  const HORARIOS_PLACEHOLDER = `Lunes
8:00 – 20:00
Martes
8:00 – 20:00
Miércoles
8:00 – 20:00
Jueves
8:00 – 20:00
Viernes
8:00 – 20:00
Sábado
9:00 – 14:00
Domingo
Cerrado`;

  const POLITICAS_PLACEHOLDER = `Devoluciones dentro de 15 días con ticket.
Garantía oficial para productos electrónicos.
Medios de pago: efectivo, débito, crédito y transferencias.
Facturación A y B disponible a solicitud.`;

  // Botones extra para Avisos: Editar horarios (id 101) y Editar políticas (id 102)
  async function openSpecialAviso(client, cols, table, idValue, label){
    try{
      const { data, error } = await client.from(table).select('*').eq(cols.id, idValue).single();
      if (error || !data){
        console.error(error);
        await showToast('error', `No se encontró el aviso de ${label}`);
        return;
      }
      const opts = (idValue === 101 || idValue === 102)
        ? {
            descriptionOnly: true,
            specialLabel: label,
            placeholder: (idValue === 101 ? HORARIOS_PLACEHOLDER : POLITICAS_PLACEHOLDER)
          }
        : undefined;
      openInlineForm('edit', 'Avisos', cols, data, client, table, opts);
    } catch(err){
      console.error(err);
      await showToast('error', `No se pudo abrir el editor de ${label}`);
    }
  }

  function setupAvisosExtras(tipo, client, cols, table){
    const btnCrear = document.getElementById('btnCrear');
    if (!btnCrear) return;
    const parent = btnCrear.parentElement || btnCrear.parentNode;

    let btnHor = document.getElementById('btnEditarHorarios');
    let btnPol = document.getElementById('btnEditarPoliticas');

    if (!btnHor){
      btnHor = document.createElement('button');
      btnHor.id = 'btnEditarHorarios';
      btnHor.type = 'button';
      btnHor.className = 'btn';
      btnHor.textContent = 'Editar horarios';
      if (parent) parent.appendChild(btnHor);
    }
    if (!btnPol){
      btnPol = document.createElement('button');
      btnPol.id = 'btnEditarPoliticas';
      btnPol.type = 'button';
      btnPol.className = 'btn';
      btnPol.textContent = 'Editar políticas';
      if (parent) parent.appendChild(btnPol);
    }

    const show = (tipo === 'Avisos');
    btnHor.hidden = !show;
    btnPol.hidden = !show;

    if (show){
      btnHor.onclick = () => openSpecialAviso(client, cols, table, 101, 'horarios');
      btnPol.onclick = () => openSpecialAviso(client, cols, table, 102, 'políticas');
    }
  }

  async function cleanupCodigosSorteo(client){
    if (!client) return;
    try{
        const { error } = await client.from("Codigos_sorteos").delete().not("Telef","is", null);
        if (!error){
          console.log(`Limpieza: eliminadas filas en Codigos_sorteos donde Telef no es null`);
          return;
        }
      } catch(err){
        await showToast('error', `no se pudieron eliminar las filas de la tabla de códigos de sorteo.`);
        console.error(err);
        return;
      }
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
    // Botones extra visibles solo en Avisos
    setupAvisosExtras(tipo, client, cols, table);
    let q = client.from(table).select('*');
    // Excluir avisos con id 101 y 102
    if (tipo === 'Avisos' && cols.id) {
      q = q.neq(cols.id, 101).neq(cols.id, 102);
    }
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
      // Si es Promociones y el título contiene 'sorteo', limpiar códigos relacionados
      try{
        if (tipo === 'Promociones' && item[cols.title] && /sorteo/i.test(String(item[cols.title]))) {
          await cleanupCodigosSorteo(client);
        }
      } catch(e){ console.error(e); }

      const { error: delErr } = await client.from(table).delete().eq(cols.id, item[cols.id]);
      if (delErr){ showToast('error', 'Error al eliminar'); return; }
      showToast('success', 'Elemento eliminado');
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
    if (!client) { showToast('info', 'Configura Supabase primero'); return; }
    const cfg = CONFIG[tipo];
    if (!cfg) { showToast('warning', 'Tipo no soportado'); return; }
    const { table, cols } = cfg;
    openInlineForm('create', tipo, cols, null, client, table);
  }

  // Parsea el formato "Lunes 8:00 – 20:00 | Martes 8:00 – 20:00 | ..." a objeto { Lunes: "8:00 – 20:00", ... }
  function parseHorarios(text) {
    const horarios = {};
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Inicializar todos los días como vacío
    dias.forEach(dia => { horarios[dia] = ''; });
    
    if (!text) return horarios;
    
    // Dividir por el separador |
    const partes = text.split('|').map(p => p.trim()).filter(p => p);
    
    for (const parte of partes) {
      // Buscar qué día aparece en esta parte
      for (const dia of dias) {
        if (parte.startsWith(dia)) {
          // Extraer el horario (todo lo que viene después del nombre del día)
          const horario = parte.substring(dia.length).trim();
          horarios[dia] = horario;
          break;
        }
      }
    }
    
    return horarios;
  }

  // Serializa objeto { Lunes: "8:00 – 20:00", ... } a formato "Lunes 8:00 – 20:00 | Martes 8:00 – 20:00 | ..."
  function serializeHorarios() {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const parts = [];
    for (const dia of dias) {
      const input = document.getElementById(`horario_${dia}`);
      if (input) {
        const valor = input.value.trim();
        parts.push(`${dia} ${valor || 'Cerrado'}`);
      }
    }
    return parts.join(' | ');
  }

  function openInlineForm(mode, tipo, cols, item, client, table, opts){
    clearEditor();
    const ed = getEl('editorContainer');
    if (!ed) return;
    ed.hidden = false;

  const isPromo = (tipo === 'Promociones' && cols.puntos);
    const descriptionOnly = !!(opts && opts.descriptionOnly);
    const titleVal = item ? (item[cols.title] ?? '') : '';
    const descVal = item ? (item[cols.description] ?? '') : '';
    const ptsVal = item && isPromo ? (item[cols.puntos] ?? '') : '';
    const vigVal = item && cols.vigencia ? (item[cols.vigencia] ?? '') : '';
  const flotVal = item && cols.flotante ? (item[cols.flotante] ?? '') : '';
  const emojiVal = item && cols.emoji ? (item[cols.emoji] ?? '') : '';

    // Caso especial: editor de horarios con tabla
    if (descriptionOnly && opts && opts.specialLabel === 'horarios') {
      const labelTitle = `Editar ${opts.specialLabel}`;
      // Parsear horarios del descVal (formato: "Lunes\n8:00 – 20:00\nMartes\n...")
      const horarios = parseHorarios(descVal);
      ed.innerHTML = `
        <div class="inline-card" role="region" aria-label="${labelTitle}">
          <div class="inline-header">
            <div class="inline-title">${labelTitle}</div>
            <button type="button" class="icon-btn" id="btnCloseEditor" aria-label="Cerrar">✕</button>
          </div>
          <div class="inline-body">
            <form class="inline-form" id="inlineForm" data-tipo="${tipo}">
              <div class="field">
                <label>Horarios de atención</label>
                <table class="horarios-table">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => `
                      <tr>
                        <td><strong>${dia}</strong></td>
                        <td>
                          <input type="text" 
                                 id="horario_${dia}" 
                                 class="horario-input"
                                 value="${escapeAttr(horarios[dia] || '')}" 
                                 placeholder="ej: 8:00 – 20:00 o Cerrado" />
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div id="formError" class="error" hidden></div>
              <div class="inline-actions">
                <button type="submit" class="btn primary" id="btnSubmit">Guardar</button>
                <button type="button" class="btn" id="btnCancelar">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
    } else if (descriptionOnly) {
      const labelTitle = (opts && opts.specialLabel) ? `Editar ${opts.specialLabel}` : `${mode === 'create' ? 'Crear' : 'Editar'} ${tipo}`;
      const ph = (opts && opts.placeholder) ? opts.placeholder : '';
      const isPoliticas = opts && opts.specialLabel === 'políticas';
      
      ed.innerHTML = `
        <div class="inline-card ${isPoliticas ? 'politicas-editor' : ''}" role="region" aria-label="${labelTitle}">
          <div class="inline-header">
            <div class="inline-title-wrapper">
              ${isPoliticas ? '<span class="editor-icon">📋</span>' : ''}
              <div class="inline-title">${labelTitle}</div>
            </div>
            <button type="button" class="icon-btn" id="btnCloseEditor" aria-label="Cerrar">✕</button>
          </div>
          <div class="inline-body">
            <form class="inline-form" id="inlineForm" data-tipo="${tipo}">
              <div class="field field-descripcion ${isPoliticas ? 'field-politicas' : ''}">
                <label for="fDesc">
                  ${isPoliticas ? '<span class="label-icon">✏️</span>' : ''}
                  <span class="label-text">${isPoliticas ? 'Políticas y condiciones' : 'Descripción'}</span>
                </label>
                ${isPoliticas ? '<div class="field-hint">Define las políticas de tu negocio de forma clara y concisa. Cada línea representa una política diferente.</div>' : ''}
                <textarea id="fDesc" rows="${isPoliticas ? '10' : '6'}" placeholder="${escapeAttr(ph)}">${escapeHtml(descVal)}</textarea>
                ${isPoliticas ? '<div class="char-counter"><span id="charCount">0</span> caracteres</div>' : ''}
              </div>
              <div id="formError" class="error" hidden></div>
              <div class="inline-actions">
                <button type="submit" class="btn primary" id="btnSubmit">
                  <span class="btn-icon">💾</span>
                  <span class="btn-text">Guardar cambios</span>
                </button>
                <button type="button" class="btn" id="btnCancelar">
                  <span class="btn-text">Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
      
      // Si es políticas, agregar contador de caracteres
      if (isPoliticas) {
        setTimeout(() => {
          const textarea = document.getElementById('fDesc');
          const counter = document.getElementById('charCount');
          if (textarea && counter) {
            const updateCount = () => {
              counter.textContent = textarea.value.length;
            };
            updateCount();
            textarea.addEventListener('input', updateCount);
          }
        }, 0);
      }
    } else {
      ed.innerHTML = `
        <div class="inline-card" role="region" aria-label="${mode === 'create' ? 'Crear' : 'Editar'} ${tipo}">
          <div class="inline-header">
            <div class="inline-title">${mode === 'create' ? 'Crear' : 'Editar'} ${tipo}</div>
            <button type="button" class="icon-btn" id="btnCloseEditor" aria-label="Cerrar">✕</button>
          </div>
          <div class="inline-body">
            <form class="inline-form" id="inlineForm" data-tipo="${tipo}">
              <div class="field field-titulo">
                <label for="fTitulo">Título</label>
                <input id="fTitulo" type="text" value="${escapeHtml(titleVal)}" required />
              </div>
              <div class="field field-descripcion">
                <label for="fDesc">Descripción</label>
                <textarea id="fDesc" rows="4">${escapeHtml(descVal)}</textarea>
              </div>
              ${cols.flotante ? `
                <div class="field field-flotante">
                  <label for="fFlot">Título flotante</label>
                  <input id="fFlot" type="text" value="${escapeAttr(flotVal)}" placeholder="Texto destacado" />
                </div>
              ` : ''}
              ${isPromo ? `
                <div class="field field-puntos">
                  <label for="fPuntos">Puntos</label>
                  <input id="fPuntos" type="number" step="1" min="0" value="${escapeAttr(ptsVal)}" />
                  <div class="inline-hint">Solo números enteros.</div>
                </div>
              ` : ''}
              ${cols.emoji ? `
                <div class="field field-emoji" style="position:relative;">
                  <label for="fEmoji">Emoji</label>
                  <div class="emoji-input-row">
                    <input id="fEmoji" type="text" class="w-emoji" value="${escapeAttr(emojiVal)}" placeholder="p.ej. 🎉" />
                    <button type="button" class="btn small" id="btnEmojiPicker" aria-haspopup="dialog" aria-expanded="false">Seleccionar</button>
                  </div>
                  <div id="emojiPickerContainer" class="emoji-picker-container" hidden style="position:absolute; right:0; top:calc(100% + 6px); z-index: 9999; background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:10px; box-shadow:0 10px 24px rgba(0,0,0,0.18);">
                  </div>
                </div>
              ` : ''}
              ${isPromo && mode === 'create' ? `
                <div class="field field-vigencia">
                  <label for="fVigDate">Vigencia</label>
                  <input id="fVigDate" type="date" value="${escapeAttr(dmyToIso(vigVal))}" />
                  <div class="inline-hint">Formato guardado: dd/mm/aaaa</div>
                </div>
              ` : `
                <div class="field field-vigencia">
                  <label for="fVig">Vigencia</label>
                  <input id="fVig" type="date" value="${escapeAttr(dmyToIso(vigVal))}" />
                </div>
              `}
              <div id="formError" class="error" hidden></div>
              <div class="inline-actions">
                <button type="submit" class="btn primary" id="btnSubmit">${mode === 'create' ? 'Crear' : 'Guardar'}</button>
                <button type="button" class="btn" id="btnCancelar">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

  const form = document.getElementById('inlineForm');
  const btnCancelar = document.getElementById('btnCancelar');
  const btnClose = document.getElementById('btnCloseEditor');
  const errorBox = document.getElementById('formError');
  // Podremos cerrar un portal si existe (se define más abajo en wiring del picker)
  let closePortal = null;
  if (btnCancelar) btnCancelar.onclick = () => { if (typeof closePortal === 'function') closePortal(); clearEditor(); };
  if (btnClose) btnClose.onclick = () => { if (typeof closePortal === 'function') closePortal(); clearEditor(); };
    // Emoji Picker wiring (Promociones/Ofertas usan cols.emoji) con portal al <body>
    if (cols.emoji) {
      const btnEmoji = document.getElementById('btnEmojiPicker');
      const inputEmoji = document.getElementById('fEmoji');
      if (btnEmoji && inputEmoji) {
        let portalEl = null;
        let removeOutside = null;
        let removeKeydown = null;
        let removeReposition = null;

        function positionPortal() {
          if (!portalEl) return;
          const rect = btnEmoji.getBoundingClientRect();
          const margin = 6;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          // medir dimensiones del portal
          const w = portalEl.offsetWidth || 320;
          const h = portalEl.offsetHeight || 380;
          let left = rect.left; // alineado a la izquierda del botón
          // evitar overflow horizontal
          if (left + w + 8 > vw) left = Math.max(8, vw - w - 8);
          if (left < 8) left = 8;
          let top = rect.bottom + margin; // por debajo del botón
          if (top + h + 8 > vh) {
            // si no cabe abajo, mostrar arriba
            top = Math.max(8, rect.top - margin - h);
          }
          portalEl.style.left = `${Math.round(left)}px`;
          portalEl.style.top = `${Math.round(top)}px`;
        }

        function openPortal() {
          if (portalEl) return;
          loadEmojiPickerElement().then(() => {
            portalEl = document.createElement('div');
            portalEl.className = 'emoji-picker-portal';
            portalEl.setAttribute('role', 'dialog');
            portalEl.style.position = 'fixed';
            portalEl.style.zIndex = '2147483647';
            portalEl.style.background = '#fff';
            portalEl.style.border = '1px solid rgba(0,0,0,0.08)';
            portalEl.style.borderRadius = '10px';
            portalEl.style.boxShadow = '0 10px 24px rgba(0,0,0,0.18)';
            portalEl.style.maxHeight = '70vh';
            portalEl.style.overflow = 'hidden';
            // crear picker dentro del portal
            const picker = document.createElement('emoji-picker');
            portalEl.appendChild(picker);
            document.body.appendChild(portalEl);

            // posicionar después de montar para tener medidas
            positionPortal();

            // eventos
            const onEmoji = (event) => {
              inputEmoji.value += event.detail.unicode || '';
              inputEmoji.focus();
              closePortal();
            };
            picker.addEventListener('emoji-click', onEmoji);

            const outside = (ev) => {
              if (portalEl && !portalEl.contains(ev.target) && ev.target !== btnEmoji) {
                closePortal();
              }
            };
            document.addEventListener('mousedown', outside);
            removeOutside = () => document.removeEventListener('mousedown', outside);

            const onKey = (ev) => { if (ev.key === 'Escape') closePortal(); };
            document.addEventListener('keydown', onKey);
            removeKeydown = () => document.removeEventListener('keydown', onKey);

            const onReposition = () => positionPortal();
            window.addEventListener('scroll', onReposition, true);
            window.addEventListener('resize', onReposition);
            removeReposition = () => {
              window.removeEventListener('scroll', onReposition, true);
              window.removeEventListener('resize', onReposition);
            };

            btnEmoji.setAttribute('aria-expanded', 'true');
          }).catch(() => {/* silencioso */});
        }

        closePortal = function closePortalFn() {
          if (!portalEl) return;
          try { if (removeOutside) removeOutside(); } catch {}
          try { if (removeKeydown) removeKeydown(); } catch {}
          try { if (removeReposition) removeReposition(); } catch {}
          if (portalEl.parentNode) portalEl.parentNode.removeChild(portalEl);
          portalEl = null;
          btnEmoji.setAttribute('aria-expanded', 'false');
        };

        btnEmoji.addEventListener('click', () => {
          if (portalEl) closePortal(); else openPortal();
        });
      }
    }

    // Cancelar con Escape
    form.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { e.preventDefault(); clearEditor(); } });

    form.onsubmit = async (e) => {
      e.preventDefault();
      let descripcion = '';
      
      // Caso especial: horarios con tabla
      if (descriptionOnly && opts && opts.specialLabel === 'horarios') {
        descripcion = serializeHorarios();
      } else {
        const descInput = document.getElementById('fDesc');
        descripcion = descInput ? descInput.value.trim() : '';
      }
      
      let payload = {};
      if (descriptionOnly){
        // Solo se actualiza la descripción
        payload = { [cols.description]: descripcion };
        errorBox.hidden = true; errorBox.textContent = '';
      } else {
        const titulo = document.getElementById('fTitulo').value.trim();
        const puntos = isPromo ? document.getElementById('fPuntos').value : undefined;
        const flotante = cols.flotante ? document.getElementById('fFlot')?.value.trim() : undefined;
        const emoji = cols.emoji ? document.getElementById('fEmoji')?.value.trim() : undefined;
        let vig;
        if (isPromo && mode === 'create') {
          const iso = document.getElementById('fVigDate').value;
          vig = iso ? isoToDmy(iso) : '';
        } else {
          const iso = document.getElementById('fVig').value;
          vig = iso ? isoToDmy(iso) : '';
        }

        // Validaciones básicas
        if (!titulo){ errorBox.hidden = false; errorBox.textContent = 'El título es obligatorio.'; return; }
        if (isPromo && puntos !== undefined && puntos !== '' && isNaN(Number(puntos))){
          errorBox.hidden = false; errorBox.textContent = 'Puntos debe ser un número.'; return;
        }
        if (isPromo && /sorteo/i.test(String(titulo)) && await verificacionSorteActivo()) {
          errorBox.hidden = false; errorBox.textContent = 'No se puede crear o editar una promoción con "sorteo" en el título mientras haya un sorteo activo.';
          return;
        }
        errorBox.hidden = true; errorBox.textContent = '';

        payload = { [cols.title]: titulo, [cols.description]: descripcion };
        if (cols.vigencia) payload[cols.vigencia] = vig;
        if (isPromo && cols.puntos) payload[cols.puntos] = puntos ? Number(puntos) : null;
        if (cols.flotante) payload[cols.flotante] = flotante ?? null;
        if (cols.emoji) payload[cols.emoji] = emoji ?? null;
      }

      // Loading state
      const btnSubmit = document.getElementById('btnSubmit');
      const oldLabel = btnSubmit.textContent;
      btnSubmit.textContent = 'Guardando...';
      btnSubmit.disabled = true;
  let err;
      if (mode === 'create'){
        // Si estamos creando una Promoción y el título contiene 'sorteo', asegurar unicidad
        if (tipo === 'Promociones' && payload[cols.title] && /sorteo/i.test(String(payload[cols.title]))) {
          try {
            const { data: exists, error: exErr } = await client.from(table)
              .select(cols.title)
              .ilike(cols.title, '%sorteo%')
              .limit(1);
            if (exErr) {
              console.error(exErr);
            }
            if (exists && exists.length > 0) {
              showToast('warning', 'Ya existe otra promoción con "sorteo" en el título. Solo puede haber una.');
              btnSubmit.textContent = oldLabel;
              btnSubmit.disabled = false;
              return;
            }
          } catch(e) { console.error(e); }
        }
        ({ error: err } = await client.from(table).insert(payload));
      } else {
        ({ error: err } = await client.from(table).update(payload).eq(cols.id, item[cols.id]));
      }
      btnSubmit.textContent = oldLabel;
      btnSubmit.disabled = false;
      if (err){
        errorBox.hidden = false;
        errorBox.textContent = 'Error al guardar. Revisa los datos.';
        showToast('error', 'No se pudo guardar');
        return;
      }
      showToast('success', mode === 'create' ? 'Creado correctamente' : 'Actualizado correctamente');
      if (typeof closePortal === 'function') closePortal();
      clearEditor();
      await loadItems(tipo);
    };
  }
  async function verificacionSorteActivo(){
    const {data, error} =  await client
    .from('Codigos_sorteos')
    .select('*')
    .single()
    if(error){showToast('error', 'Error al verificar sorteo activo'); return false;}
    else{
      if (data.length > 0){
        showToast('error','Codigos de sorteo anterior sin validar');
        return false;
      }
      else{
        return true;
      }
    }
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[ch]));
  }
  function escapeAttr(s){
    return String(s).replace(/"/g, '&quot;');
  }
  // Carga dinámica del web component 'emoji-picker-element'
  function loadEmojiPickerElement(){
    const tag = 'emoji-picker';
    // Si ya está definido, no cargamos de nuevo
    if (window.customElements && customElements.get(tag)) return Promise.resolve();
    // Evitar cargar script más de una vez
    if (document.getElementById('emoji-picker-script')) {
      return waitForCustomElement(tag);
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.id = 'emoji-picker-script';
    script.src = 'https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js';
    document.head.appendChild(script);
    return waitForCustomElement(tag);
  }
  function waitForCustomElement(tag){
    if (window.customElements && customElements.get(tag)) return Promise.resolve();
    return new Promise((resolve) => {
      const iv = setInterval(() => {
        if (window.customElements && customElements.get(tag)){
          clearInterval(iv);
          resolve();
        }
      }, 50);
    });
  }
  // Convierte 'yyyy-mm-dd' -> 'dd/mm/aaaa'
  function isoToDmy(iso){
    if (!iso || typeof iso !== 'string') return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts;
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  }
  // Convierte 'dd/mm/aaaa' -> 'yyyy-mm-dd' para precargar en <input type="date">
  function dmyToIso(dmy){
    if (!dmy || typeof dmy !== 'string') return '';
    const parts = dmy.split('/');
    if (parts.length !== 3) return '';
    const [d, m, y] = parts;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function init(){
    const btnAdmin = document.getElementById('btnAdministrar');
    const sel = document.getElementById('opciones');
    const btnCrear = document.getElementById('btnCrear');

    if (!btnAdmin || !sel || !btnCrear) return;

    btnAdmin.addEventListener('click', async () => {
      const tipo = sel.value;
      if (!tipo){ showToast('info', 'Selecciona una opción'); return; }

      setTitle(tipo);
      const sectionEl = document.getElementById('adminSection');
      if (sectionEl) sectionEl.setAttribute('data-tipo', tipo);
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