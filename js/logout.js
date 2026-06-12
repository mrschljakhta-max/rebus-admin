window.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn || !window.rebusAuth?.supabase) return;

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Вихід...';
    await window.rebusAuth.supabase.auth.signOut();
    window.location.href = 'index.html';
  });
});
