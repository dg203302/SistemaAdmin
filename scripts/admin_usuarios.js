import { hash_alfanum } from './hashing.js';
import { encriptar } from './encriptado.js';
import { desencriptar } from './encriptado.js';
(function(){
    /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
    let supabaseClient = null;

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

    function $(id){ return document.getElementById(id); }

    function ensureSupabase(){
        if (window.supabaseClient) { supabaseClient = window.supabaseClient; return supabaseClient; }
        if (!window.__supabaseConfigured) return null;
        if (supabaseClient) return supabaseClient;
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        return supabaseClient;
    }
    function setCreationSectionVisible(v){ const s = $('crearUsuarioSection'); if (s) s.hidden = !v; }
    function setSectionVisible(v){ const s = $('usuariosSection'); if (s) s.hidden = !v; }
    function clearBody(){ const b = $('usuariosBody'); if (b) b.innerHTML = ''; }
    function renderEmpty(msg){
        const b = $('usuariosBody'); if (!b) return;
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5; td.innerHTML = `<div class="empty">${msg}</div>`;
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

        const btnHistorial = document.createElement('button');
        btnHistorial.className = 'btn small';
        btnHistorial.textContent = 'Historial';
        btnHistorial.onclick = () => VerHistorial(u); 

        wrap.appendChild(btnEdit);
        wrap.appendChild(btnDelete);
        wrap.appendChild(btnHistorial);
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

        function clearEditor(){ const ed = $('editorContainer'); if (ed){ ed.hidden = true; ed.innerHTML = ''; } }
        async function editUser(u){
                const client = ensureSupabase();
        if (!client){ showToast('info', 'Configura Supabase'); return; }
                const ed = $('editorContainer'); if (!ed) return; ed.hidden = false; ed.innerHTML = '';
                const nombreVal = u['Nombre'] ?? '';
                const telVal = u['Telef'] ?? '';
                const puntosVal = u['Puntos'] ?? '';
                const creadoVal = u['Fecha_creacion'] ? new Date(u['Fecha_creacion']).toLocaleString() : '';
                ed.innerHTML = `
                <div class="inline-card" role="region" aria-label="Editar usuario">
                    <div class="inline-header">
                        <div class="inline-title">Editar usuario</div>
                        <button type="button" class="icon-btn" id="btnCloseEditor" aria-label="Cerrar">✕</button>
                    </div>
                    <div class="inline-body">
                        <form class="inline-form" id="inlineForm">
                            <div class="field field-nombre">
                                <label for="fNombre">Nombre</label>
                                <input id="fNombre" type="text" value="${nombreVal.replace(/"/g,'&quot;')}" required />
                            </div>
                            <div class="field field-telefono">
                                <label for="fTel">Teléfono</label>
                                <input id="fTel" type="tel" inputmode="numeric" pattern="[0-9]{7,15}" value="${telVal.replace(/"/g,'&quot;')}" required />
                            </div>
                            <div class="field field-puntos">
                                <label for="fPuntos">Puntos</label>
                                <input id="fPuntos" type="number" min="0" step="1" value="${String(puntosVal).replace(/"/g,'&quot;')}" />
                            </div>
                            <div class="field field-creacion">
                                <label>Creación</label>
                                <input type="text" value="${creadoVal.replace(/"/g,'&quot;')}" disabled />
                            </div>
                            <div id="formError" class="error" hidden></div>
                            <div class="inline-actions">
                                <button type="submit" class="btn primary" id="btnSubmit">Guardar</button>
                                <button type="button" class="btn" id="btnCancelar">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>`;

                // Scroll to the editor, compensating sticky header (~80px)
                try {
                    const top = ed.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top, behavior: 'smooth' });
                } catch(_) {}

                const form = $('inlineForm');
                const btnCancelar = $('btnCancelar');
                const btnClose = $('btnCloseEditor');
                const errorBox = $('formError');
                if (btnCancelar) btnCancelar.onclick = () => clearEditor();
                if (btnClose) btnClose.onclick = () => clearEditor();
                form.addEventListener('keydown', (e)=>{ if (e.key === 'Escape'){ e.preventDefault(); clearEditor(); } });
                // Focus first field after render
                requestAnimationFrame(() => { try { $('fNombre')?.focus({ preventScroll: true }); } catch(_) {} });

                form.onsubmit = async (e) => {
                        e.preventDefault();
                        const Nombre = $('fNombre').value.trim();
                        const Telef = $('fTel').value.replace(/[^0-9]/g,'');
                        const Puntos = $('fPuntos').value === '' ? null : Number($('fPuntos').value);
                        if (!Nombre){ errorBox.hidden = false; errorBox.textContent = 'El nombre es obligatorio.'; return; }
                        if (!Telef){ errorBox.hidden = false; errorBox.textContent = 'El teléfono es obligatorio.'; return; }
                        errorBox.hidden = true; errorBox.textContent = '';
                        const btn = $('btnSubmit'); const old = btn.textContent; btn.textContent = 'Guardando...'; btn.disabled = true;
                        const { error } = await client.from('Clientes').update({ Nombre, Telef, Puntos }).eq('Telef', u['Telef']);
                        btn.textContent = old; btn.disabled = false;
                        if (error){ errorBox.hidden = false; errorBox.textContent = 'Error al actualizar.'; showToast('error', 'No se pudo actualizar'); return; }
                        showToast('success', 'Usuario actualizado');
                        clearEditor();
                        await listAll();
                };
        }

    async function deleteUser(u){
        const client = ensureSupabase();
        if (!client){
            showToast('info', 'Configura Supabase');
            return;
        }
        if (!confirm('¿Eliminar usuario?'))return;

        const { error } = await client
        .from("Clientes")
        .delete()
        .eq("Telef", u['Telef']);
        if (error){
            showToast('error', 'Error al eliminar');
            return;
        }
        showToast('success', 'Usuario eliminado');
        await listAll();
    }

    async function VerHistorial(u){
        const client = ensureSupabase();
        if (!client){
            showToast('info', 'Configura Supabase');
            return;
        }
        const { data, error } = await client
        .from("Historial_Puntos")
        .select("*")
        .eq("Telef_cliente", u['Telef']);
        if (error){
            showToast('error', 'Error al obtener historial');
            return;
        }

        cargarTablaHist(data || []);
    }

    async function cargarTablaHist(ent){
        const sec = document.querySelector('#historialSection');
        if (sec && sec.parentNode) {
            sec.parentNode.removeChild(sec);
        }
        // ent is expected to be an array of historial objects
        // Ensure the section/container exists in the DOM
        let section = document.getElementById('historialSection');
        if (!section){
            // create a section with same structure as usuariosSection
            section = document.createElement('section');
            section.id = 'historialSection';
            section.className = 'card';

            const header = document.createElement('div');
            header.className = 'card__header';
            const title = document.createElement('h2');
            title.className = 'section-title';
            title.id = 'historialTitle';
            title.textContent = 'Historial de Puntos';
            header.appendChild(title);

            
            const subtitle = document.createElement('div');
            subtitle.className = 'muted';
            if (ent && ent.length > 0){
                const nombre = await obtenerNombre(ent[0].Telef_cliente);
                subtitle.textContent = `Nombre: ${nombre} Teléfono: ${ent[0].Telef_cliente}`;
            }
            header.appendChild(subtitle);
            
            const btnCerrar = document.createElement('button');
            btnCerrar.className = 'btn ghost';
            btnCerrar.type = 'button';
            btnCerrar.textContent = 'Cerrar';
            btnCerrar.onclick = () => {
                const sec = btnCerrar.closest('#historialSection') || section;
                if (sec && sec.parentNode) {
                    sec.parentNode.removeChild(sec);
                }
            };
            header.appendChild(btnCerrar);
            
            section.appendChild(header);

            const container = document.createElement('div');
            container.id = 'historialContainer';
            section.appendChild(container);
            const usuariosSection = document.getElementById('usuariosSection');
            if (usuariosSection && usuariosSection.parentNode){
                usuariosSection.parentNode.insertBefore(section, usuariosSection.nextSibling);
            } else {
                document.body.appendChild(section);
            }
        }

        // create or replace table using same structure/classes as usuarios table
        const container = document.getElementById('historialContainer') || section;
        container.innerHTML = '';

        // wrap table in same markup
        const tableWrap = document.createElement('div');
        tableWrap.className = 'table-wrap';

        const table = document.createElement('table');
        table.className = 'table';

        // create header with the requested columns: Telefono Cliente, Nombre Cliente, Fecha Asignacion, Cantidad Puntos, Monto Gastado
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Fecha Asignacion', 'Cantidad Puntos', 'Monto Gastado'];
        for (const h of headers){
            const th = document.createElement('th');
            th.textContent = h;
            // apply same classes as usuarios table where appropriate
            if (h === 'Fecha Asignacion') th.className = 'hide-sm';
            if (h === 'Monto Gastado') th.className = 'right';
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        tbody.id = 'historialBody';

        if (!ent || ent.length === 0){
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = headers.length;
            td.innerHTML = '<div class="empty">Sin historial</div>';
            tr.appendChild(td);
            tbody.appendChild(tr);
        } else {
            for (const row of ent){
                const tr = document.createElement('tr');

                // Fecha Asignacion (hide on small)
                const tdFecha = document.createElement('td');
                tdFecha.className = 'hide-sm';
                tdFecha.textContent = row['Fecha_asignacion'] ? new Date(row['Fecha_asignacion']).toLocaleString() : (row['Fecha_Asing'] ? new Date(row['Fecha_Asing']).toLocaleString() : (row['Fecha'] ? new Date(row['Fecha']).toLocaleString() : ''));
                tr.appendChild(tdFecha);

                // Cantidad Puntos
                const tdPuntos = document.createElement('td');
                tdPuntos.textContent = (row['Cantidad_Puntos'] ?? row['Puntos'] ?? '') + '';
                tr.appendChild(tdPuntos);

                // Monto Gastado (align right)
                const tdMonto = document.createElement('td');
                tdMonto.className = 'center';
                tdMonto.textContent = (row['Monto_gastado'] ?? row['Monto'] ?? '') + '';
                tr.appendChild(tdMonto);

                tbody.appendChild(tr);
            }
        }

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);
    }

    async function obtenerNombre(tele){
        const client = ensureSupabase();
        if (!client) return '';
        const {data, error} = await client
        .from("Clientes")
        .select("Nombre")
        .eq("Telef",tele)
        .single();
        if(error){
            console.error("error al obtener el nombre", error);
            return '';
        }
        return data ? data.Nombre : '';
    }
    
    async function onCrearUsuarioSubmit(e){
        e.preventDefault();
        const client = ensureSupabase();
        if (!client){
            showToast('info', 'Configura Supabase (scripts/config.js)');
            return;
        }
    
        const nombre = $('cuNombre')?.value?.trim() || '';
        const telefono = $('cuTelefono')?.value || '';
        const password = $('cuPassword')?.value || '';
        const r1 = $('cuSeg1')?.value?.trim() || '';
        const r2 = $('cuSeg2')?.value?.trim() || '';
        const r3 = $('cuSeg3')?.value?.trim() || '';
       if (verificar_contra(password)){
        let cont_hash = hash_alfanum(password);
        let r1_enc = encriptar(r1);
        let r2_enc = encriptar(r2);
        let r3_enc = encriptar(r3);
        const { error } = await client
        .from("Clientes")
        .insert({ Nombre: nombre, Telef: telefono, Contra: cont_hash, Resp_1: r1_enc, Resp_2: r2_enc, Resp_3: r3_enc });
        if (error){
            showToast('error', 'Error al crear usuario');
            return;
        }
        showToast('success', 'Cliente creado');
        const form = $('crearUsuarioForm');
        if (form) form.reset();
        setCreationSectionVisible(false);
       }
    }
    
    function verificar_contra(contra){
        if (contra.length < 4){
            showToast('warning', 'La Contraseña debe tener como minimo 4 caracteres');
            return false
        }
        else if (contra.length > 10){
            showToast('warning', 'La contraseña no puede superar los 10 caracteres');
            return false
        }
        else if (!(/\d/.test(contra))){
            showToast('warning', 'La contraseña debe contener por lo menos un número');
            return false
        }
        else if (!(/[-_:;!@#$%^&*]/.test(contra))){
            showToast('warning', 'La contraseña debe tener por lo menos un caracter especial: - _ : ; ! @ # $ % ^ & * ')
            return false
        }
        else{
            return true
        }
    }

    function init(){
        const btnBuscar = $('btnBuscar');
        const btnVerTodos = $('btnVerTodos');
        const btnAgregar = $('btnAgregar');
        const input = $('q');
        if (btnBuscar) btnBuscar.onclick = searchUsers;
        if (btnVerTodos) btnVerTodos.onclick = listAll;

        // Vincular el botón de cerrar resultados al iniciar (no solo al hacer clic en "Agregar")
        const btnCerrarResultados = $('btnCerrarResultados');
        if (btnCerrarResultados) btnCerrarResultados.onclick = () => { clearBody(); setSectionVisible(false); };

        if (btnAgregar) btnAgregar.onclick = () => {
            setCreationSectionVisible(true);
            // Scroll to create section (compensa header sticky ~80px)
            const addSection = $('crearUsuarioSection');
            if (addSection){
                try {
                    const top = addSection.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top, behavior: 'smooth' });
                } catch(_) {}
            }
            // Focus primer campo
            requestAnimationFrame(() => { try { $('cuNombre')?.focus({ preventScroll: true }); } catch(_) {} });

            const btncerrar = $('btnCerrarAgregar');
            if (btncerrar) btncerrar.onclick = () => { setCreationSectionVisible(false); };

            // Bind submit una sola vez
            const form = $('crearUsuarioForm');
            if (form && !form.dataset.bound){
                form.addEventListener('submit', onCrearUsuarioSubmit);
                form.dataset.bound = '1';
            }
        };
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); searchUsers(); } });
    }

    if (document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();

