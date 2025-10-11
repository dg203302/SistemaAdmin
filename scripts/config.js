// Claves de Supabase
const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTEzMDEsImV4cCI6MjA3MzgyNzMwMX0.Qsx0XpQaSgt2dKUaLs8GvMmH8Qt6Dp_TQM25a_WOa8E';

// Exponer en window para otros scripts
window.SUPABASE_URL = supabaseUrl;
window.SUPABASE_ANON_KEY = supabaseKey;
window.__supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Crear y exponer un cliente listo para usar
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
// Alias opcional
window.client = window.supabaseClient;
