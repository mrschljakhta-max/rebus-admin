const cfg = window.REBUS_CONFIG || {};
const supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const setStatus = (text, type = '') => {
  const el = $('authStatus') || $('status');
  if (!el) return;
  el.textContent = text || '';
  el.className = `status ${type}`;
};

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

async function getAdminProfile(email) {
  const { data, error } = await supabaseClient
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
    await supabaseClient.auth.signOut();
    location.href = 'index.html?error=access_denied';
    return null;
  }
  return { session, admin };
}

async function getAuthenticatorFactors() {
  const { data, error } = await supabaseClient.auth.mfa.listFactors();
  if (error) return [];
  return (data?.totp || []).filter((f) => f.status === 'verified');
}

async function getAal() {
  const { data } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel || 'aal1';
}

async function routeAfterLogin() {
  const session = await getSession();
  if (!session?.user?.email) return;

  setStatus('Перевіряю доступ адміністратора...');
  const admin = await getAdminProfile(session.user.email);
  if (!admin) {
    setStatus('Доступ заборонено. Email не додано до REBUS Admin.', 'error');
    await supabaseClient.auth.signOut();
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

window.rebusAuth = { supabase: supabaseClient, $, setStatus, getSession, requireAdmin, getAuthenticatorFactors, getAal, routeAfterLogin };


async function startGoogleLogin() {
  const btn = $('googleLoginBtn');
  try {
    if (btn) btn.disabled = true;
    setStatus('Відкриваю вхід через Google...');
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });
    if (error) throw error;
  } catch (error) {
    setStatus(error?.message || 'Не вдалося відкрити вхід.', 'error');
    if (btn) btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const btn = $('googleLoginBtn');
  if (btn) btn.addEventListener('click', startGoogleLogin);

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === 'access_denied') {
    setStatus('Доступ заборонено. Email не додано до REBUS Admin.', 'error');
  }

  // Важливо: автопереадресацію після входу запускаємо тільки на стартовій сторінці.
  // На verify-2fa.html/setup-2fa.html/внутрішніх сторінках своя логіка перевірки.
  // Раніше auth.js запускав routeAfterLogin() всюди, через що verify-2fa.html
  // сам себе перезавантажував і зависав на «Перевіряю доступ адміністратора...».
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isLoginPage = page === 'index.html' || page === '';
  if (isLoginPage) {
    await routeAfterLogin();
  }
});
