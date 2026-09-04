(() => {
  const last = document.getElementById('lastOpened');
  document.querySelectorAll('a.card').forEach(card => card.addEventListener('click', () => {
    const name = card.dataset.app || 'Dexter\'s app';
    localStorage.setItem('dextersHubLastApp', name);
    localStorage.setItem('dextersHubLastOpen', new Date().toISOString());
  }));
  const saved = localStorage.getItem('dextersHubLastApp');
  if (saved) last.textContent = 'Last opened: ' + saved;

  document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());
  document.getElementById('fullscreenBtn')?.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  });

  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/web/hub-sw.js').catch(() => {}));
  }
})();