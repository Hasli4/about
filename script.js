document.addEventListener('click', async function (e) {
  const el = e.target.closest && e.target.closest('.contact-link');
  if (!el) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  const action = el.dataset.action || '';
  const value = el.dataset.value || '';
  const urlFromData = el.dataset.url || '';
  const href = el.getAttribute('href') || '#';

  const rect = el.getBoundingClientRect();
  const toastX = rect.left + rect.width / 2;
  const toastY = rect.bottom + 12;

  let url = null;

  switch (action) {
    case 'whatsapp':
      url = urlFromData || buildWhatsAppUrl(value, 'Здравствуйте! Интересует обучение программированию');
      break;
    case 'mailto':
      url = urlFromData || (href !== '#' ? href : null);
      break;
    case 'tel':
      url = urlFromData || (href !== '#' ? href : null);
      break;
    case 'copy-only':
      url = null;
      break;
    default:
      url = urlFromData || (href !== '#' ? href : null);
      break;
  }

  try {
    await copyToClipboard(value);
    showToast(`Скопировано: ${value}`, toastX, toastY, 3000);
  } catch (err) {
    showToast('Не удалось скопировать', toastX, toastY, 3000);
  }

  if (!url) return;

  // Сразу открываем вкладку с сообщением-заглушкой, а не пустую страницу
  const pendingHtml = `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="utf-8">
        <title>Открываю...</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            background: #fff;
            color: #444;
          }
          .box {
            padding: 18px 22px;
            border-radius: 14px;
            background: rgba(0, 0, 0, 0.04);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="box">Открываю ссылку…</div>
      </body>
    </html>
  `;

  const newTab = window.open(
    'data:text/html;charset=utf-8,' + encodeURIComponent(pendingHtml),
    '_blank'
  );

  if (newTab) {
    try {
      newTab.opener = null;
      newTab.blur();
      window.focus();
    } catch (err) {}
  }

  setTimeout(() => {
    if (newTab && !newTab.closed) {
      newTab.location.replace(url);
      try {
        newTab.blur();
        window.focus();
      } catch (err) {}
    } else {
      const fallbackTab = window.open(url, '_blank');
      if (fallbackTab) {
        try {
          fallbackTab.blur();
          window.focus();
        } catch (err) {}
      }
    }
  }, 3000);
});

// Копирование
function copyToClipboard(text) {
  if (!text) return Promise.reject(new Error('No text to copy'));

  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);

      ok ? resolve() : reject(new Error('execCommand failed'));
    } catch (err) {
      reject(err);
    }
  });
}

function buildWhatsAppUrl(number, text) {
  const num = (number || '').replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(text || '');
  return `https://wa.me/${num}?text=${encoded}`;
}

let toastTimer = null;
function showToast(message, x, y, ms = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;

  t.textContent = message;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;

  t.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, ms);
}