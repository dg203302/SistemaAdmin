// Claves de Supabase
const supabaseUrl = 'https://qxbkfmvugutmggqwxhrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YmtmbXZ1Z3V0bWdncXd4aHJiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI1MTMwMSwiZXhwIjoyMDczODI3MzAxfQ.Du5jtkw2S9_gOPmV-Ca4hv9OOqDDFKceSdrqmcX4-tM';

// Exponer en window para otros scripts
window.SUPABASE_URL = supabaseUrl;
window.SUPABASE_ANON_KEY = supabaseKey;
window.__supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Crear y exponer un cliente listo para usar
window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
// Alias opcional
window.client = window.supabaseClient;
