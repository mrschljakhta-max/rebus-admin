(function () {
  const state = {
    users: [],
    filtered: [],
    filter: 'all',
    query: '',
    sortKey: 'created_at',
    sortDir: 'desc',
    page: 1,
    perPage: 8,
    loadError: null,
  };

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const normalizeStatus = (user) => {
    const raw = String(user.status || '').toLowerCase();
    if (raw === 'deleted' || user.deleted_at) return 'deleted';
    if (raw === 'inactive') return 'inactive';
    if (raw === 'active') return 'active';
    if (user.is_active === false) return 'inactive';
    return 'active';
  };

  const statusLabel = (status) => ({ active: 'Активний', inactive: 'Неактивний', deleted: 'Видалений' }[status] || 'Активний');
  const roleLabel = (role) => String(role || 'user').toLowerCase() === 'admin' ? 'Admin' : 'User';

  function setCurrentAdmin(user, admin) {
    const avatar = $('currentAvatar');
    const name = $('currentName');
    const email = $('currentEmail');
    const role = $('currentRole');
    const meta = user?.user_metadata || {};
    const displayName = meta.full_name || meta.name || admin?.full_name || user?.email || 'Адміністратор';
    const picture = meta.avatar_url || meta.picture || '';

    if (avatar) {
      if (picture) {
        avatar.innerHTML = `<img src="${escapeHtml(picture)}" alt="Аватар">`;
      } else {
        avatar.textContent = (displayName || 'A').trim().charAt(0).toUpperCase();
      }
    }
    if (name) name.textContent = displayName;
    if (email) email.textContent = user?.email || '';
    if (role) role.textContent = String(admin?.role || 'admin').toLowerCase() === 'admin' ? 'Адміністратор' : 'Користувач';
  }

  async function logEvent(supabase, payload) {
    try {
      await supabase.from('rebus_events').insert({
        created_at: new Date().toISOString(),
        marker: payload.marker || null,
        email: payload.email || null,
        action: payload.action || 'user_update',
        file_name: 'users.html',
        status: payload.status || 'success',
      });
    } catch (_) {}
  }

  async function loadUsers(supabase) {
    state.loadError = null;
    let result = await supabase
      .from('rebus_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (result.error) {
      state.loadError = result.error.message || 'Помилка завантаження';
      // Fallback: якщо RLS ще не відкритий для rebus_profiles, показуємо хоча б адмін-доступи.
      const fallback = await supabase
        .from('rebus_admin_access')
        .select('*')
        .order('created_at', { ascending: false });
      if (!fallback.error && Array.isArray(fallback.data)) {
        state.users = fallback.data.map((u) => ({ ...u, role: u.role || 'admin', source_table: 'rebus_admin_access' }));
        return;
      }
      state.users = [];
      return;
    }

    state.users = Array.isArray(result.data) ? result.data : [];
  }

  function applyFilters() {
    const q = state.query.trim().toLowerCase();
    let rows = [...state.users];

    if (state.filter !== 'all') {
      rows = rows.filter((u) => normalizeStatus(u) === state.filter);
    }

    if (q) {
      rows = rows.filter((u) => {
        const hay = [u.marker, u.email, u.full_name, u.name, u.role, normalizeStatus(u)].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => {
      const key = state.sortKey;
      let av = key === 'status' ? normalizeStatus(a) : (a[key] ?? '');
      let bv = key === 'status' ? normalizeStatus(b) : (b[key] ?? '');
      if (key.includes('_at') || key === 'last_login') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return state.sortDir === 'asc' ? -1 : 1;
      if (av > bv) return state.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    state.filtered = rows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
  }

  function renderCounters() {
    const counts = {
      all: state.users.length,
      active: state.users.filter((u) => normalizeStatus(u) === 'active').length,
      inactive: state.users.filter((u) => normalizeStatus(u) === 'inactive').length,
      deleted: state.users.filter((u) => normalizeStatus(u) === 'deleted').length,
    };
    ['all', 'active', 'inactive', 'deleted'].forEach((key) => {
      const el = document.querySelector(`[data-filter="${key}"] .filter-count`);
      if (el) el.textContent = counts[key];
    });
  }

  function renderTable() {
    const body = $('usersBody');
    if (!body) return;
    applyFilters();
    renderCounters();

    const start = (state.page - 1) * state.perPage;
    const rows = state.filtered.slice(start, start + state.perPage);

    if (state.loadError && !state.users.length) {
      body.innerHTML = `<tr><td colspan="7" class="table-empty table-error">Помилка завантаження: ${escapeHtml(state.loadError)}</td></tr>`;
    } else if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="table-empty">Користувачів не знайдено</td></tr>';
    } else {
      body.innerHTML = rows.map((u) => {
        const status = normalizeStatus(u);
        const role = roleLabel(u.role);
        const rowId = escapeHtml(u.id || u.email || u.marker || '');
        return `<tr data-user-id="${rowId}">
          <td>${escapeHtml(u.marker || '—')}</td>
          <td>
            <div class="user-cell">
              <span class="mini-avatar">${escapeHtml((u.full_name || u.email || 'U').charAt(0).toUpperCase())}</span>
              <div><strong>${escapeHtml(u.full_name || u.email || '—')}</strong><small>${escapeHtml(u.email || '—')}</small></div>
            </div>
          </td>
          <td><span class="role-badge ${role.toLowerCase()}">${role}</span></td>
          <td><span class="status-badge ${status}"><i></i>${statusLabel(status)}</span></td>
          <td>${formatDate(u.last_login || u.last_sign_in_at)}</td>
          <td>${formatDate(u.created_at)}</td>
          <td class="row-actions">
            <button class="dots-btn" type="button" data-menu="${rowId}" aria-label="Дії">⋮</button>
            <div class="action-menu" data-menu-panel="${rowId}">
              <button type="button" data-action="active" data-id="${rowId}">Активувати</button>
              <button type="button" data-action="inactive" data-id="${rowId}">Деактивувати</button>
              <button type="button" data-action="admin" data-id="${rowId}">Зробити адміном</button>
              <button type="button" data-action="user" data-id="${rowId}">Зробити користувачем</button>
              <button type="button" class="danger" data-action="deleted" data-id="${rowId}">Видалити</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    const from = state.filtered.length ? start + 1 : 0;
    const to = Math.min(start + state.perPage, state.filtered.length);
    const summary = $('usersSummary');
    if (summary) summary.textContent = `Показано: ${from}-${to} із ${state.filtered.length} користувачів`;
    renderPagination();
    renderWarning();
  }

  function renderWarning() {
    const el = $('usersWarning');
    if (!el) return;
    if (state.loadError && state.users.length) {
      el.textContent = `Увага: rebus_profiles недоступна (${state.loadError}). Показано резервні дані з rebus_admin_access.`;
      el.hidden = false;
    } else if (state.loadError) {
      el.textContent = `Supabase RLS блокує читання rebus_profiles: ${state.loadError}. Потрібно застосувати SQL-політики з архіву.`;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function renderPagination() {
    const el = $('usersPagination');
    if (!el) return;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    const pages = [];
    pages.push(`<button type="button" ${state.page === 1 ? 'disabled' : ''} data-page="prev">‹</button>`);
    for (let i = 1; i <= totalPages; i++) {
      pages.push(`<button type="button" class="${state.page === i ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    pages.push(`<button type="button" ${state.page === totalPages ? 'disabled' : ''} data-page="next">›</button>`);
    el.innerHTML = pages.join('');
  }

  function findUserById(id) {
    return state.users.find((u) => String(u.id || u.email || u.marker || '') === String(id));
  }

  async function updateUser(supabase, id, action) {
    const user = findUserById(id);
    if (!user) return;
    const table = user.source_table || 'rebus_profiles';
    const matchColumn = user.id ? 'id' : 'email';
    const matchValue = user.id || user.email;
    let patch = {};

    if (action === 'active') patch = { is_active: true, status: 'active', deleted_at: null };
    if (action === 'inactive') patch = { is_active: false, status: 'inactive' };
    if (action === 'deleted') patch = { is_active: false, status: 'deleted', deleted_at: new Date().toISOString() };
    if (action === 'admin') patch = { role: 'admin' };
    if (action === 'user') patch = { role: 'user' };

    const statusEl = $('usersStatus');
    if (statusEl) { statusEl.textContent = 'Оновлюю користувача...'; statusEl.className = 'status'; }

    let { error } = await supabase.from(table).update(patch).eq(matchColumn, matchValue);
    if (error && (String(error.message).includes('status') || String(error.message).includes('deleted_at'))) {
      const fallbackPatch = { ...patch };
      delete fallbackPatch.status;
      delete fallbackPatch.deleted_at;
      const retry = await supabase.from(table).update(fallbackPatch).eq(matchColumn, matchValue);
      error = retry.error;
    }

    if (error) {
      if (statusEl) { statusEl.textContent = error.message || 'Не вдалося оновити користувача.'; statusEl.className = 'status error'; }
      return;
    }

    Object.assign(user, patch);
    await logEvent(supabase, { marker: user.marker, email: user.email, action: `user_${action}`, status: 'success' });
    if (statusEl) { statusEl.textContent = 'Користувача оновлено.'; statusEl.className = 'status ok'; }
    renderTable();
  }

  function wireEvents(supabase) {
    const search = $('usersSearch');
    if (search) search.addEventListener('input', (e) => { state.query = e.target.value; state.page = 1; renderTable(); });

    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter = btn.dataset.filter || 'all';
        state.page = 1;
        renderTable();
      });
    });

    document.querySelectorAll('[data-sort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'asc'; }
        renderTable();
      });
    });

    document.addEventListener('click', async (e) => {
      const dots = e.target.closest('[data-menu]');
      if (dots) {
        const id = dots.dataset.menu;
        document.querySelectorAll('.action-menu.open').forEach((m) => { if (m.dataset.menuPanel !== id) m.classList.remove('open'); });
        const panel = document.querySelector(`[data-menu-panel="${CSS.escape(id)}"]`);
        if (panel) panel.classList.toggle('open');
        return;
      }

      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        document.querySelectorAll('.action-menu.open').forEach((m) => m.classList.remove('open'));
        await updateUser(supabase, actionBtn.dataset.id, actionBtn.dataset.action);
        return;
      }

      if (!e.target.closest('.action-menu')) {
        document.querySelectorAll('.action-menu.open').forEach((m) => m.classList.remove('open'));
      }
    });

    const pager = $('usersPagination');
    if (pager) pager.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
      if (btn.dataset.page === 'prev') state.page = Math.max(1, state.page - 1);
      else if (btn.dataset.page === 'next') state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(btn.dataset.page) || 1;
      renderTable();
    });
  }

  window.initUsersPage = async function initUsersPage() {
    const { supabase, requireAdmin, getAal } = window.rebusAuth;
    const ctx = await requireAdmin();
    if (!ctx) return;
    if (await getAal() !== 'aal2') { location.href = 'verify-2fa.html'; return; }
    setCurrentAdmin(ctx.session.user, ctx.admin);
    await loadUsers(supabase);
    wireEvents(supabase);
    renderTable();
  };
})();
