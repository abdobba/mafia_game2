/* ══════════════════════════════════════════════════════════════
   MAFIA GAME — FEATURES ADDON v2
   - Multiple Themes (5 themes)
   - Visual Effects (particles, role reveal, win explosion)
   - Player Statistics & XP System
   © 2025 Abdulrahman Rabie Barakat
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════
   1. THEME SYSTEM
══════════════════════════════════════ */

const THEMES = {
  dark: {
    label: 'داكن', icon: '🌑',
    vars: {
      '--bg': '#0f0f13', '--bg2': '#18181f',
      '--surface': 'rgba(255,255,255,0.05)', '--surface2': 'rgba(255,255,255,0.08)',
      '--border': 'rgba(255,255,255,0.1)', '--border2': 'rgba(255,255,255,0.15)',
      '--text': '#f0f0f0', '--text2': '#bbb', '--text3': '#777', '--text4': '#555',
      '--accent': '#e8354a', '--accent2': '#c0192b',
      '--card-bg': 'rgba(255,255,255,0.05)', '--overlay-bg': '#18181f',
      '--input-bg': 'rgba(255,255,255,0.06)', '--select-bg': '#1e1e2a',
      '--copy-color': '#444', '--shadow': 'rgba(0,0,0,0.4)',
      '--gradient-1': 'rgba(180,30,30,0.12)', '--gradient-2': 'rgba(80,20,120,0.12)',
    },
    bodyClass: ''
  },
  light: {
    label: 'فاتح', icon: '☀️',
    vars: null,
    bodyClass: 'light'
  },
  ocean: {
    label: 'المحيط', icon: '🌊',
    vars: {
      '--bg': '#060d1a', '--bg2': '#0a1628',
      '--surface': 'rgba(0,180,255,0.06)', '--surface2': 'rgba(0,180,255,0.1)',
      '--border': 'rgba(0,180,255,0.15)', '--border2': 'rgba(0,180,255,0.25)',
      '--text': '#e0f4ff', '--text2': '#80c8e8', '--text3': '#3a7a9a', '--text4': '#1a4a6a',
      '--accent': '#00b4ff', '--accent2': '#0080cc',
      '--card-bg': 'rgba(0,160,220,0.07)', '--overlay-bg': '#0a1628',
      '--input-bg': 'rgba(0,180,255,0.05)', '--select-bg': '#0c1a30',
      '--copy-color': '#1a4a6a', '--shadow': 'rgba(0,100,200,0.3)',
      '--gradient-1': 'rgba(0,100,200,0.15)', '--gradient-2': 'rgba(0,50,150,0.12)',
    },
    bodyClass: 'theme-ocean'
  },
  forest: {
    label: 'الغابة', icon: '🌲',
    vars: {
      '--bg': '#080f08', '--bg2': '#0f1a0f',
      '--surface': 'rgba(50,200,80,0.06)', '--surface2': 'rgba(50,200,80,0.1)',
      '--border': 'rgba(50,200,80,0.15)', '--border2': 'rgba(50,200,80,0.25)',
      '--text': '#e0ffe4', '--text2': '#7dcf8a', '--text3': '#3a7a44', '--text4': '#1a4a22',
      '--accent': '#3dcf5a', '--accent2': '#1e9e3a',
      '--card-bg': 'rgba(50,200,80,0.06)', '--overlay-bg': '#0f1a0f',
      '--input-bg': 'rgba(50,200,80,0.05)', '--select-bg': '#111f11',
      '--copy-color': '#1a4a22', '--shadow': 'rgba(0,80,20,0.4)',
      '--gradient-1': 'rgba(30,150,50,0.15)', '--gradient-2': 'rgba(10,80,20,0.12)',
    },
    bodyClass: 'theme-forest'
  },
  royal: {
    label: 'الملكي', icon: '👑',
    vars: {
      '--bg': '#0d080f', '--bg2': '#180d1e',
      '--surface': 'rgba(160,80,255,0.07)', '--surface2': 'rgba(160,80,255,0.11)',
      '--border': 'rgba(160,80,255,0.18)', '--border2': 'rgba(160,80,255,0.28)',
      '--text': '#f0e6ff', '--text2': '#c090f0', '--text3': '#7040a0', '--text4': '#401a60',
      '--accent': '#b060ff', '--accent2': '#8030cc',
      '--card-bg': 'rgba(140,60,220,0.07)', '--overlay-bg': '#180d1e',
      '--input-bg': 'rgba(160,80,255,0.06)', '--select-bg': '#1c1028',
      '--copy-color': '#401a60', '--shadow': 'rgba(100,0,200,0.35)',
      '--gradient-1': 'rgba(120,40,200,0.18)', '--gradient-2': 'rgba(60,10,120,0.14)',
    },
    bodyClass: 'theme-royal'
  }
};

