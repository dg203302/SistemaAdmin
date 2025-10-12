(function(){
    /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
    let supabaseClient = null;

    function $(id){ return document.getElementById(id); }

    function ensureSupabase(){
        if (window.supabaseClient) { supabaseClient = window.supabaseClient; return supabaseClient; }
        if (!window.__supabaseConfigured) return null;
        if (supabaseClient) return supabaseClient;
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        return supabaseClient;
    }

    function setSectionVisible(v){ const s = $('usuariosSection'); if (s) s.hidden = !v; }
    function clearBody(){ const b = $('usuariosBody'); if (b) b.innerHTML = ''; }

    function renderEmpty(msg){
        const b = $('usuariosBody'); if (!b) return;
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4; td.innerHTML = `<div class="empty">${msg}</div>`;
        tr.appendChild(td); b.appendChild(tr);
    }

    function renderRow(u) {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = u['Nombre'];
        tr.appendChild(tdName);

        const tdPhone = document.createElement('td');
        tdPhone.textContent = u['Telef'];
        tr.appendChild(tdPhone);

        const tdPoints = document.createElement('td');
        tdPoints.textContent = u['Puntos'];
        tr.appendChild(tdPoints);

        const tdCreated = document.createElement('td');
        tdCreated.className = 'hide-sm';
        tdCreated.textContent = u['Fecha_creacion']
            ? new Date(u['Fecha_creacion']).toLocaleString()
            : '';
        tr.appendChild(tdCreated);

        const tdActions = document.createElement('td');
        tdActions.className = 'right';

        const wrap = document.createElement('span');
        wrap.className = 'row-actions';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn small';
        btnEdit.textContent = 'Editar';
        btnEdit.onclick = () => editUser(u);

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn small';
        btnDelete.textContent = 'Eliminar';
        btnDelete.onclick = () => deleteUser(u);

        wrap.appendChild(btnEdit);
        wrap.appendChild(btnDelete);
        tdActions.appendChild(wrap);
        tr.appendChild(tdActions);

        return tr;
    }

    function isPhoneLike(q){
        const digits = (q||'').replace(/[^0-9]/g,'');
        return digits.length >= 6;
    }

    async function listAll(){
        clearBody();
        const client = ensureSupabase();
        setSectionVisible(true);
        if (!client){
            renderEmpty('Configura Supabase (scripts/config.js)');
            return;
        }
        const { data, error } = await client
        .from("Clientes")
        .select('*');
        if (error){
            console.error(error);
            renderEmpty('Error al cargar');
            return;
        }
        if (!data || data.length === 0){
            renderEmpty('No hay usuarios');
            return;
        }
        const b = $('usuariosBody');
        for (const u of data){
            b.appendChild(renderRow(u));
        }
    }


    async function searchUsers(){
        clearBody();
        const q = ($('q')?.value || '').trim();
        setSectionVisible(true);
        if (!q){ renderEmpty('Ingresa un teléfono o nombre'); return; }
        const client = ensureSupabase();
        if (!client){
            renderEmpty('Configura Supabase (scripts/config.js)');
            return;
        }
        let query = client
                    .from("Clientes")
                    .select('*');

        if (isPhoneLike(q)){
            const digits = q.replace(/[^0-9]/g,'');
            query = query.ilike("Telef", `%${digits}%`);
        } else {
            query = query.ilike("Nombre", `${q}%`);
        }

        const { data, error } = await query
        .order("Fecha_creacion", { ascending:false });
        if(error){
            console.error(error);
            renderEmpty('Error en la búsqueda');
            return;
        }
        if(!data||data.length === 0){
            renderEmpty('Sin resultados');
            return;
        }
        const b = $('usuariosBody');
        for (const u of data){
            b.appendChild(renderRow(u));
        }
    }

    async function editUser(u){
        const client = ensureSupabase();
        if (!client){
            alert('Configura Supabase');
            return;
        }
        const nuevoNombre = prompt('Nuevo nombre:', u['Nombre'] ?? '');
        if (nuevoNombre === null) return;

        const nuevoTel = prompt('Nuevo teléfono:', u['Telef'] ?? '');
        if (nuevoTel === null) return;

        const nuevoPuntos = prompt('Actualizacion de puntos:', u['Puntos'] ?? '');
        if (nuevoPuntos === null) return;

        const { error } = await client
        .from("Clientes")
        .update({ Nombre: nuevoNombre, Telef: nuevoTel, Puntos: nuevoPuntos })
        .eq("Telef", u['Telef']);
        if (error){
            alert('Error al actualizar');
            return;
        }
        await listAll();
    }

    async function deleteUser(u){
        const client = ensureSupabase();
        if (!client){
            alert('Configura Supabase');
            return;
        }
        if (!confirm('¿Eliminar usuario?'))return;

        const { error } = await client
        .from("Clientes")
        .delete()
        .eq("Telef", u['Telef']);
        if (error){
            alert('Error al eliminar');
            return;
        }
        await listAll();
    }

    function init(){
        const btnBuscar = $('btnBuscar');
        const btnVerTodos = $('btnVerTodos');
        const input = $('q');
        if (btnBuscar) btnBuscar.onclick = searchUsers;
        if (btnVerTodos) btnVerTodos.onclick = listAll;
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); searchUsers(); } });
    }

    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();