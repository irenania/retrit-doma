// Course mini app: welcome -> modules -> module -> lesson. Hash routing, progress in Telegram CloudStorage.
(function () {
  "use strict";
  var C = window.COURSE, CFG = window.CONFIG || {};
  var tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
  var app = document.getElementById("app");
  var REVIEW = new URLSearchParams(location.search).has(CFG.reviewParam || "review");
  var state = { done: {}, last: "", seen: false, access: true, videos: {} };

  // ---------- data helpers ----------
  var LESSONS = [];
  C.modules.forEach(function (m) { m.lessons.forEach(function (l) { l.mod = m; LESSONS.push(l); }); });
  function byId(id) { for (var i = 0; i < LESSONS.length; i++) if (LESSONS[i].id === id) return LESSONS[i]; return null; }
  function modByN(n) { for (var i = 0; i < C.modules.length; i++) if (C.modules[i].n === n) return C.modules[i]; return null; }
  function mainLessons() { return LESSONS.filter(function (l) { return !l.mod.bonus; }); }
  function fmtMin(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + " ч" + (m ? " " + m + " мин" : "") : m + " мин"; }
  function plural(n, a, b, c) { var x = n % 10, y = n % 100; return x === 1 && y !== 11 ? a : (x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }

  // ---------- storage (Telegram cloud, fallback: localStorage) ----------
  var KEY = "rd_progress";
  function load(cb) {
    function apply(raw) {
      try { var o = JSON.parse(raw || "{}"); state.done = o.d || {}; state.last = o.l || ""; state.seen = !!o.s; } catch (e) {}
      cb();
    }
    if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) {
      tg.CloudStorage.getItem(KEY, function (err, val) { apply(err ? null : val); });
    } else {
      var v = null; try { v = localStorage.getItem(KEY); } catch (e) {}
      apply(v);
    }
  }
  function save() {
    var raw = JSON.stringify({ d: state.done, l: state.last, s: state.seen });
    if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9")) tg.CloudStorage.setItem(KEY, raw);
    try { localStorage.setItem(KEY, raw); } catch (e) {}
  }

  // ---------- access check (optional) ----------
  function checkAccess(cb) {
    if (!CFG.accessApi) return cb();
    fetch(CFG.accessApi, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg ? tg.initData : "" }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { state.access = !!j.ok; state.videos = j.videos || {}; cb(); })
      .catch(function () { state.access = false; cb(); });
  }

  // ---------- icons ----------
  var I = {
    check: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="#5B6468" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>',
    ear: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0116 0v2M4 14h3v6H4zM17 14h3v6h-3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    pen: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>'
  };

  // ---------- screens ----------
  // Intro: what the retreat is, who leads it, how to go through it.
  function intro(withStart) {
    var nm = C.modules.filter(function (m) { return !m.bonus; }).length, nl = mainLessons().length,
        mins = LESSONS.reduce(function (a, l) { return a + l.min; }, 0);
    return '<div class="stack-lg" style="padding-top:24px">' +
      (withStart ? '' : '<a class="btn btn-ghost back" href="#/">' + I.back + 'На главную</a>') +
      '<div class="stack"><div class="eyebrow">Онлайн-ретрит · Светлана Киричук и Анатолий</div>' +
      '<h1 style="font-size:38px">7 шагов к любви</h1>' +
      '<p style="font-size:20px;font-weight:700;color:var(--accent)">Ретрит дома</p>' +
      '<p style="font-size:19px;color:var(--ink-2)">Пять дней и семь последовательных шагов к собственной опоре: что для меня любовь, чего хочу именно я, какая жизнь мне хороша. Когда есть своя опора, отношения перестают быть местом, где держишься из последних сил.</p></div>' +
      '<div class="card stack" style="gap:8px">' +
      '<p>Светлана ведёт психологическую часть, Анатолий — работу с телом и состоянием. Найденное в разговоре сразу закрепляется в теле.</p>' +
      '<p class="muted">Всё записано на живом ретрите в октябре 2026 года — в предгорьях Кавказа, у горной реки. Вы проходите его дома, в своём темпе.</p>' +
      '<p class="muted">Внутри: ' + nm + ' ' + plural(nm, "модуль", "модуля", "модулей") + ', ' + nl + ' ' + plural(nl, "урок", "урока", "уроков") + ', практики и бонусы — около ' + Math.round(mins / 60) + ' часов.</p></div>' +
      '<div class="stack"><h2>Как проходить</h2>' +
      step(1, "Заведите тетрадь самонаблюдения — в уроках будут вопросы.") +
      step(2, "Один модуль — один вечер. Каждый урок можно смотреть или слушать.") +
      step(3, "Отмечайте пройденное — мы запомним, где вы остановились.") +
      '</div>' + (withStart ? '<button class="btn btn-primary" data-go="start">Начать</button>' : '') + '</div>';
  }
  function welcome() { return intro(true); }
  function step(n, t) { return '<div class="step"><div class="badge">' + n + '</div><div>' + esc(t) + '</div></div>'; }

  function home() {
    var main = mainLessons(), cnt = main.filter(function (l) { return state.done[l.id]; }).length;
    var pct = Math.round(cnt * 100 / main.length);
    var cont = null;
    // continue: the last opened lesson if unfinished, otherwise the next unfinished one after it
    var start = Math.max(0, main.indexOf(byId(state.last)));
    for (var k = 0; k < main.length && !cont; k++) { var c = main[(start + k) % main.length]; if (!state.done[c.id]) cont = c; }
    var h = '<div class="stack-lg"><div class="stack" style="gap:4px"><div class="eyebrow">7 шагов к любви · ретрит дома</div><h1>Здравствуйте!</h1><a href="#/about" style="color:var(--accent);font-weight:700;font-size:17px;text-decoration:none">О ретрите и как его проходить →</a></div>' +
      '<div class="card stack" style="gap:10px"><div class="muted" style="font-size:17px">Пройдено <b style="color:var(--ink)">' + cnt + ' из ' + main.length + '</b> ' + plural(main.length, "урока", "уроков", "уроков") + '</div>' +
      '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div></div>';
    if (cont) h += '<div class="cont"><div class="eyebrow">' + (cnt ? "Продолжить с того места" : "Начните отсюда") + '</div>' +
      '<div class="title">' + esc(cont.num + " · " + cont.title) + '</div>' +
      '<div style="font-size:16px;color:#DCEFEC">Модуль ' + esc(cont.mod.n) + ' · ' + fmtMin(cont.min) + '</div>' +
      '<a class="btn" href="#/l/' + encodeURIComponent(cont.id) + '">' + I.play + 'Смотреть урок</a></div>';
    else h += '<div class="cont"><div class="title">Вы прошли весь ретрит!</div><div style="color:#DCEFEC">Возвращайтесь к практикам, когда нужно.</div></div>';
    h += '<div class="stack" style="gap:10px"><h2>Модули</h2>';
    C.modules.forEach(function (m) {
      var n = m.lessons.length, d = m.lessons.filter(function (l) { return state.done[l.id]; }).length;
      var mins = m.lessons.reduce(function (a, l) { return a + l.min; }, 0);
      var sub = d === n ? "Пройден · " + n + " " + plural(n, "урок", "урока", "уроков")
        : (d ? "Пройдено " + d + " из " + n + " · " : n + " " + (m.bonus ? plural(n, "материал", "материала", "материалов") : plural(n, "урок", "урока", "уроков")) + " · ") + fmtMin(mins);
      h += '<a class="row" href="#/m/' + encodeURIComponent(m.n) + '">' +
        (d === n ? '<div class="badge done" style="color:#fff">' + I.check + '</div>' : '<div class="badge">' + esc(m.n) + '</div>') +
        '<div class="grow"><div class="t">' + esc(m.title) + '</div><div class="s">' + esc(sub) + '</div></div>' + I.chev + '</a>';
    });
    h += '</div>';
    if (CFG.supportUsername) h += '<a class="btn btn-outline" href="https://t.me/' + esc(CFG.supportUsername) + '">Задать вопрос команде</a>';
    return h + '</div>';
  }

  function module(n) {
    var m = modByN(n); if (!m) return home();
    var mins = m.lessons.reduce(function (a, l) { return a + l.min; }, 0);
    var h = '<div class="stack-lg"><a class="btn btn-ghost back" href="#/">' + I.back + 'Все модули</a>' +
      '<div class="stack" style="gap:6px"><div class="eyebrow">' + (m.bonus ? "Бонусы" : "Модуль " + esc(m.n)) + '</div><h1>' + esc(m.title) + '</h1>' +
      '<div class="muted">' + m.lessons.length + ' ' + plural(m.lessons.length, "урок", "урока", "уроков") + ' · ' + fmtMin(mins) + '</div></div><div class="stack" style="gap:10px">';
    m.lessons.forEach(function (l) {
      var d = state.done[l.id];
      h += '<a class="row" href="#/l/' + encodeURIComponent(l.id) + '">' +
        (d ? '<div class="badge done" style="color:#fff;width:40px;height:40px">' + I.check + '</div>' : '<div class="badge ring" style="width:40px;height:40px">' + esc(l.num) + '</div>') +
        '<div class="grow"><div class="t">' + esc(l.title) + '</div><div class="s">' + fmtMin(l.min) + ' · ' + esc(l.kind) + '</div></div></a>';
    });
    return h + '</div></div>';
  }

  function lesson(id) {
    var l = byId(id); if (!l) return home();
    state.last = id; save();
    var i = LESSONS.indexOf(l), next = LESSONS[i + 1], d = state.done[id];
    var vk = (state.videos[id] && state.videos[id].vk) || l.vk;
    var audio = (state.videos[id] && state.videos[id].audio) || l.audio;
    var h = '<div class="stack-lg"><a class="btn btn-ghost back" href="#/m/' + encodeURIComponent(l.mod.n) + '">' + I.back + (l.mod.bonus ? "Бонусы" : "Модуль " + esc(l.mod.n)) + '</a>' +
      '<div class="stack" style="gap:6px"><div class="eyebrow">' + (l.mod.bonus ? "Бонус " : "Урок ") + esc(l.num) + '</div><h1 style="font-size:27px;line-height:1.2">' + esc(l.title) + '</h1>' +
      '<div class="muted">' + fmtMin(l.min) + ' · ' + esc(l.kind) + '</div></div>' +
      (l.audioOnly ? '<div class="card stack audio-card"><div class="eyebrow">Слушать практику</div>' +
        (audio ? '<audio controls preload="metadata" src="' + esc(audio) + '"></audio>' : '<div class="muted">Аудио появится здесь после загрузки</div>') + '</div>' :
      '<div class="player">' + (vk ? '<iframe src="' + esc(vk) + '" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen title="' + esc(l.title) + '"></iframe>'
        : '<div class="empty">Видео урока появится здесь после загрузки в VK Video</div>') + '</div>');
    // Fallback: open the same video on vkvideo.ru if the embedded player is blocked.
    var m = vk && /oid=(-?\d+)&id=(\d+)/.exec(vk);
    if (m) h += '<a class="btn btn-ghost" href="https://vkvideo.ru/video' + m[1] + '_' + m[2] + '" target="_blank" rel="noopener">Видео не запускается? Открыть в VK Видео</a>';
    if (audio && !l.audioOnly) h += '<a class="btn btn-outline" href="' + esc(audio) + '" target="_blank" rel="noopener">' + I.ear + 'Слушать аудиоверсию</a>';
    h += '<div class="stack" style="gap:6px"><h2>О чём урок</h2><p>' + esc(l.desc) + '</p></div>';
    if (l.task) h += '<div class="task"><div class="eyebrow">Задание</div><div>' + esc(l.task) + '</div></div>';
    h += d ? '<button class="btn btn-done" data-done="' + esc(id) + '">' + I.check + 'Пройдено</button>'
           : '<button class="btn btn-primary" data-done="' + esc(id) + '">Урок пройден</button>';
    if (next) h += '<a class="btn btn-ghost" href="#/l/' + encodeURIComponent(next.id) + '">Следующий: ' + esc(next.num) + ' ' + I.chev.replace('#5B6468', 'currentColor') + '</a>';
    if (REVIEW) h += '<button class="btn review" data-remark="' + esc(id) + '">' + I.pen + 'Замечание по уроку</button>' +
      '<div class="remark-form" id="remark" hidden>' +
        '<label for="rm-min">На какой минуте (если важно)</label><input id="rm-min" inputmode="numeric" placeholder="например, 3:40">' +
        '<label for="rm-text">Что не так, что поправить</label><textarea id="rm-text" placeholder="Напишите замечание"></textarea>' +
        '<button class="btn btn-primary" data-send="' + esc(id) + '">Отправить замечание</button></div>';
    return h + '</div>';
  }

  function noAccess() {
    return '<div class="stack-lg" style="padding-top:24px"><div class="eyebrow">7 шагов к любви · ретрит дома</div><h1>Доступ открывается после оплаты</h1>' +
      '<p>Если вы уже оплатили, проверьте, что вступили в закрытый канал ретрита, и откройте приложение заново из него.</p>' +
      (CFG.buyUrl ? '<a class="btn btn-primary" href="' + esc(CFG.buyUrl) + '">Купить ретрит</a>' : '') + '</div>';
  }

  // ---------- router ----------
  function render() {
    var r = location.hash.replace(/^#\/?/, "").split("/");
    var html;
    if (!state.access) html = noAccess();
    else if (r[0] === "m") html = module(decodeURIComponent(r[1] || ""));
    else if (r[0] === "l") html = lesson(decodeURIComponent(r[1] || ""));
    else if (r[0] === "about") html = intro(false);
    else html = state.seen ? home() : welcome();
    app.innerHTML = html;
    window.scrollTo(0, 0);
    if (tg && tg.BackButton) { if (r[0] === "m" || r[0] === "l" || r[0] === "about") tg.BackButton.show(); else tg.BackButton.hide(); }
  }

  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-done],[data-remark],[data-send]");
    if (!t) return;
    if (t.dataset.go === "start") { state.seen = true; save(); location.hash = "#/"; render(); }
    if (t.dataset.done) {
      var id = t.dataset.done, l0 = byId(id), nx = LESSONS[LESSONS.indexOf(l0) + 1];
      state.done[id] = !state.done[id]; save();
      // Marking a lesson as done moves straight on to the next one.
      if (state.done[id] && nx) location.hash = "#/l/" + encodeURIComponent(nx.id); else render();
    }
    if (t.dataset.remark) {
      var f = document.getElementById("remark"); f.hidden = !f.hidden;
      if (!f.hidden) { f.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("rm-text").focus(); }
    }
    if (t.dataset.send) {
      var l = byId(t.dataset.send), min = document.getElementById("rm-min").value.trim(), txt = document.getElementById("rm-text").value.trim();
      if (!txt) { document.getElementById("rm-text").focus(); return; }
      var text = "Замечание по уроку " + l.num + " «" + l.title + "»" + (min ? "\nМинута: " + min : "") + "\n" + txt;
      // Goes straight to the reviewer's chat if CONFIG.reviewTo is set, otherwise to the share sheet.
      var url = CFG.reviewTo ? "https://t.me/" + CFG.reviewTo + "?text=" + encodeURIComponent(text)
                             : "https://t.me/share/url?url=" + encodeURIComponent(" ") + "&text=" + encodeURIComponent(text);
      if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
    }
  });
  window.addEventListener("hashchange", render);

  if (tg) {
    tg.ready(); tg.expand();
    if (tg.BackButton) tg.BackButton.onClick(function () { history.back(); });
  }
  load(function () { checkAccess(render); });
})();
