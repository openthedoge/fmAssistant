(() => {
  'use strict';

  const STORE_KEY = 'hitman-freelancer-leader-v5';
  const SET_KEY = 'hitman-leader-settings-v1';
  const OV_KEY = 'hitman-leader-overrides-v1';

  // 特征位：项链16 耳环8 眼镜4 帽子2 纹身1（对应原站字母 N/E/G/H/T）
  const BIT = { N: 16, E: 8, G: 4, H: 2, T: 1 };

  const FEATURES = [
    { bit: 16, key: 'N', label: '项链' },
    { bit: 8,  key: 'E', label: '耳环' },
    { bit: 4,  key: 'G', label: '眼镜' },
    { bit: 2,  key: 'H', label: '帽子' },
    { bit: 1,  key: 'T', label: '纹身' },
  ];

  const HAIRS = [
    { v: 0, code: 'BALD',   label: '光头', color: '#94867b' },
    { v: 1, code: 'BLACK',  label: '黑',   color: '#1b1b21' },
    { v: 2, code: 'GREY',   label: '灰',   color: '#a5a5b0' },
    { v: 3, code: 'RED',    label: '红',   color: '#a8422a' },
    { v: 4, code: 'BLONDE', label: '金',   color: '#cfaa55' },
    { v: 5, code: 'BROWN',  label: '棕',   color: '#6d4a2e' },
  ];

  const HAIR_CODE = {};
  HAIRS.forEach(h => { HAIR_CODE[h.code] = h.v; });

  const GLYPHS = {
    N: '<path d="M4 5q8 13 16 0"/><circle cx="12" cy="17.5" r="2"/>',
    E: '<path d="M12 3v6"/><circle cx="12" cy="15" r="5"/>',
    G: '<circle cx="7.5" cy="14" r="3.8"/><circle cx="16.5" cy="14" r="3.8"/><path d="M11.3 14h1.4"/>',
    H: '<path d="M4 17h16"/><path d="M6.6 17c0-6.6 10.8-6.6 10.8 0"/>',
    T: '<path d="M5 16q3-7 6-3t6-4"/><path d="M9 6.5v2.5"/>',
  };

  const popcount = n => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };
  const hairName = v => (v === 0 ? '光头' : HAIRS[v].label + '发');
  const namesOf = mask => FEATURES.filter(f => mask & f.bit).map(f => f.label);

  // ---------- 首领表（72 位，随包内置） ----------
  const LEADERS = (window.LEADERS || []).map(raw => {
    const parts = raw.split('-');
    const feats = parts[1] || '';
    let mask = 0;
    for (const ch of feats) mask |= (BIT[ch] || 0);
    return {
      file: raw,
      name: parts.slice(2).join('-') || raw,
      code: feats,
      mask,
      hair: HAIR_CODE[parts[0]],
    };
  }).filter(l => l.mask && l.hair !== undefined);

  // ---------- 内置图片包（72 张，随包） ----------
  const BUNDLE = (window.GALLERY_BUNDLE && typeof window.GALLERY_BUNDLE === 'object')
    ? window.GALLERY_BUNDLE : {};

  // ---------- 设置 ----------
  const settings = { dark: true, custom: false };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}); } catch (e) {}
  const saveSettings = () => {
    try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {}
  };

  // ---------- 自定义图片 ----------
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(OV_KEY) || '{}') || {}; } catch (e) { overrides = {}; }
  const saveOverrides = () => {
    try {
      localStorage.setItem(OV_KEY, JSON.stringify(overrides));
      return true;
    } catch (e) {
      return false;
    }
  };

  // ---------- 当前选择 ----------
  const state = { mask: 0, hair: null };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (Number.isInteger(saved.mask)) state.mask = saved.mask & 31;
      if (Number.isInteger(saved.hair) && saved.hair >= 0 && saved.hair <= 5) state.hair = saved.hair;
    }
  } catch (e) { /* 首次运行 */ }
  const saveState = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ mask: state.mask, hair: state.hair })); } catch (e) {}
  };

  // ---------- DOM ----------
  const $ = s => document.getElementById(s);
  const featCount = $('featCount');
  const tiles = $('tiles');
  const combo = $('combo');
  const hint = $('hint');
  const copyBtn = $('copyBtn');
  const fileInput = $('fileInput');
  const mainEl = $('main');

  // ---------- 主题 ----------
  function applyTheme() {
    document.documentElement.dataset.theme = settings.dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.dark ? '#101014' : '#f1f1f5');
  }

  // ---------- 底栏 ----------
  const views = Array.from(document.querySelectorAll('.view'));
  const tabs = Array.from(document.querySelectorAll('.tab'));

  // 道具分布层级：l1 地图 / l2 道具 / l3 文章
  let itemsDepth = 'l1';
  let activeTab = 'lookup';
  // 每层的滚动位置，返回时恢复
  const scrollMemo = { l1: 0, l2: 0, l3: 0 };

  function paintTab(name) {
    activeTab = name;
    views.forEach(v => v.classList.toggle('active', v.dataset.view === name));
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  }

  function showTab(name) {
    // 离开道具分布前，先记下当前层的滚动位置
    if (activeTab === 'items' && subviews[itemsDepth]) {
      scrollMemo[itemsDepth] = mainEl.scrollTop;
    }

    paintTab(name);

    // 回到「道具分布」：正在看文章就保持文章，否则回到一级地图
    if (name === 'items') showSub(itemsDepth === 'l3' ? 'l3' : 'l1', true);
    else mainEl.scrollTop = 0;

    // 切到「其它」时总是回到设置列表
    if (name === 'settings' && setAbout.classList.contains('active')) closeAbout();
  }

  tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ---------- 特征 / 发色 ----------
  const featureBtns = FEATURES.map(f => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tg';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + GLYPHS[f.key] + '</svg>';
    btn.appendChild(document.createTextNode(f.label));
    btn.addEventListener('click', () => {
      if (state.mask & f.bit) state.mask &= ~f.bit;
      else if (popcount(state.mask) < 3) state.mask |= f.bit;
      saveState();
      render();
    });
    $('features').appendChild(btn);
    return { btn, f };
  });

  const hairBtns = HAIRS.map(h => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hair';
    const bar = document.createElement('i');
    bar.style.background = h.color;
    btn.appendChild(bar);
    btn.appendChild(document.createTextNode(h.label));
    btn.addEventListener('click', () => {
      state.hair = state.hair === h.v ? null : h.v;
      saveState();
      render();
    });
    $('hairs').appendChild(btn);
    return { btn, h };
  });

  $('resetBtn').addEventListener('click', () => {
    state.mask = 0;
    state.hair = null;
    saveState();
    render();
  });

  copyBtn.addEventListener('click', () => {
    const hits = matchLeaders();
    const text = '特征：' + namesOf(state.mask).join(' / ') +
      '\n发色：' + hairName(state.hair) +
      '\n候选（' + hits.length + '）：' + (hits.map(l => l.code + '-' + l.name).join('、') || '无');
    const done = () => { copyBtn.textContent = '已复制'; setTimeout(() => { copyBtn.textContent = '复制名单'; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();

    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  });

  // ---------- 设置开关 ----------
  const darkToggle = $('darkToggle');
  const customToggle = $('customToggle');

  darkToggle.checked = settings.dark;
  darkToggle.addEventListener('change', () => {
    settings.dark = darkToggle.checked;
    saveSettings();
    applyTheme();
  });

  customToggle.checked = settings.custom;
  customToggle.addEventListener('change', () => {
    const turningOff = !customToggle.checked;
    if (turningOff && Object.keys(overrides).length) {
      const revert = confirm('关闭自定义图片。\n\n是否还原为原图？\n「确定」还原原图　「取消」保留替换后的图片');
      if (revert) {
        overrides = {};
        saveOverrides();
        render();
      }
    }
    settings.custom = customToggle.checked;
    saveSettings();
  });

  // ---------- 关于 ----------
  const setMain = $('setMain');
  const setAbout = $('setAbout');

  function openAbout() {
    setMain.classList.remove('active');
    setAbout.classList.add('active');
    mainEl.scrollTop = 0;
    pushLevel({ about: true });

    const body = $('aboutBody');
    body.innerHTML = '<p class="waiting">加载中…</p>';

    fetch('data/articles/about.md', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(text => { body.innerHTML = mdToHtml(text, 'data/articles/'); })
      .catch(() => { body.innerHTML = '<h2>关于</h2><p>作者：CC</p>'; });
  }

  function closeAbout() {
    setAbout.classList.remove('active');
    setMain.classList.add('active');
    mainEl.scrollTop = 0;
  }

  $('aboutBtn').addEventListener('click', openAbout);
  $('backAbout').addEventListener('click', () => {
    if (navDepth > 0) history.back();
    else closeAbout();
  });

  // ---------- 匹配 ----------
  function matchLeaders() {
    if (popcount(state.mask) !== 3 || state.hair === null) return [];
    return LEADERS.filter(l => l.hair === state.hair && (l.mask & state.mask) === state.mask);
  }

  // ---------- 嫌疑人渲染 ----------
  function render() {
    const count = popcount(state.mask);
    const ready = count === 3 && state.hair !== null;

    featureBtns.forEach(({ btn, f }) => {
      const on = (state.mask & f.bit) !== 0;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.disabled = !on && count >= 3;
    });
    hairBtns.forEach(({ btn, h }) => btn.setAttribute('aria-pressed', state.hair === h.v ? 'true' : 'false'));

    featCount.textContent = count + ' / 3';
    featCount.classList.toggle('full', count === 3);
    copyBtn.disabled = !ready;

    if (!ready) {
      combo.textContent = '—';
      hint.textContent = '—';
      tiles.style.gridTemplateColumns = '';
      tiles.innerHTML = '<div class="empty">选 3 个特征 + 发色</div>';
      return;
    }

    const hits = matchLeaders();
    combo.textContent = namesOf(state.mask).join(' + ') + ' · ' + hairName(state.hair);
    hint.textContent = '掩码 ' + state.mask + ' × ' + HAIRS[state.hair].code +
      ' → ' + (hits.length ? hits.length + ' 位候选人（点图变灰标记已排除）' : '无匹配首领');
    paintTiles(hits);
  }

  function paintTiles(hits) {
    tiles.innerHTML = '';
    // 最多两列：3~4 张排成两行，单张大小与 2 张时一致
    tiles.style.gridTemplateColumns = 'repeat(' + Math.max(1, Math.min(hits.length, 2)) + ', 1fr)';

    if (!hits.length) {
      tiles.style.gridTemplateColumns = '';
      const d = document.createElement('div');
      d.className = 'empty';
      d.innerHTML = 'NO SUSPECT FOUND<span>这组特征在游戏数据里不存在</span>';
      tiles.appendChild(d);
      return;
    }

    hits.forEach(l => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'button');
      tile.tabIndex = 0;

      const holder = document.createElement('div');
      holder.className = 'pic';

      const src = overrides[l.file] || BUNDLE[l.file];
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = l.name;
        holder.appendChild(img);
      } else {
        holder.innerHTML = portraitSVG(l.mask, l.hair);
      }

      const tag = document.createElement('b');
      tag.textContent = l.name;
      const fname = document.createElement('i');
      fname.className = 'fname';
      fname.textContent = l.code;
      tag.appendChild(fname);

      tile.appendChild(holder);
      tile.appendChild(tag);

      let pressFired = false;
      tile.addEventListener('click', () => {
        if (pressFired) { pressFired = false; return; }
        tile.classList.toggle('dim');
      });
      tile.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.classList.toggle('dim'); }
      });

      bindLongPress(tile, l, () => { pressFired = true; });

      tiles.appendChild(tile);
    });
  }

  // ---------- 长按替换 ----------
  let pendingLeader = null;

  function bindLongPress(el, leader, markClick) {
    let timer = null;

    const start = () => {
      if (!settings.custom) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        markClick();
        pickFor(leader);
      }, 550);
    };
    const cancel = () => clearTimeout(timer);

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('contextmenu', e => {
      if (!settings.custom) return;
      e.preventDefault();
      markClick();
      pickFor(leader);
    });
  }

  function pickFor(leader) {
    pendingLeader = leader;
    fileInput.value = '';
    fileInput.click();
  }

  fileInput.addEventListener('change', () => {
    const file = (fileInput.files || [])[0];
    const leader = pendingLeader;
    pendingLeader = null;
    if (!file || !leader) return;
    replaceImage(leader, file);
  });

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('图片解码失败'));
      im.src = src;
    });
  }

  // 用户选的图「居中裁剪」到原图尺寸后再存
  async function replaceImage(leader, file) {
    try {
      let W = 384, H = 384;
      const base = BUNDLE[leader.file];
      if (base) {
        const b = await loadImg(base);
        W = b.naturalWidth || 384;
        H = b.naturalHeight || 384;
      }

      const url = URL.createObjectURL(file);
      const user = await loadImg(url);

      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      const scale = Math.max(W / user.naturalWidth, H / user.naturalHeight);
      const w = user.naturalWidth * scale;
      const h = user.naturalHeight * scale;
      ctx.drawImage(user, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url);

      overrides[leader.file] = cv.toDataURL('image/jpeg', 0.9);
      if (!saveOverrides()) {
        delete overrides[leader.file];
        alert('存储空间不足，替换未保存。可以先关闭自定义图片并还原。');
        return;
      }
      render();
    } catch (e) {
      alert('替换失败：' + ((e && e.message) || e));
    }
  }

  // ---------- ② 道具分布 ----------
  const MAPS = Array.isArray(window.MAPS) ? window.MAPS : [];
  const COVER = (window.COVERAGE && typeof window.COVERAGE === 'object') ? window.COVERAGE : {};
  const mapGrid = $('mapGrid');
  const mapSearch = $('mapSearch');
  const subviews = { l1: $('itemL1'), l2: $('itemL2'), l3: $('itemL3') };
  let currentMap = null;

  function showSub(name, restoreScroll) {
    if (subviews[itemsDepth] && itemsDepth !== name) {
      scrollMemo[itemsDepth] = mainEl.scrollTop;
    }
    itemsDepth = name;
    Object.keys(subviews).forEach(k => {
      if (subviews[k]) subviews[k].classList.toggle('active', k === name);
    });
    mainEl.scrollTop = restoreScroll ? (scrollMemo[name] || 0) : 0;
  }

  function renderMaps() {
    const q = (mapSearch.value || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    mapGrid.innerHTML = '';

    // 有搜索词 → 扁平列出匹配的道具（空格分隔多关键词，全部命中才算）
    if (tokens.length) {
      const rows = [];
      MAPS.forEach(m => (m.items || []).forEach(it => {
        // 只匹配「目的地（地图名）」+「道具名（类型）」；
        // 不拼覆盖范围、不碰正文，否则「除了门多萨」这种文字会被误命中
        const title = it.name + (it.type ? '（' + it.type + '）' : '');
        const hay = (m.name + ' ' + title).toLowerCase();
        if (tokens.every(t => hay.indexOf(t) >= 0)) rows.push({ m: m, it: it });
      }));

      if (!rows.length) {
        mapGrid.style.gridTemplateColumns = '';
        const d = document.createElement('div');
        d.className = 'empty';
        d.textContent = '没有匹配的道具';
        mapGrid.appendChild(d);
        return;
      }

      mapGrid.style.gridTemplateColumns = '1fr';
      rows.forEach(r => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rowbtn';

        const b = document.createElement('b');
        b.textContent = r.it.name + (r.it.type ? '（' + r.it.type + '）' : '');
        btn.appendChild(b);

        const s = document.createElement('i');
        s.textContent = r.m.name + (COVER[r.it.name] ? ' · ' + COVER[r.it.name] : '');
        btn.appendChild(s);

        btn.addEventListener('click', () => {
          currentMap = r.m;
          enterArticle(r.m, r.it);
        });
        mapGrid.appendChild(btn);
      });
      return;
    }

    const list = MAPS;

    if (!list.length) {
      mapGrid.style.gridTemplateColumns = '';
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = '没有匹配的地图';
      mapGrid.appendChild(d);
      return;
    }

    mapGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    list.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mapbtn';

      const name = document.createElement('b');
      name.textContent = m.name;
      btn.appendChild(name);

      if (m.sub) {
        const sub = document.createElement('i');
        sub.textContent = m.sub;
        btn.appendChild(sub);
      }

      const cnt = document.createElement('em');
      cnt.textContent = (m.items || []).length + ' 个道具';
      btn.appendChild(cnt);

      btn.addEventListener('click', () => enterMap(m));
      mapGrid.appendChild(btn);
    });
  }

  function enterMap(m) {
    openMap(m, false);
    pushLevel({ items: 'l2' });
  }

  function openMap(m, restoreScroll) {
    currentMap = m;
    $('mapTitle').textContent = m.name;

    const box = $('itemGrid');
    box.innerHTML = '';

    const items = m.items || [];
    if (!items.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = '道具待更新';
      box.appendChild(d);
    } else {
      items.forEach(it => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pill';
        btn.textContent = it.type ? it.name + ' · ' + it.type : it.name;
        btn.addEventListener('click', () => enterArticle(m, it));
        box.appendChild(btn);
      });
    }

    showSub('l2', !!restoreScroll);
  }

  // 在文章末尾补一行覆盖范围
  function applyCoverage(body, name) {
    const c = COVER[name];
    if (!c) return;
    const p = document.createElement('p');
    p.className = 'cover';
    p.textContent = '覆盖范围：' + c;
    body.appendChild(p);
  }

  function renderMd(body, path, inlineHtml, quiet, covName) {
    body.innerHTML = '<p class="waiting">加载中…</p>';
    fetch(path, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(text => {
        // md 文件里已写了「覆盖范围」这一条，不再追加，避免重复显示
        body.innerHTML = mdToHtml(text, baseDirOf(path));
      })
      .catch(err => {
        const fallback = inlineHtml || '<p class="waiting">内容待更新</p>';
        body.innerHTML = quiet
          ? fallback
          : fallback + '<p class="waiting">（Markdown 加载失败：' + ((err && err.message) || err) + '）</p>';
        applyCoverage(body, covName);
      });
  }

  function openArticle(m, it) {
    $('itemTitle').textContent = m.name + ' · ' + it.name + (it.type ? '（' + it.type + '）' : '');

    const body = $('articleBody');
    body.innerHTML = '';
    showSub('l3', false);

    const inlineHtml = String(it.html || '').trim();

    // 1) iframe 整页 HTML（file 字段）
    if (it.file) {
      const frame = document.createElement('iframe');
      frame.className = 'article-frame';
      frame.src = it.file;
      body.appendChild(frame);
      return;
    }

    // 2) 显式指定的 md
    if (it.md) {
      renderMd(body, it.md, inlineHtml, false, it.name);
      return;
    }

    // 3) 自动匹配同名 md：data/articles/<地图id>/<道具名>.md（文件名 = 道具名）
    const safeName = String(it.name).replace(/[\\/:*?"<>|]/g, '_');
    renderMd(body, 'data/articles/' + m.id + '/' + safeName + '.md', inlineHtml, true, it.name);
  }

  function enterArticle(m, it) {
    openArticle(m, it);
    pushLevel({ items: 'l3' });
  }

  // ---------- 极简 Markdown 渲染（无外部依赖） ----------
  function baseDirOf(path) {
    const p = String(path || '');
    const i = p.lastIndexOf('/');
    return i >= 0 ? p.slice(0, i + 1) : '';
  }

  function mdToHtml(src, baseDir) {
    const base = baseDir || '';
    // 相对路径补上 md 所在目录；绝对地址/data:/锚点原样保留
    const fix = url => (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url) ? url : base + url);

    const esc = s => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const inline = s => esc(s)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m0, alt, url) => '<img src="' + fix(url) + '" alt="' + alt + '">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m0, txt, url) => '<a href="' + fix(url) + '">' + txt + '</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let listTag = null;

    const closeList = () => {
      if (listTag) { out.push('</' + listTag + '>'); listTag = null; }
    };

    lines.forEach(raw => {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { closeList(); return; }
      if (/^\s*<!--/.test(line)) { closeList(); return; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        const lv = Math.min(h[1].length + 1, 6);
        out.push('<h' + lv + '>' + inline(h[2]) + '</h' + lv + '>');
        return;
      }

      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { closeList(); out.push('<hr>'); return; }

      const q = line.match(/^\s*>\s?(.*)$/);
      if (q) { closeList(); out.push('<blockquote>' + inline(q[1]) + '</blockquote>'); return; }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        if (listTag !== 'ul') { closeList(); out.push('<ul>'); listTag = 'ul'; }
        out.push('<li>' + inline(ul[1]) + '</li>');
        return;
      }

      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) {
        if (listTag !== 'ol') { closeList(); out.push('<ol>'); listTag = 'ol'; }
        out.push('<li>' + inline(ol[1]) + '</li>');
        return;
      }

      closeList();
      out.push('<p>' + inline(line) + '</p>');
    });

    closeList();
    return out.join('\n');
  }

  mapSearch.addEventListener('input', renderMaps);

  // ---------- 系统返回键（宿主走 WebView 历史） ----------
  let navDepth = 0;

  function pushLevel(state) {
    try {
      history.pushState(state, '');
      navDepth++;
    } catch (e) {}
  }

  window.addEventListener('popstate', ev => {
    if (navDepth > 0) navDepth--;

    const st = ev.state || {};

    // 关于页：退回到设置列表
    if (setAbout && setAbout.classList.contains('active')) {
      if (!st.about) closeAbout();
      return;
    }

    // 文章 → 二级
    if (st.items === 'l2') {
      paintTab('items');
      openMap(currentMap, true);
      return;
    }
    if (st.items === 'l3') return;

    // 二级 → 一级
    paintTab('items');
    showSub('l1', true);
  });

  $('backL1').addEventListener('click', () => {
    if (navDepth > 0) history.back();
    else showSub('l1', true);
  });

  $('backL2').addEventListener('click', () => {
    if (navDepth > 0) history.back();
    else if (currentMap) openMap(currentMap, true);
    else showSub('l1', true);
  });

  // ---------- 内置 SVG 立绘 ----------
  let uid = 0;

  function portraitSVG(mask, hair) {
    const has = bit => (mask & bit) !== 0;
    const hc = HAIRS[hair].color;
    const g = 'g' + (++uid);
    const p = [];

    p.push('<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">');
    p.push('<defs><radialGradient id="' + g + 'b" cx="50%" cy="18%" r="85%">');
    p.push('<stop offset="0" stop-color="#2c2c3a"/><stop offset="1" stop-color="#141420"/></radialGradient>');
    p.push('<linearGradient id="' + g + 's" x1="0" y1="0" x2="0" y2="1">');
    p.push('<stop offset="0" stop-color="#d3ac90"/><stop offset="1" stop-color="#a87f66"/></linearGradient></defs>');
    p.push('<rect width="300" height="300" fill="url(#' + g + 'b)"/>');

    p.push('<path d="M28 300C38 236 92 208 150 208s112 28 122 92z" fill="#262630"/>');
    p.push('<path d="M118 214l32 34 32-34 16 10-48 50-48-50z" fill="#1c1c26"/>');
    p.push('<path d="M132 168h36v52a18 18 0 0 1-36 0z" fill="#b5896d"/>');

    if (has(16)) {
      p.push('<path d="M120 216q30 34 60 0" fill="none" stroke="#d9b95c" stroke-width="3"/>');
      p.push('<circle cx="150" cy="234" r="6.5" fill="#d9b95c"/>');
      p.push('<circle cx="124" cy="216" r="2.5" fill="#d9b95c"/>');
      p.push('<circle cx="176" cy="216" r="2.5" fill="#d9b95c"/>');
    }

    p.push('<ellipse cx="150" cy="124" rx="47" ry="55" fill="url(#' + g + 's)"/>');
    p.push('<ellipse cx="103" cy="128" rx="8" ry="12" fill="#bd9276"/>');
    p.push('<ellipse cx="197" cy="128" rx="8" ry="12" fill="#bd9276"/>');

    if (hair === 0) {
      p.push('<path d="M112 84q38-20 76 0" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4"/>');
    } else {
      p.push('<path d="M101 122q9-62 49-62t49 62q-13-30-49-30t-49 30z" fill="' + hc + '"/>');
      p.push('<path d="M103 122q4-16 10-22l4 30z" fill="' + hc + '"/>');
      p.push('<path d="M197 122q-4-16-10-22l-4 30z" fill="' + hc + '"/>');
    }

    if (has(1)) {
      p.push('<path d="M168 142q12-6 22 2" fill="none" stroke="#4a5f6e" stroke-width="2.6" stroke-linecap="round"/>');
      p.push('<path d="M118 150l7 12M125 150l-7 12" fill="none" stroke="#4a5f6e" stroke-width="2.2" stroke-linecap="round"/>');
    }

    p.push('<path d="M124 112q9-5 18 0" fill="none" stroke="#2a2018" stroke-width="2.6" stroke-linecap="round"/>');
    p.push('<path d="M158 112q9-5 18 0" fill="none" stroke="#2a2018" stroke-width="2.6" stroke-linecap="round"/>');
    p.push('<circle cx="133" cy="122" r="3.4" fill="#26201c"/>');
    p.push('<circle cx="167" cy="122" r="3.4" fill="#26201c"/>');
    p.push('<path d="M150 124v12h-6" fill="none" stroke="#98755d" stroke-width="2.2" stroke-linecap="round"/>');
    p.push('<path d="M140 150q10 5 20 0" fill="none" stroke="#8a5f52" stroke-width="2.4" stroke-linecap="round"/>');

    if (has(4)) {
      p.push('<rect x="112" y="110" width="34" height="24" rx="8" fill="rgba(150,200,230,.16)" stroke="#9dc0d6" stroke-width="2.6"/>');
      p.push('<rect x="154" y="110" width="34" height="24" rx="8" fill="rgba(150,200,230,.16)" stroke="#9dc0d6" stroke-width="2.6"/>');
      p.push('<path d="M146 121h8" stroke="#9dc0d6" stroke-width="2.6"/>');
    }

    if (has(8)) {
      p.push('<circle cx="102" cy="143" r="5" fill="#d9b95c"/>');
      p.push('<circle cx="198" cy="143" r="5" fill="#d9b95c"/>');
    }

    if (has(2)) {
      p.push('<path d="M102 104q48-64 96 0z" fill="#39404e"/>');
      p.push('<rect x="96" y="98" width="108" height="13" rx="6.5" fill="#2b313c"/>');
    }

    p.push('</svg>');
    return p.join('');
  }

  // ---------- 启动 ----------
  applyTheme();
  renderMaps();
  render();
})();
