(function(){
  // Mapeo por tipo: tabla y nombres de columnas reales en la BDD
  const CONFIG = {
    Avisos: {
      table: 'Avisos',
      cols: { id: 'id_aviso', title: 'titulo_aviso', description: 'descripcion_aviso' }
    },
    Promociones: {
      table: 'Promos_puntos',
      // Ejemplo: si tu tabla usa id_promo como PK
      cols: { id: 'id_promo', title: 'Nombre_promo', description: 'descripcion_promo' }
    },
    Ofertas: {
      table: 'Ofertas',
      cols: { id: 'id_promocion', title: 'nombre', description: 'descripcion' }
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

  function renderEmpty(message){
    const tbody = getEl('itemsBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.innerHTML = `<div class="empty">${message}</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderRow(item, cols, onEdit, onDelete){
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = item[cols.id] ?? '';
    tr.appendChild(tdId);

    const tdTitulo = document.createElement('td');
    tdTitulo.textContent = item[cols.title] ?? '';
    tr.appendChild(tdTitulo);

    const tdDesc = document.createElement('td');
    tdDesc.className = 'hide-sm';
    tdDesc.textContent = item[cols.description] ?? '';
    tr.appendChild(tdDesc);

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
      renderEmpty('Configura Supabase para cargar datos.');
      setHelperVisible(true);
      return;
    }

    setHelperVisible(false);

    const cfg = CONFIG[tipo];
    if (!cfg){
      renderEmpty('Tipo no soportado.');
      return;
    }

    const { table, cols } = cfg;
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(cols.id, { ascending: false });

    if (error){
      console.error(error);
      renderEmpty('Error al cargar datos.');
      return;
    }

    if (!data || data.length === 0){
      renderEmpty('No hay elementos. Crea el primero.');
      return;
    }

    const onEdit = async (item) => {
      const nuevoTitulo = prompt('Nuevo título:', item[cols.title] ?? '');
      if (nuevoTitulo === null) return; // cancelado
      const nuevaDesc = prompt('Nueva descripción:', item[cols.description] ?? '');
      if (nuevaDesc === null) return;
      const payload = { [cols.title]: nuevoTitulo, [cols.description]: nuevaDesc };
      const { error: upErr } = await client.from(table).update(payload).eq(cols.id, item[cols.id]);
      if (upErr){ alert('Error al actualizar'); return; }
      await loadItems(tipo);
    };

    const onDelete = async (item) => {
      if (!confirm('¿Eliminar este elemento?')) return;
      const { error: delErr } = await client.from(table).delete().eq(cols.id, item[cols.id]);
      if (delErr){ alert('Error al eliminar'); return; }
      await loadItems(tipo);
    };

    for (const it of data){
      tbody.appendChild(renderRow(it, cols, onEdit, onDelete));
    }
  }

  async function crearItem(tipo){
    const client = ensureSupabase();
    if (!client) { alert('Configura Supabase primero'); return; }
    const cfg = CONFIG[tipo];
    if (!cfg) { alert('Tipo no soportado'); return; }
    const { table, cols } = cfg;

    const titulo = prompt('Título:');
    if (!titulo) return;
    const descripcion = prompt('Descripción:') || '';

    const payload = { [cols.title]: titulo, [cols.description]: descripcion };
    const { error } = await client.from(table).insert(payload);
    if (error){ alert('Error al crear'); return; }
    await loadItems(tipo);
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