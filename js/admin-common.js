(function(){
  const cfg = window.REBUS_CONFIG || {};
  const STATUS_LABELS = { active:'Активний', inactive:'Неактивний', deleted:'Видалений' };
  const ROLE_LABELS = { user:'Користувач', admin:'Адміністратор', super_admin:'Суперадміністратор', 'super-admin':'Суперадміністратор' };
  function normalizeRole(v){
    const s = String(v || 'user').toLowerCase().replace(/-/g,'_');
    if (s.includes('super')) return 'super_admin';
    if (s === 'admin' || s === 'administrator') return 'admin';
    return 'user';
  }
  function roleLabel(v){ return ROLE_LABELS[normalizeRole(v)] || 'Користувач'; }
  function normalizeStatus(row){
    const raw = String(row?.status || '').toLowerCase();
    if (raw === 'deleted' || row?.deleted_at) return 'deleted';
    if (raw === 'inactive' || row?.is_active === false) return 'inactive';
    return 'active';
  }
  function statusLabel(v){ return STATUS_LABELS[v] || 'Активний'; }
  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
  function fmtDate(v){
    if (!v) return '—';
    try { return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)); } catch { return '—'; }
  }
  function initials(name,email){
    const s = (name || email || 'A').trim();
    return s.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  }
  function mapUser(row){
    const meta = row?.raw_user_meta_data || row?.user_metadata || {};
    const email = row?.email || meta.email || '';
    const role = normalizeRole(row?.role);
    const status = normalizeStatus(row);
    const name = row?.full_name || row?.name || meta.full_name || meta.name || email;
    return {
      id: row?.id || row?.user_id || email,
      marker: row?.marker || row?.callsign || '—',
      email,
      full_name: name,
      avatar_url: row?.avatar_url || row?.photo_url || row?.picture || meta.avatar_url || meta.picture || '',
      role, status,
      is_active: status === 'active',
      last_login: row?.last_login || row?.last_sign_in_at || null,
      created_at: row?.created_at || null,
      source: row?.source || 'profiles',
      raw: row
    };
  }
  function currentAdminDisplay(session, admin){
    const meta = session?.user?.user_metadata || {};
    const email = session?.user?.email || admin?.email || '';
    const role = normalizeRole(admin?.role || (admin?.marker === 'SUPER-ADMIN' ? 'super_admin' : 'admin'));
    return { email, role, roleText: roleLabel(role), name: meta.full_name || meta.name || admin?.full_name || email, avatar_url: meta.avatar_url || meta.picture || admin?.avatar_url || '' };
  }
  function renderAdminProfile(el, session, admin){
    if (!el) return;
    const u = currentAdminDisplay(session, admin);
    const avatar = u.avatar_url ? `<img class="admin-avatar" src="${esc(u.avatar_url)}" alt="avatar">` : `<div class="admin-avatar fallback">${esc(initials(u.name,u.email))}</div>`;
    el.innerHTML = `<div class="admin-profile">${avatar}<div><div class="admin-profile-name">${esc(u.name)}</div><div class="admin-profile-email">${esc(u.email)}</div><div class="admin-profile-role">${esc(u.roleText)}</div></div></div>`;
  }
  async function getAdminContext(){
    const {requireAdmin,getAal} = window.rebusAuth;
    const ctx = await requireAdmin();
    if(!ctx) return null;
    if(await getAal() !== 'aal2'){ location.href='verify-2fa.html'; return null; }
    return ctx;
  }
  async function logEvent(supabase, payload){
    const data = { ...payload, created_at: new Date().toISOString() };
    try { await supabase.from('activity_logs').insert(data); } catch(e) {}
    try { await supabase.from('rebus_events').insert({marker:data.marker, email:data.email, action:data.action, file_name:data.file_name || null, status:data.status || 'success'}); } catch(e) {}
  }
  window.rebusAdmin = { esc, fmtDate, initials, mapUser, normalizeRole, roleLabel, normalizeStatus, statusLabel, currentAdminDisplay, renderAdminProfile, getAdminContext, logEvent };
})();
