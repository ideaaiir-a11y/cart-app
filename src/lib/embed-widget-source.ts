// ─────────────────────────────────────────────────────────────
// سورس ویجت چت embed عمومی — به‌صورت رشته خام
// توسط /api/embed/widget.js سرو می‌شود؛ در سایت‌های خارجی با یک تگ script کار می‌کند.
// نکته: داخل این رشته از backtick و ${} استفاده نشده تا template literal TS خراب نشود.
// ─────────────────────────────────────────────────────────────

export const WIDGET_JS = String.raw`(function () {
  'use strict';
  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('/api/embed/widget.js') !== -1) return all[i];
      }
      return null;
    })();
  if (!script) return;

  var origin = script.getAttribute('data-origin') || (function () {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  })();
  var title = script.getAttribute('data-title') || 'دستیار هوشمند';
  var welcome =
    script.getAttribute('data-welcome') ||
    'سلام! هر سؤالی درباره محصولات دارید بپرسید؛ سریع پاسخ می‌دهم.';
  var pos = script.getAttribute('data-pos') === 'right' ? 'right' : 'left';
  var accent = script.getAttribute('data-accent') || '#059669';

  if (document.getElementById('cmw-root')) return;
  var root = document.createElement('div');
  root.id = 'cmw-root';
  document.body.appendChild(root);
  var shadow = root.attachShadow({ mode: 'open' });

  var side = pos === 'right' ? 'right: 20px;' : 'left: 20px;';
  var sideOpen = pos === 'right' ? 'right: 0;' : 'left: 0;';
  var transformOpen = pos === 'right' ? 'scale(1)' : 'scale(1)';
  var originX = pos === 'right' ? 'bottom right' : 'bottom left';

  var css = [
    '@import url("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap");',
    ':host{all:initial;}',
    '*{margin:0;padding:0;box-sizing:border-box;font-family:Vazirmatn,Tahoma,sans-serif;}',
    '.cmw-btn{position:fixed;bottom:20px;' + side + 'width:56px;height:56px;border-radius:9999px;border:none;cursor:pointer;' +
      'background:linear-gradient(135deg,' + accent + ',' + accent + 'dd);color:#fff;display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 8px 24px ' + accent + '55;z-index:2147483000;transition:transform .2s ease, box-shadow .2s ease;}',
    '.cmw-btn:hover{transform:scale(1.07);box-shadow:0 12px 30px ' + accent + '77;}',
    '.cmw-btn svg{width:26px;height:26px;fill:#fff;}',
    '.cmw-panel{position:fixed;bottom:88px;' + sideOpen + 'width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);' +
      'background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 64px rgba(2,44,34,.28);z-index:2147483001;' +
      'display:flex;flex-direction:column;direction:rtl;transform-origin:' + originX + ';' +
      'transform:scale(.85) translateY(16px);opacity:0;pointer-events:none;transition:all .22s cubic-bezier(.2,.9,.3,1.2);}',
    '.cmw-panel.open{transform:' + transformOpen + ';opacity:1;pointer-events:auto;}',
    '.cmw-head{background:linear-gradient(135deg,' + accent + ',' + accent + 'cc);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '.cmw-head .cmw-avatar{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.cmw-head .cmw-avatar svg{width:20px;height:20px;fill:#fff;}',
    '.cmw-head h3{font-size:14px;font-weight:800;flex:1;}',
    '.cmw-head p{font-size:10.5px;opacity:.85;display:flex;align-items:center;gap:4px;}',
    '.cmw-dot{width:7px;height:7px;border-radius:50%;background:#6ee7b7;display:inline-block;}',
    '.cmw-close{background:rgba(255,255,255,.14);border:none;color:#fff;width:30px;height:30px;border-radius:9px;cursor:pointer;font-size:15px;line-height:1;flex-shrink:0;transition:background .15s;}',
    '.cmw-close:hover{background:rgba(255,255,255,.28);}',
    '.cmw-msgs{flex:1;overflow-y:auto;padding:14px;background:#f6faf8;display:flex;flex-direction:column;gap:9px;}',
    '.cmw-msgs::-webkit-scrollbar{width:5px;} .cmw-msgs::-webkit-scrollbar-thumb{background:#d1dcdb;border-radius:99px;}',
    '.cmw-msg{max-width:82%;padding:9px 13px;font-size:13px;line-height:1.9;border-radius:14px;white-space:pre-line;word-break:break-word;}',
    '.cmw-msg.bot{background:#fff;border:1px solid #e4ede9;color:#1c2b28;align-self:flex-start;border-bottom-right-radius:5px;}',
    '.cmw-msg.user{background:' + accent + ';color:#fff;align-self:flex-end;border-bottom-left-radius:5px;}',
    '.cmw-typing{background:#fff;border:1px solid #e4ede9;align-self:flex-start;padding:12px 16px;border-radius:14px;border-bottom-right-radius:5px;display:flex;gap:4px;}',
    '.cmw-typing span{width:7px;height:7px;border-radius:50%;background:' + accent + '99;animation:cmwB 1.2s infinite;}',
    '.cmw-typing span:nth-child(2){animation-delay:.15s;} .cmw-typing span:nth-child(3){animation-delay:.3s;}',
    '@keyframes cmwB{0%,60%,100%{transform:translateY(0);opacity:.5;}30%{transform:translateY(-5px);opacity:1;}}',
    '.cmw-chips{display:flex;gap:6px;padding:0 14px 10px;flex-wrap:wrap;background:#f6faf8;flex-shrink:0;}',
    '.cmw-chip{border:1px solid ' + accent + '55;background:#fff;color:' + accent + ';font-size:11px;padding:5px 11px;border-radius:9999px;cursor:pointer;transition:all .15s;}',
    '.cmw-chip:hover{background:' + accent + ';color:#fff;}',
    '.cmw-input-row{display:flex;gap:8px;padding:11px;border-top:1px solid #e4ede9;background:#fff;flex-shrink:0;}',
    '.cmw-input{flex:1;border:1px solid #dde7e3;border-radius:11px;padding:10px 13px;font-size:13px;outline:none;background:#f8fbfa;transition:border .15s;}',
    '.cmw-input:focus{border-color:' + accent + ';}',
    '.cmw-send{width:42px;height:42px;border:none;border-radius:11px;background:' + accent + ';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:filter .15s;}',
    '.cmw-send:hover{filter:brightness(1.1);} .cmw-send:disabled{opacity:.5;cursor:not-allowed;}',
    '.cmw-send svg{width:18px;height:18px;fill:#fff;transform:scaleX(-1);}',
    '.cmw-brand{font-size:9.5px;text-align:center;color:#9ab0aa;padding:0 0 7px;background:#fff;flex-shrink:0;}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  shadow.appendChild(style);

  var chatIcon = '<svg viewBox="0 0 24 24"><path d="M12 3C6.9 3 2.8 6.6 2.8 11c0 2.5 1.3 4.7 3.4 6.2-.1 1-.5 2.5-1.6 3.6 0 0 2.6-.2 4.6-1.7.9.2 1.8.4 2.8.4 5.1 0 9.2-3.6 9.2-8.1S17.1 3 12 3z"/></svg>';
  var sendIcon = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'cmw-panel';
  panel.innerHTML =
    '<div class="cmw-head">' +
      '<div class="cmw-avatar">' + chatIcon + '</div>' +
      '<div style="flex:1;min-width:0;"><h3>' + title + '</h3><p><span class="cmw-dot"></span> آنلاین و آماده پاسخ</p></div>' +
      '<button class="cmw-close" type="button" aria-label="بستن گفتگو">✕</button>' +
    '</div>' +
    '<div class="cmw-msgs"></div>' +
    '<div class="cmw-chips"></div>' +
    '<div class="cmw-input-row">' +
      '<input class="cmw-input" type="text" placeholder="پیام خود را بنویسید…" />' +
      '<button class="cmw-send" type="button" aria-label="ارسال پیام">' + sendIcon + '</button>' +
    '</div>' +
    '<div class="cmw-brand">قدرت‌گرفته از کارت‌ساز هوشمند محصول</div>';
  shadow.appendChild(panel);

  var btn = document.createElement('button');
  btn.className = 'cmw-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'باز کردن گفتگو');
  btn.innerHTML = chatIcon;
  shadow.appendChild(btn);

  var msgs = shadow.querySelector('.cmw-msgs');
  var input = shadow.querySelector('.cmw-input');
  var send = shadow.querySelector('.cmw-send');
  var chipsBox = shadow.querySelector('.cmw-chips');
  var open = false;
  var busy = false;

  var SESSION_KEY = 'cardmaker.widget.session';
  function session() {
    try {
      var s = localStorage.getItem(SESSION_KEY);
      if (!s) {
        s = 'w-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(SESSION_KEY, s);
      }
      return s;
    } catch (e) { return 'w-anon'; }
  }

  function addMsg(text, who) {
    var el = document.createElement('div');
    el.className = 'cmw-msg ' + who;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  var CHIPS = ['محصولات پرفروش چی هستن؟', 'هزینه ارسال چقدره؟', 'راهنمای خرید می‌خوام'];
  CHIPS.forEach(function (c) {
    var chip = document.createElement('button');
    chip.className = 'cmw-chip';
    chip.type = 'button';
    chip.textContent = c;
    chip.onclick = function () { ask(c); };
    chipsBox.appendChild(chip);
  });

  function setBusy(b) {
    busy = b;
    send.disabled = b;
    input.disabled = b;
  }

  function ask(text) {
    var q = (text || '').trim();
    if (!q || busy) return;
    addMsg(q, 'user');
    input.value = '';
    var typing = document.createElement('div');
    typing.className = 'cmw-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;
    setBusy(true);
    fetch(origin + '/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session(), message: q })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        typing.remove();
        addMsg(data && data.ok ? (data.reply || 'پاسخی دریافت نشد.') : ((data && data.error) || 'خطا در ارتباط با دستیار'), 'bot');
      })
      .catch(function () {
        typing.remove();
        addMsg('ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.', 'bot');
      })
      .then(function () { setBusy(false); input.focus(); });
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    panel.className = 'cmw-panel' + (open ? ' open' : '');
    if (open && msgs.children.length === 0) addMsg(welcome, 'bot');
    if (open) setTimeout(function () { input.focus(); }, 250);
  }

  btn.onclick = function () { toggle(); };
  shadow.querySelector('.cmw-close').onclick = function () { toggle(false); };
  send.onclick = function () { ask(input.value); };
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); ask(input.value); }
  });
})();`;
