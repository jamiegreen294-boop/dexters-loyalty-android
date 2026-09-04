(() => {
  const last = document.getElementById('lastOpened');
  const status = document.getElementById('installStatus');
  const installBtn = document.getElementById('installBtn');

  document.querySelectorAll('a.card').forEach(card => card.addEventListener('click', () => {
    const name = card.dataset.app || "Dexter's app";
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
    } catch {
      if (status) status.textContent = 'Full screen is controlled by this tablet/browser.';
    }
  });

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) {
    if (status) status.textContent = "Dexter's Hub is installed on this tablet.";
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
    if (status) status.textContent = 'Ready to install on this tablet.';
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
      if (status) status.textContent = 'Open the browser menu and choose Install app or Add to Home screen.';
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted' && status) status.textContent = 'Installing Dexter\'s Hub…';
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    if (status) status.textContent = "Dexter's Hub installed successfully.";
    installBtn.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/hub-sw.js', {scope:'/'}).catch(() => {
      if (status) status.textContent = 'Hub works online; offline shell could not be enabled on this browser.';
    }));
  }
})();