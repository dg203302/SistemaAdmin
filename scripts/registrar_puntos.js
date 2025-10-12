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
            alert('Configura Supabase');
            return;
        }

        const nuevoConsumo = prompt('Ingrese el monto:');
        if (nuevoConsumo === null) return;

        const {data, error} = await client
        .from("Historial_Puntos")
        .insert([{
            Telef_cliente: u["Telef"],
            Fecha_Asing: new Date().toISOString(),
            Cantidad_Puntos: calculo_puntos(nuevoConsumo),
            Monto_gastado: nuevoConsumo
        }]);
        if (error) {
            alert('Error al registrar consumo');
            console.error(error);
        }
        else{
            const {data, error} = await client
            .from("Clientes")
            .update({ Puntos: u["Puntos"] + calculo_puntos(nuevoConsumo) })
            .eq("Telef", u['Telef'])
            if(error){
                alert("Error al registrar consumo en el lado del cliente")
                console.log(error)
            }
            else{
                alert("puntos asignados")
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