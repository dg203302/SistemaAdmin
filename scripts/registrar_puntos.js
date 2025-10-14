(function(){
    /** @type {import('@supabase/supabase-js').SupabaseClient | null} */
    let supabaseClient = null;

    // SweetAlert2: helper para toasts (carga por CDN si no existe)
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

        const tdActions = document.createElement('td');
        tdActions.className = 'right';

        const wrap = document.createElement('span');
        wrap.className = 'row-actions';

        const btnReg = document.createElement('button');
        btnReg.className = 'btn small';
        btnReg.textContent = 'Registrar Consumo';
        btnReg.onclick = () => regGasto(u);

        wrap.appendChild(btnReg);
        tdActions.appendChild(wrap);
        tr.appendChild(tdActions);

        return tr;
    }

    function isPhoneLike(q){
        const digits = (q||'').replace(/[^0-9]/g,'');
        return digits.length >= 6;
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

    async function regGasto(u){
        const client = ensureSupabase();
        if (!client){
            showToast('info', 'Configura Supabase');
            return;
        }
        const Swal = await ensureSwal();
        const { isConfirmed, value } = await Swal.fire({
            title: 'Registrar consumo',
            input: 'number',
            inputLabel: 'Monto gastado',
            inputPlaceholder: 'Ej: 5000',
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar',
            showCancelButton: true,
            inputAttributes: { min: '0', step: '1', inputmode: 'numeric' },
            inputValidator: (v) => {
                if (v === '' || v === null || v === undefined) return 'Ingrese el monto';
                if (isNaN(v)) return 'Ingrese un número válido';
                if (Number(v) < 0) return 'El monto no puede ser negativo';
                return undefined;
            }
        });
        if (!isConfirmed) return;
        const nuevoConsumo = Number(value);

        const {data, error} = await client
        .from("Historial_Puntos")
        .insert([{
            Telef_cliente: u["Telef"],
            Cantidad_Puntos: calculo_puntos(nuevoConsumo),
            Monto_gastado: nuevoConsumo
        }]);
        if (error) {
            showToast('error', 'Error al registrar consumo');
            console.error(error);
        }
        else{
            const {data, error} = await client
            .from("Clientes")
            .update({ Puntos: u["Puntos"] + calculo_puntos(nuevoConsumo) })
            .eq("Telef", u['Telef'])
            if(error){
                showToast('error', 'Error al registrar consumo en el lado del cliente');
                console.log(error)
            }
            else{
                showToast('success', 'Puntos asignados');
                await searchUsers();
            }
        }
    }

    function calculo_puntos(Consumo){
        if (Consumo<1000){
            return parseInt(0)
        }
        else{
            return parseInt(Consumo/1000);
        }
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