let _currentTheme = localStorage.getItem('mafiaTheme') || 'dark';

function _applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return;

  document.body.classList.remove('light', 'theme-ocean', 'theme-forest', 'theme-royal');

  const root = document.documentElement;

  if (theme.vars) {
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    // Light: remove all custom var overrides
    Object.keys(THEMES.dark.vars).forEach(k => root.style.removeProperty(k));
  }

  if (theme.bodyClass) document.body.classList.add(theme.bodyClass);

  _currentTheme = name;
  localStorage.setItem('mafiaTheme', name);

  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme.icon;

  document.querySelectorAll('.ft-theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
    el.style.borderColor = el.dataset.theme === name ? 'var(--accent)' : 'var(--border)';
  });

  _applyAccentOverride(name);
}

function _applyAccentOverride(name) {
  const isCustom = ['ocean', 'forest', 'royal'].includes(name);
  let styleEl = document.getElementById('ft-accent-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'ft-accent-override';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = isCustom ? `
    .btn-main, .btn-reveal, .btn-timer-start, .consent-enter-btn {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%) !important;
    }
    .num-big { color: var(--accent) !important; text-shadow: 0 0 40px var(--accent) !important; }
    .logo span { color: var(--accent) !important; }
    .counter span { color: var(--accent) !important; }
    .speak-timer-big { color: var(--accent) !important; text-shadow: 0 0 20px var(--accent) !important; }
    .vote-count { color: var(--accent) !important; }
    .round-item-title { color: var(--accent) !important; }
    .help-section-title { color: var(--accent) !important; }
    .warn { color: var(--accent) !important; }
    .progress-bar-fill { background: linear-gradient(90deg, var(--accent), var(--accent2)) !important; }
    .timer-display.urgent { color: var(--accent) !important; }
    .btn-add-round, .btn-declare { color: var(--accent) !important; }
    .consent-author, .consent-term-num { color: var(--accent) !important; }
    .preset-btn.active, .speak-preset.active {
      background: rgba(128,128,255,0.15) !important;
      color: var(--accent) !important;
      border-color: var(--accent) !important;
    }
    .player-dot {
      background: rgba(128,128,255,0.1) !important;
      border-color: var(--accent) !important;
      color: var(--accent) !important;
    }
  ` : '';
}

function openThemePicker() {
  const existing = document.getElementById('ft-theme-picker');
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement('div');
  overlay.id = 'ft-theme-picker';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:600;
    display:flex;align-items:flex-end;justify-content:center;
    padding:1rem;backdrop-filter:blur(6px);
  `;
  overlay.innerHTML = `
    <div style="
      background:var(--overlay-bg);border:1px solid var(--border);
      border-radius:20px 20px 16px 16px;padding:1.2rem;
      width:100%;max-width:440px;
      animation:ft-slide-up 0.25s cubic-bezier(.34,1.56,.64,1) both;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <span style="font-size:16px;font-weight:800;color:var(--text);">🎨 اختار الثيم</span>
        <button onclick="document.getElementById('ft-theme-picker').remove()"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
                 padding:4px 10px;color:var(--text2);font-size:15px;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
        ${Object.entries(THEMES).map(([key, t]) => `
          <button class="ft-theme-option" data-theme="${key}"
            onclick="_applyTheme('${key}');document.getElementById('ft-theme-picker').remove();"
            style="
              display:flex;flex-direction:column;align-items:center;gap:5px;
              padding:10px 6px;border-radius:14px;background:var(--surface);
              border:2px solid ${key === _currentTheme ? 'var(--accent)' : 'var(--border)'};
              cursor:pointer;font-family:'Tajawal',Arial,sans-serif;transition:all 0.18s;
            ">
            <span style="font-size:22px;">${t.icon}</span>
            <span style="font-size:10px;font-weight:700;color:var(--text2);">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

window.toggleTheme = openThemePicker;


/* ══════════════════════════════════════
   2. VISUAL EFFECTS
══════════════════════════════════════ */

function _getParticleContainer() {
  let c = document.getElementById('ft-particles');
  if (!c) {
    c = document.createElement('div');
    c.id = 'ft-particles';
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(c);
  }
  return c;
}

function _burst(x, y, color, count = 16) {
  const container = _getParticleContainer();
  for (let i = 0; i < count; i++) {
    const p     = document.createElement('div');
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const dist  = 50 + Math.random() * 70;
    const size  = 4 + Math.random() * 5;
    const dur   = 550 + Math.random() * 350;
    p.style.cssText = `
      position:absolute;left:${x}px;top:${y}px;
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};transform:translate(-50%,-50%);
      animation:ft-burst ${dur}ms ease-out forwards;
      --dx:${Math.cos(angle * Math.PI / 180) * dist}px;
      --dy:${Math.sin(angle * Math.PI / 180) * dist}px;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), dur + 50);
  }
}

function _confetti() {
  const container = _getParticleContainer();
  const colors = ['var(--accent)', '#ffd700', '#ffffff', '#ff9900', '#00ddff'];
  for (let i = 0; i < 70; i++) {
    setTimeout(() => {
      const p   = document.createElement('div');
      const sz  = 5 + Math.random() * 8;
      const dur = 1100 + Math.random() * 900;
      p.style.cssText = `
        position:absolute;
        left:${Math.random() * window.innerWidth}px;top:-14px;
        width:${sz}px;height:${sz}px;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        background:${colors[Math.floor(Math.random() * colors.length)]};
        transform:rotate(${Math.random() * 360}deg);
        animation:ft-confetti ${dur}ms ease-in forwards;
        --rx:${(Math.random() - 0.5) * 120}px;
      `;
      container.appendChild(p);
      setTimeout(() => p.remove(), dur + 60);
    }, i * 28);
  }
}

function _flashOverlay(color, opacity, duration) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;background:${color};opacity:0;
    pointer-events:none;z-index:8000;transition:opacity 0.12s ease;
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = opacity;
    setTimeout(() => {
      el.style.transition = `opacity ${duration}ms ease`;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), duration + 50);
    }, 150);
  });
}

function _onRoleRevealed() {
  setTimeout(() => {
    const titleEl = document.getElementById('reveal-role-title');
    const badge   = document.getElementById('role-emoji');
    if (!titleEl) return;
    const text = titleEl.textContent || '';
    let color = '#888888';
    if (text.includes('مافيا'))     color = '#e8354a';
    else if (text.includes('محقق')) color = '#4a90e8';
    else if (text.includes('طبيب')) color = '#4cc97a';
    _flashOverlay(color, 0.1, 300);
    if (badge) {
      const r = badge.getBoundingClientRect();
      _burst(r.left + r.width / 2, r.top + r.height / 2, color, 14);
    }
  }, 60);
}

function _onPhaseToggled() {
  setTimeout(() => {
    const card = document.getElementById('phase-card');
    const isNight = card && card.classList.contains('night');
    _flashOverlay(isNight ? '#000033' : '#fffbe0', 0.15, 400);
  }, 40);
}

function _onWin() {
  _confetti();
  document.body.style.animation = 'ft-shake 0.4s ease both';
  setTimeout(() => { document.body.style.animation = ''; }, 420);
}

function _hookGameFunctions() {
  const hooks = [
    ['showRole',       () => { const o = window.showRole;       window.showRole       = function(){ o.apply(this,arguments); _onRoleRevealed(); }; window.showRole._ftH = true; }],
    ['togglePhase',    () => { const o = window.togglePhase;    window.togglePhase    = function(){ o.apply(this,arguments); _onPhaseToggled(); }; window.togglePhase._ftH = true; }],
    ['declareExpelled',() => { const o = window.declareExpelled;window.declareExpelled= function(){ o.apply(this,arguments); setTimeout(()=>_flashOverlay('#ff3300',0.14,450),80); }; window.declareExpelled._ftH = true; }],
    ['showWinBanner',  () => { const o = window.showWinBanner;  window.showWinBanner  = function(){ o.apply(this,arguments); setTimeout(_onWin,200); }; window.showWinBanner._ftH = true; }],
  ];
  hooks.forEach(([name, fn]) => {
    if (window[name] && !window[name]._ftH) fn();
  });
}


/* ══════════════════════════════════════
   3. PLAYER STATISTICS & XP
══════════════════════════════════════ */

const _STATS_KEY = 'mafiaPlayerStats_v2';
const _XP_GAME   = 10;
const _XP_WIN    = 25;
const _XP_ROLE   = { mafia: 5, detective: 8, doctor: 6, citizen: 3 };
const _RANKS     = [
  { name: 'مبتدئ',   icon: '🥉', min: 0   },
  { name: 'محترف',  icon: '🥈', min: 50  },
  { name: 'خبير',   icon: '🥇', min: 120 },
  { name: 'أسطورة', icon: '💎', min: 250 },
  { name: 'بطل',    icon: '👑', min: 500 },
];

function _getRank(xp) {
  let r = _RANKS[0];
  for (const rank of _RANKS) { if (xp >= rank.min) r = rank; }
  return r;
}

function _getPlayerStats() {
  try { return JSON.parse(localStorage.getItem(_STATS_KEY)) || {}; }
  catch { return {}; }
}

function _savePlayerStats(s) { localStorage.setItem(_STATS_KEY, JSON.stringify(s)); }

function _recordGame(playerRoleMap, winner) {
  const stats = _getPlayerStats();
  playerRoleMap.forEach(({ name, role }) => {
    if (!name) return;
    if (!stats[name]) stats[name] = { games: 0, wins: 0, xp: 0, roles: {}, since: Date.now() };
    const p = stats[name];
    p.games++;
    p.xp += _XP_GAME + (_XP_ROLE[role] || 3);
    p.roles[role] = (p.roles[role] || 0) + 1;
    p.last = Date.now();
    const won = winner === 'mafia' ? role === 'mafia' : role !== 'mafia';
    if (won) { p.wins++; p.xp += _XP_WIN; }
  });
  _savePlayerStats(stats);
}

function _hookResetGame() {
  const origReset = window.resetGame;
  if (!origReset || origReset._ftH) return;
  window.resetGame = function() {
    try {
      const summary   = document.getElementById('host-summary');
      const winBanner = document.getElementById('win-banner');
      if (summary && summary.innerHTML.trim()) {
        const map = [];
        summary.querySelectorAll('.summary-row').forEach(row => {
          const roleEl  = row.querySelector('.summary-role');
          const namesEl = row.querySelector('.summary-names');
          if (!roleEl || !namesEl) return;
          const txt = roleEl.textContent.trim();
          let role = 'citizen';
          if (txt.includes('مافيا'))     role = 'mafia';
          else if (txt.includes('محقق')) role = 'detective';
          else if (txt.includes('طبيب')) role = 'doctor';
          namesEl.textContent.split('،').forEach(n => {
            const name = n.trim();
            if (name) map.push({ name, role });
          });
        });
        let winner = null;
        if (winBanner && winBanner.innerHTML) {
          if (winBanner.innerHTML.includes('mafia-win'))   winner = 'mafia';
          if (winBanner.innerHTML.includes('citizen-win')) winner = 'citizen';
        }
        if (map.length) _recordGame(map, winner);
      }
    } catch(e) {}
    origReset.apply(this, arguments);
    setTimeout(_renderMiniStats, 150);
  };
  window.resetGame._ftH = true;
}

function _renderMiniStats() {
  const el = document.getElementById('stats-display');
  if (!el) return;

  const stats   = _getPlayerStats();
  const entries = Object.entries(stats).sort((a, b) => b[1].xp - a[1].xp);

  if (!entries.length) {
    // Fallback to original game-level stats
    try {
      const gs = JSON.parse(localStorage.getItem('mafia_stats')) || {};
      if (!gs.gamesPlayed) { el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.innerHTML =
        '<div class="stat-item">🎮 <span>' + gs.gamesPlayed + '</span> لعبة</div>' +
        '<div class="stat-item">🔫 <span>' + gs.mafiaWins + '</span> فوز مافيا</div>' +
        '<div class="stat-item">👥 <span>' + gs.citizenWins + '</span> فوز مواطنين</div>';
    } catch { el.style.display = 'none'; }
    return;
  }

  const top3 = entries.slice(0, 3);
  el.style.display = 'block';
  el.innerHTML = `
    <div style="font-size:11px;font-weight:800;color:var(--text3);margin-bottom:8px;letter-spacing:.4px;">🏆 لوحة الشرف</div>
    ${top3.map(([name, d]) => {
      const rank    = _getRank(d.xp);
      const winRate = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
          <span style="font-size:20px;">${rank.icon}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:800;color:var(--text);">${name}</div>
            <div style="font-size:10px;color:var(--text3);">${rank.name} · ${d.xp} XP · فوز ${winRate}%</div>
          </div>
          <div style="font-size:11px;color:var(--text3);font-weight:600;">${d.games} 🎮</div>
        </div>
      `;
    }).join('')}
    <button onclick="openStatsModal()"
      style="
        width:100%;margin-top:9px;padding:8px;border-radius:10px;
        background:var(--surface2);border:1px solid var(--border);
        color:var(--text3);font-size:12px;font-weight:700;
        font-family:'Tajawal',Arial,sans-serif;cursor:pointer;
      ">📊 كل الإحصائيات</button>
  `;
}

function openStatsModal() {
  const existing = document.getElementById('ft-stats-modal');
  if (existing) { existing.remove(); return; }

  const stats   = _getPlayerStats();
  const entries = Object.entries(stats).sort((a, b) => b[1].xp - a[1].xp);
  const roleEmoji = { mafia: '🔫', detective: '🔍', doctor: '💊', citizen: '👤' };

  const overlay = document.createElement('div');
  overlay.id = 'ft-stats-modal';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:500;
    display:flex;align-items:center;justify-content:center;
    padding:1rem;backdrop-filter:blur(6px);
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `
    background:var(--overlay-bg);border:1px solid var(--border);
    border-radius:20px;padding:1.5rem;width:100%;max-width:420px;
    max-height:88vh;display:flex;flex-direction:column;
    animation:ft-slide-up 0.22s cubic-bezier(.34,1.56,.64,1) both;
  `;

  if (!entries.length) {
    inner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <span style="font-size:16px;font-weight:800;color:var(--text);">📊 إحصائيات اللاعبين</span>
        <button onclick="document.getElementById('ft-stats-modal').remove()"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
                 padding:4px 10px;color:var(--text2);cursor:pointer;">✕</button>
      </div>
      <div style="color:var(--text3);font-size:13px;padding:2rem 0;text-align:center;line-height:1.8;">
        لم يتم تسجيل أي إحصائيات بعد 🎮<br>
        <span style="font-size:11px;opacity:.7;">الإحصائيات بتتسجل تلقائياً عند الضغط على "لعبة جديدة"</span>
      </div>
    `;
  } else {
    const rows = entries.map(([name, d], idx) => {
      const rank     = _getRank(d.xp);
      const nextRank = _RANKS.find(r => r.min > d.xp);
      const pct      = nextRank
        ? Math.min(100, Math.round(((d.xp - rank.min) / (nextRank.min - rank.min)) * 100))
        : 100;
      const winRate  = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
      const favRole  = Object.entries(d.roles || {}).sort((a, b) => b[1] - a[1])[0];
      return `
        <div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);">
          <div style="font-size:12px;font-weight:900;color:var(--text3);min-width:20px;padding-top:4px;">${idx + 1}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
              <span style="font-size:18px;">${rank.icon}</span>
              <span style="font-size:14px;font-weight:800;color:var(--text);flex:1;">${name}</span>
              <span style="font-size:10px;font-weight:700;color:var(--accent);
                background:rgba(128,128,255,0.12);border-radius:20px;padding:2px 8px;">${rank.name}</span>
            </div>
            <div style="height:4px;background:var(--surface2);border-radius:10px;margin-bottom:6px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:10px;"></div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--text3);font-weight:600;">
              <span>🎮 ${d.games}</span>
              <span>🏆 ${d.wins} (${winRate}%)</span>
              <span>⚡ ${d.xp} XP</span>
              ${nextRank ? `<span>📈 ${nextRank.min - d.xp} للـ${nextRank.name}</span>` : '<span>🔝 أعلى رتبة!</span>'}
              ${favRole ? `<span>${roleEmoji[favRole[0]] || '👤'} ×${favRole[1]}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    inner.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <span style="font-size:16px;font-weight:800;color:var(--text);">📊 إحصائيات اللاعبين</span>
        <button onclick="document.getElementById('ft-stats-modal').remove()"
          style="background:var(--surface);border:1px solid var(--border);border-radius:8px;
                 padding:4px 10px;color:var(--text2);cursor:pointer;">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding-right:2px;">${rows}</div>
      <button onclick="_confirmResetStats()"
        style="width:100%;margin-top:12px;padding:10px;border-radius:10px;
          background:rgba(232,53,74,0.08);border:1px solid rgba(232,53,74,0.25);
          color:#e8354a;font-size:13px;font-weight:700;
          font-family:'Tajawal',Arial,sans-serif;cursor:pointer;">
        🗑 إعادة ضبط الإحصائيات
      </button>
    `;
  }

  overlay.appendChild(inner);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function _confirmResetStats() {
  if (confirm('هل أنت متأكد من مسح كل الإحصائيات؟')) {
    localStorage.removeItem(_STATS_KEY);
    document.getElementById('ft-stats-modal')?.remove();
    _renderMiniStats();
  }
}

function _addStatsBtnToDone() {
  const doneScreen = document.getElementById('screen-done');
  if (!doneScreen || document.getElementById('ft-stats-done-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'ft-stats-done-btn';
  btn.style.cssText = `
    width:100%;padding:13px;border-radius:13px;
    background:var(--surface);border:1px solid var(--border);
    font-size:15px;font-weight:700;color:var(--text2);
    font-family:'Tajawal',Arial,sans-serif;
    margin-bottom:0.6rem;cursor:pointer;display:block;
  `;
  btn.textContent = '📊 إحصائيات اللاعبين';
  btn.onclick = openStatsModal;
  const mainBtn = doneScreen.querySelector('.btn-main');
  if (mainBtn) doneScreen.insertBefore(btn, mainBtn);
  else doneScreen.appendChild(btn);
}


/* ══════════════════════════════════════
   4. KEYFRAMES
══════════════════════════════════════ */

function _injectKeyframes() {
  if (document.getElementById('ft-keyframes')) return;
  const s = document.createElement('style');
  s.id = 'ft-keyframes';
  s.textContent = `
    @keyframes ft-burst {
      0%   { transform:translate(-50%,-50%) scale(1); opacity:1; }
      100% { transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(0); opacity:0; }
    }
    @keyframes ft-confetti {
      0%   { transform:translateY(0) translateX(0) rotate(0deg); opacity:1; }
      100% { transform:translateY(100vh) translateX(var(--rx)) rotate(540deg); opacity:0; }
    }
    @keyframes ft-slide-up {
      from { transform:translateY(70px); opacity:0; }
      to   { transform:translateY(0);    opacity:1; }
    }
    @keyframes ft-shake {
      0%,100% { transform:translateX(0); }
      20%     { transform:translateX(-5px); }
      40%     { transform:translateX(5px); }
      60%     { transform:translateX(-4px); }
      80%     { transform:translateX(4px); }
    }
  `;
  document.head.appendChild(s);
}


/* ══════════════════════════════════════
   5. INIT
══════════════════════════════════════ */

function _ftInit() {
  _injectKeyframes();
  _applyTheme(_currentTheme);
  _hookGameFunctions();
  _hookResetGame();
  _renderMiniStats();

  // Watch for screen-done to inject stats button
  const observer = new MutationObserver(() => {
    const done = document.getElementById('screen-done');
    if (done && done.classList.contains('active')) setTimeout(_addStatsBtnToDone, 100);
  });
  const app = document.getElementById('app');
  if (app) observer.observe(app, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Re-hook after consent accepted (app becomes visible)
  const origAccept = window.acceptConsent;
  if (origAccept && !origAccept._ftH) {
    window.acceptConsent = function() {
      origAccept.apply(this, arguments);
      setTimeout(() => { _hookGameFunctions(); _hookResetGame(); _renderMiniStats(); }, 600);
    };
    window.acceptConsent._ftH = true;
  }
}

// Globals
window._applyTheme        = _applyTheme;
window.openThemePicker    = openThemePicker;
window.openStatsModal     = openStatsModal;
window._confirmResetStats = _confirmResetStats;

document.addEventListener('DOMContentLoaded', _ftInit);
