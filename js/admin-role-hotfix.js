(() => {
  const roleMeta = {
    user: { label: 'Користувач', desc: 'Базове шифрування файлів', icon: 'assets/role-user.svg' },
    operator: { label: 'Оператор', desc: 'Розшифрування в межах контуру', icon: 'assets/role-operator.svg' },
    admin: { label: 'Адміністратор', desc: 'Керування користувачами і контурами', icon: 'assets/role-admin.svg' },
    super_admin: { label: 'Суперадміністратор', desc: 'Повні права системи', icon: 'assets/role-superadmin.svg' }
  };

  function normalizeRoleText(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('супер') || s.includes('super')) return 'super_admin';
    if (s.includes('адмін') || s.includes('admin')) return 'admin';
    if (s.includes('оператор') || s.includes('operator')) return 'operator';
    return 'user';
  }

  function openRoleModal(button) {
    const modal = document.getElementById('userActionModal');
    const kicker = document.getElementById('actionModalKicker');
    const title = document.getElementById('actionModalTitle');
    const sub = document.getElementById('actionModalSub');
    const body = document.getElementById('actionModalBody');
    const A = window.rebusAdmin;
    const row = button.closest('tr[data-id]');
    if (!modal || !kicker || !title || !sub || !body || !A || !row) return;

    const id = row.dataset.id;
    const marker = row.children[0]?.textContent?.trim() || 'Користувач';
    const email = row.querySelector('.email-main')?.textContent?.trim() || '';
    const currentRole = normalizeRoleText(button.textContent);

    kicker.textContent = 'Зміна ролі';
    title.textContent = marker;
    sub.textContent = `${email} · поточна роль: ${roleMeta[currentRole].label}`;
    body.className = 'action-grid role-picker-grid';
    body.innerHTML = Object.entries(roleMeta).map(([role, meta]) => {
      const current = role === currentRole;
      return `
        <button class="action-tile role-choice-tile role-choice-card ${current ? 'current-role' : ''}" data-action="role" data-value="${role}" data-id="${A.esc(id)}" type="button">
          ${current ? '<span class="current-role-badge">Поточна роль</span>' : ''}
          <span class="role-choice-icon" aria-hidden="true"><img src="${meta.icon}" alt=""></span>
          <div>
            <strong>${meta.label}</strong>
            <small>${meta.desc}</small>
          </div>
        </button>`;
    }).join('');
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
  }

  document.addEventListener('click', (event) => {
    const roleBtn = event.target.closest('[data-open-role]');
    if (!roleBtn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openRoleModal(roleBtn);
  }, true);
})();
