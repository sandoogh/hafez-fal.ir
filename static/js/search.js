(function () {
  'use strict';

  var dialog = document.getElementById('search-dialog');
  var input = document.getElementById('search-input');
  var results = document.getElementById('search-results');
  var index = null;
  var loadFailed = false;
  var pending = null;
  var timer = null;
  var MAX_HITS = 50;

  var FOLD_MAP = {
    'ي': 'ی',
    'ك': 'ک',
    'أ': 'ا',
    'إ': 'ا',
    'آ': 'ا',
    'ؤ': 'و',
    'ئ': 'ی',
    'ة': 'ه',
    'ۀ': 'ه',
    'ى': 'ی'
  };

  // Must stay in sync with fold_for_search() in build.py
  function fold(text) {
    return text
      .replace(/[يكأإآؤئةۀى]/g, function (c) { return FOLD_MAP[c]; })
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\s\u200C]+/g, '');
  }

  function toAsciiDigits(text) {
    return text.replace(/[۰-۹٠-٩]/g, function (c) {
      var code = c.charCodeAt(0);
      return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
  }

  function toPersianDigits(value) {
    return String(value).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
  }

  function loadIndex() {
    if (index || pending || loadFailed) return;
    setMessage('در حال بارگیری…');
    pending = fetch('/search-index.json')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        index = data;
        run();
      })
      .catch(function () {
        pending = null;
        loadFailed = true;
        setMessage('بارگیری فهرست جستجو ممکن نشد. اتصال اینترنت را بررسی کنید.');
      });
  }

  function setMessage(text) {
    results.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'search-message';
    p.textContent = text;
    results.appendChild(p);
  }

  function addHit(ghazal, beyt) {
    var a = document.createElement('a');
    a.className = 'search-hit';
    a.href = '/ghazal/' + ghazal.n + '/';
    var title = document.createElement('span');
    title.className = 'hit-title';
    title.textContent = ghazal.t;
    var verse = document.createElement('span');
    verse.className = 'hit-beyt';
    verse.textContent = ghazal.v[beyt] + (ghazal.v[beyt + 1] ? ' — ' + ghazal.v[beyt + 1] : '');
    a.appendChild(title);
    a.appendChild(verse);
    results.appendChild(a);
  }

  function run() {
    if (loadFailed) return;
    if (!index) { loadIndex(); return; }
    var query = input.value.trim();
    results.innerHTML = '';
    if (!query) return;

    // Digit-only query jumps to that ghazal number
    var ascii = toAsciiDigits(query);
    if (/^\d+$/.test(ascii)) {
      var num = parseInt(ascii, 10);
      if (num >= 1 && num <= index.length) addHit(index[num - 1], 0);
      else setMessage('غزلی با این شماره وجود ندارد');
      return;
    }

    var folded = fold(query);
    if (!folded) return;
    var count = 0;
    for (var i = 0; i < index.length && count < MAX_HITS; i++) {
      var ghazal = index[i];
      var lastBeyt = -1;
      for (var j = 0; j < ghazal.s.length && count < MAX_HITS; j++) {
        if (ghazal.s[j].indexOf(folded) === -1) continue;
        var beyt = j - (j % 2);
        if (beyt === lastBeyt) continue;
        lastBeyt = beyt;
        addHit(ghazal, beyt);
        count++;
      }
    }
    if (count === 0) {
      setMessage('چیزی یافت نشد');
    } else {
      var info = document.createElement('p');
      info.className = 'search-message';
      info.textContent = toPersianDigits(count) + (count >= MAX_HITS ? '+' : '') + ' نتیجه';
      results.insertBefore(info, results.firstChild);
    }
  }

  function move(delta) {
    var hits = results.querySelectorAll('.search-hit');
    if (!hits.length) return;
    var current = results.querySelector('.search-hit.active');
    var idx = -1;
    for (var i = 0; i < hits.length; i++) {
      if (hits[i] === current) { idx = i; break; }
    }
    var next = Math.max(0, Math.min(hits.length - 1, idx + delta));
    if (current) current.classList.remove('active');
    hits[next].classList.add('active');
    hits[next].scrollIntoView({ block: 'nearest' });
  }

  window.openSearch = function () {
    dialog.showModal();
    input.select();
    loadIndex();
  };

  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(run, 100);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var target = results.querySelector('.search-hit.active') || results.querySelector('.search-hit');
      if (target) target.click();
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (!dialog.open) window.openSearch();
    }
  });

  // Click on the backdrop closes the dialog
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
})();
