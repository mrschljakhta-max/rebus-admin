(() => {
  function setupUsersHotfix(){
    const modal = document.getElementById('userActionModal');
    const kicker = document.getElementById('actionModalKicker');
    const title = document.getElementById('actionModalTitle');
    const sub = document.getElementById('actionModalSub');
    const body = document.getElementById('actionModalBody');
    const A = window.rebusAdmin;
    if (!modal || !kicker || !title || !sub || !body || !A) return;

    function rowUser(button){
      const row = button.closest('tr[data-id]');
      if (!row) return null;
      const id = row.dataset.id;
      const marker = row.children[0]?.textContent?.trim() || 'Користувач';
      const email = row.querySelector('.email-main')?.textContent?.trim() || '';
      const role = row.querySelector('.role-edit-btn, .role-badge')?.textContent?.trim() || '';
      const status = row.querySelector('.status-badge')?.textContent?.trim() || '';
      const isActive = /активний/i.test(status) && !/неактивний/i.test(status);
      return { id, marker, email, role, status, isActive };
    }

    function openModal(){
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('open'));
    }

    document.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-open-status]');
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const user = rowUser(btn);
      if (!user) return;
      const nextStatus = user.isActive ? 'inactive' : 'active';
      const nextText = user.isActive ? 'Активований' : 'Неактивний';
      const nextHint = user.isActive ? 'Натисни, щоб деактивувати доступ' : 'Натисни, щоб активувати доступ';

      kicker.textContent = 'Статус користувача';
      title.textContent = user.marker;
      sub.textContent = `${user.email} · ${user.role} · ${user.status}`;
      body.classList.add('status-toggle-layout');
      body.innerHTML = `
        <button class="status-toggle-card ${user.isActive ? 'is-active' : 'is-inactive'}" data-action="status" data-value="${nextStatus}" data-id="${A.esc(user.id)}" type="button">
          <span class="status-switch" aria-hidden="true"><span></span></span>
          <div class="status-toggle-text">
            <strong>${nextText}</strong>
            <small>${nextHint}</small>
          </div>
        </button>
        <button class="delete-user-card" data-action="status" data-value="deleted" data-id="${A.esc(user.id)}" type="button">
          <span class="trash-icon" aria-hidden="true">🗑️</span>
          <div>
            <strong>Видалити</strong>
            <small>Позначити обліковий запис як видалений</small>
          </div>
        </button>`;
      openModal();
    }, true);

    modal.addEventListener('click', (event) => {
      if (event.target.closest('[data-action]')) {
        body.classList.remove('status-toggle-layout');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUsersHotfix);
  else setupUsersHotfix();
})();
