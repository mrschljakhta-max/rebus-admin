const cfg = window.REBUS_CONFIG || {};
const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const setStatus = (text, type = '') => {
  const el = $('status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `status ${type}`;
};

async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function getAdminProfile(email) {
  const { data, error } = await supabase
    .from(cfg.ADMIN_TABLE)
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();
  if (error) return null;
  return data;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.email) {
    location.href = 'index.html';
    return null;
  }
  const admin = await getAdminProfile(session.user.email);
  if (!admin) {
    await supabase.auth.signOut();
    location.href = 'index.html?error=access_denied';
    return null;
  }
  return { session, admin };
}

async function getAuthenticatorFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return [];
  return (data?.totp || []).filter((f) => f.status === 'verified');
}

async function getAal() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel || 'aal1';
}

async function routeAfterLogin() {
  const session = await getSession();
  if (!session?.user?.email) return;

  setStatus('Перевіряю доступ адміністратора...');
  const admin = await getAdminProfile(session.user.email);
  if (!admin) {
    setStatus('Доступ заборонено. Email не додано до REBUS Admin.', 'error');
    await supabase.auth.signOut();
    return;
  }

  const factors = await getAuthenticatorFactors();
  if (!factors.length) {
    location.href = 'setup-2fa.html';
    return;
  }

  const aal = await getAal();
  if (aal !== 'aal2') {
    location.href = 'verify-2fa.html';
    return;
  }

  location.href = 'dashboard.html';
}

window.rebusAuth = { supabase, $, setStatus, getSession, requireAdmin, getAuthenticatorFactors, getAal, routeAfterLogin };
