(() => {
  function setupRoleHotfix(){
    const modal = document.getElementById('userActionModal');
    const kicker = document.getElementById('actionModalKicker');
    const title = document.getElementById('actionModalTitle');
    const sub = document.getElementById('actionModalSub');
    const body = document.getElementById('actionModalBody');
    const A = window.rebusAdmin;
    if (!modal || !kicker || !title || !sub || !body || !A) return;

    const roles = [
      { value: 'user', label: 'Користувач', desc: 'Базове шифрування файлів', icon: 'assets/role-user.svg' },
      { value: 'operator', label: 'Оператор', desc: 'Розшифрування в межах контуру', icon: 'assets/role-operator.svg' },
      { value: 'admin', label: 'Адміністратор', desc: 'Керування користувачами і контурами', icon: 'assets/role-admin.svg' },
      { value: 'super_admin', label: 'Суперадміністратор', desc: 'Повні права системи', icon: 'assets/role-superadmin.svg' }
    ];

    function rowUser(button){
      const row = button.closest('tr[data-id]');
      if (!row) return null;
      const roleButton = row.querySelector('.role-edit-btn, .role-badge');
      const roleClass = [...(roleButton?.classList || [])].find(c => c.startsWith('role-') && c !== 'role-badge' && c !== 'role-edit-btn');
      const rawRole = roleClass ? roleClass.replace('role-', '') : roleButton?.textContent?.trim();
      return {
        id: row.dataset.id,
        marker: row.children[0]?.textContent?.trim() || 'Користувач',
        email: row.querySelector('.email-main')?.textContent?.trim() || '',
        role: A.normalizeRole(rawRole)
      };
    }

    function showModal(){
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('open'));
    }

    document.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-open-role]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const user = rowUser(btn);
      if (!user) return;

      kicker.textContent = 'Зміна ролі';
      title.textContent = user.marker;
      sub.textContent = `${user.email} · поточна роль: ${A.roleLabel(user.role)}`;
      body.className = 'role-modal-grid';
      body.innerHTML = roles.map(role => {
        const current = role.value === user.role;
        return `
          <button class="role-choice-card ${current ? 'current-role' : ''}" data-action="role" data-value="${role.value}" data-id="${A.esc(user.id)}" type="button">
            ${current ? '<span class="current-role-badge">Поточна роль</span>' : ''}
            <span class="role-choice-icon"><img src="${role.icon}?v=20260624" alt=""></span>
            <div>
              <strong>${role.label}</strong>
              <small>${role.desc}</small>
            </div>
          </button>`;
      }).join('');
      showModal();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupRoleHotfix);
  else setupRoleHotfix();
})();
