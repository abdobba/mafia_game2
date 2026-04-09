'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
let playerCount  = 6;
let roles        = { mafia: 1, detective: 1, doctor: 1 };
let assignedRoles = [];
let currentIndex  = 0;
let soundEnabled  = true;
let revealLocked  = false;

// Timer
let timerDuration  = 180;
let timerRemaining = 180;
let timerRunning   = false;
let timerInterval  = null;

// Round log
let roundNumber   = 1;
let roundLog      = [];
let activePlayers = [];

const roleData = {
  mafia:    { emoji: '🔫', title: 'المافيا',    info: 'أنت من المافيا! تتعاون مع فريقك ليلاً لتقتلوا مواطناً. نهاراً تتظاهر بأنك بريء.' },
  detective:{ emoji: '🔍', title: 'المحقق',     info: 'أنت المحقق! كل ليلة تختار لاعباً لتعرف إن كان مافيا أم لا.' },
  doctor:   { emoji: '💊', title: 'الطبيب',     info: 'أنت الطبيب! كل ليلة تختار لاعب تنقذه من القتل.' },
  citizen:  { emoji: '👤', title: 'مواطن عادي', info: 'أنت مواطن! مفيش قدرات خاصة. شارك في النقاش وصوت لطرد المشتبه بيهم.' }
};

// ── localStorage ──────────────────────────────────────────────────────────────
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch(e) { console.warn('Storage unavailable:', e); }
}
const getSavedNames = () => load('mafia_names', []);
const getSavedRoles = () => load('mafia_roles', { mafia: 1, detective: 1, doctor: 1 });
const getSavedCount = () => load('mafia_count', 6);

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// FIX: always resume before every sound call, not just when suspended
function withAudio(fn) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const go  = () => fn(ctx);
    if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {});
    else go();
  } catch(e) { console.warn('Audio error:', e); }
}

function playTone(ctx, freq, type, startOffset, duration, gain = 0.18) {
  const osc  = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = type;
  const t = ctx.currentTime + startOffset;
  gainNode.gain.setValueAtTime(gain, t);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

function playRevealSound() {
  withAudio(ctx => {
    [523, 659, 784, 1047].forEach((freq, i) =>
      playTone(ctx, freq, 'sine', i * 0.1, 0.25));
  });
}

function playBeepSound() {
  withAudio(ctx => playTone(ctx, 660, 'sine', 0, 0.1, 0.15));
}

function playTimerEndSound() {
  withAudio(ctx => {
    [880, 660, 440].forEach((freq, i) =>
      playTone(ctx, freq, 'square', i * 0.18, 0.3, 0.15));
  });
}

function initSound() {
  soundEnabled = load('mafia_sound', true);
  updateSoundBtn();
}
function toggleSound() {
  soundEnabled = !soundEnabled;
  save('mafia_sound', soundEnabled);
  updateSoundBtn();
}
function updateSoundBtn() {
  const btn = document.getElementById('sound-btn');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
}

// ── Screen 1: Count ───────────────────────────────────────────────────────────
function initCountScreen() {
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
}

function changeCount(d) {
  playerCount = Math.max(3, Math.min(20, playerCount + d));
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
}

function updatePlayersPreview() {
  const preview = document.getElementById('players-preview');
  if (!preview) return;
  preview.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'player-dot';
    dot.textContent = i + 1;
    dot.style.animationDelay = (i * 0.03) + 's';
    preview.appendChild(dot);
  }
}

function backToCount() {
  showScreen('screen-count');
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
}

// ── Screen 2: Names ───────────────────────────────────────────────────────────
function goToNames() {
  save('mafia_count', playerCount);
  const saved = getSavedNames();
  const grid  = document.getElementById('names-grid');
  grid.innerHTML = '';

  for (let i = 0; i < playerCount; i++) {
    const input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = 'لاعب ' + (i + 1);
    input.id          = 'pname-' + i;
    input.autocomplete = 'off';
    // Enter moves to next field or submits
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = document.getElementById('pname-' + (i + 1));
      if (next) next.focus(); else goToRoles();
    });
    grid.appendChild(input);
  }

  const autoLoaded = document.getElementById('auto-loaded-notice');
  const banner     = document.getElementById('saved-names-banner');

  if (saved.length === playerCount) {
    for (let i = 0; i < playerCount; i++) {
      const el = document.getElementById('pname-' + i);
      if (el) el.value = saved[i] || '';
    }
    banner.style.display     = 'none';
    autoLoaded.style.display = 'block';
  } else if (saved.length > 0) {
    banner.style.display = 'block';
    document.getElementById('saved-names-preview').textContent = saved.join(' · ');
    autoLoaded.style.display = 'none';
  } else {
    banner.style.display     = 'none';
    autoLoaded.style.display = 'none';
  }
  showScreen('screen-names');
}

function loadSavedNames() {
  const saved = getSavedNames();
  for (let i = 0; i < playerCount; i++) {
    const input = document.getElementById('pname-' + i);
    if (input && saved[i]) input.value = saved[i];
  }
  document.getElementById('saved-names-banner').style.display = 'none';
  document.getElementById('auto-loaded-notice').style.display = 'block';
}

// ── Screen 3: Roles ───────────────────────────────────────────────────────────
function goToRoles() {
  const names = [];
  const seen  = new Set();

  for (let i = 0; i < playerCount; i++) {
    const v = (document.getElementById('pname-' + i) || {}).value?.trim() || '';
    if (!v)        { alert('من فضلك اكتب اسم كل لاعب'); return; }
    if (seen.has(v)) { alert('الاسم "' + v + '" متكرر! كل لاعب لازم يكون ليه اسم مختلف'); return; }
    seen.add(v);
    names.push(v);
  }

  save('mafia_names', names);
  roles = { ...getSavedRoles() };
  document.getElementById('cnt-mafia').textContent     = roles.mafia;
  document.getElementById('cnt-detective').textContent = roles.detective;
  document.getElementById('cnt-doctor').textContent    = roles.doctor;
  updateCitizens();
  showScreen('screen-roles');
}

function change(role, delta) {
  roles[role] = Math.max(0, roles[role] + delta);
  document.getElementById('cnt-' + role).textContent = roles[role];
  updateCitizens();
}

function updateCitizens() {
  const special  = roles.mafia + roles.detective + roles.doctor;
  const citizens = Math.max(0, playerCount - special);
  document.getElementById('citizens-count').textContent = citizens;
  const warn = document.getElementById('warn-msg');
  if      (special > playerCount)                       warn.textContent = '⚠️ عدد الأدوار (' + special + ') أكبر من عدد اللاعبين (' + playerCount + ')';
  else if (roles.mafia === 0)                           warn.textContent = '⚠️ لازم يكون فيه مافيا واحد على الأقل';
  else if (roles.mafia >= Math.ceil(playerCount / 2))  warn.textContent = '⚠️ المافيا كتير أوي! اللعبة مش هتبقى ممتعة';
  else                                                  warn.textContent = '';
}

// ── Confirm & Start ───────────────────────────────────────────────────────────
function startGame() {
  const special = roles.mafia + roles.detective + roles.doctor;
  if (special > playerCount) { alert('عدد الأدوار أكبر من عدد اللاعبين'); return; }
  if (roles.mafia === 0)     { alert('لازم يكون فيه مافيا واحد على الأقل'); return; }

  const citizens = playerCount - special;
  document.getElementById('confirm-summary').innerHTML =
    '<b>' + playerCount + ' لاعبين</b><br>' +
    '🔫 ' + roles.mafia     + ' مافيا · ' +
    '🔍 ' + roles.detective + ' محقق · ' +
    '💊 ' + roles.doctor    + ' طبيب · ' +
    '👤 ' + citizens        + ' مواطن';
  document.getElementById('confirm-overlay').style.display = 'flex';
}

function confirmStart() {
  document.getElementById('confirm-overlay').style.display = 'none';
  save('mafia_roles', { ...roles });

  const names   = getSavedNames();
  const special = roles.mafia + roles.detective + roles.doctor;
  const roleList = [
    ...Array(roles.mafia).fill('mafia'),
    ...Array(roles.detective).fill('detective'),
    ...Array(roles.doctor).fill('doctor'),
    ...Array(playerCount - special).fill('citizen')
  ];

  assignedRoles = shuffle(names).map((name, i) => ({ name, role: shuffle(roleList)[i] }));
  // FIX: proper independent shuffles
  const sRoles   = shuffle(roleList);
  const sPlayers = shuffle(names);
  assignedRoles  = sPlayers.map((name, i) => ({ name, role: sRoles[i] }));

  currentIndex  = 0;
  revealLocked  = false;
  roundNumber   = 1;
  roundLog      = [];
  activePlayers = sPlayers.slice();

  showScreen('screen-reveal');
  showCover();
}

function cancelStart() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── Reveal flow ───────────────────────────────────────────────────────────────
function showCover() {
  revealLocked = false;
  document.getElementById('cover-view').style.display = 'block';
  document.getElementById('role-view').style.display  = 'none';
  document.getElementById('next-player-name').textContent = assignedRoles[currentIndex].name;
}

function showRole() {
  playRevealSound();
  document.getElementById('cover-view').style.display = 'none';
  document.getElementById('role-view').style.display  = 'block';

  const p  = assignedRoles[currentIndex];
  const rd = roleData[p.role];

  const pct = ((currentIndex + 1) / assignedRoles.length) * 100;
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent     = (currentIndex + 1) + ' من ' + assignedRoles.length;
  document.getElementById('role-emoji').textContent        = rd.emoji;
  document.getElementById('reveal-player-name').textContent = p.name;
  document.getElementById('reveal-role-title').textContent  = rd.title;
  document.getElementById('reveal-role-info').textContent   = rd.info;

  // Badge pop animation
  const badge = document.getElementById('role-emoji');
  badge.style.transition = 'none';
  badge.style.transform  = 'scale(0) rotate(-20deg)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    badge.style.transition = 'transform 0.4s cubic-bezier(.34,1.56,.64,1)';
    badge.style.transform  = 'scale(1) rotate(0deg)';
  }));
}

function nextPlayer() {
  if (revealLocked) return;
  revealLocked = true;
  currentIndex++;
  if (currentIndex >= assignedRoles.length) {
    // FIX: build summary BEFORE switching screen so elements exist
    buildDoneSummary();
    showScreen('screen-done');
    resetTimer();
  } else {
    showCover();
  }
}

// ── Done screen ───────────────────────────────────────────────────────────────
function buildDoneSummary() {
  const hostPanel = document.getElementById('host-panel');
  const hostBtn   = document.getElementById('host-btn');
  if (hostPanel) hostPanel.style.display = 'none';
  if (hostBtn)   hostBtn.textContent = '👁 وضع المضيف';
  renderRoundLog();

  const groups = {};
  assignedRoles.forEach(p => {
    if (!groups[p.role]) groups[p.role] = [];
    groups[p.role].push(p.name);
  });

  let html = '';
  ['mafia','detective','doctor','citizen'].forEach(role => {
    if (!groups[role]) return;
    const rd = roleData[role];
    html += '<div class="summary-row">' +
      '<span class="summary-emoji">' + rd.emoji + '</span>' +
      '<div><div class="summary-role">' + rd.title + '</div>' +
      '<div class="summary-names">' + groups[role].join('، ') + '</div></div>' +
      '</div>';
  });
  const el = document.getElementById('host-summary');
  if (el) el.innerHTML = html;
}

function toggleHostView() {
  const el      = document.getElementById('host-panel');
  const btn     = document.getElementById('host-btn');
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'block';
  btn.textContent  = visible ? '👁 وضع المضيف' : '🙈 إخفاء';
}

// ── Timer ─────────────────────────────────────────────────────────────────────
// FIX: setTimer uses data-secs attribute instead of index position
function setTimer(seconds) {
  stopTimer();
  timerDuration  = seconds;
  timerRemaining = seconds;
  updateTimerDisplay();

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.secs) === seconds);
  });

  const sb = document.getElementById('timer-start-btn');
  const td = document.getElementById('timer-display');
  if (sb) sb.textContent = '▶ ابدأ';
  if (td) td.classList.remove('urgent');
}

function startTimer() {
  const sb = document.getElementById('timer-start-btn');
  const td = document.getElementById('timer-display');

  if (timerRunning) {
    stopTimer();
    if (sb) sb.textContent = '▶ استمر';
    return;
  }

  // If finished, restart from full duration
  if (timerRemaining <= 0) {
    timerRemaining = timerDuration;
    if (td) td.classList.remove('urgent');
  }

  timerRunning = true;
  if (sb) sb.textContent = '⏸ إيقاف';

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();

    const display = document.getElementById('timer-display');
    const startBtn = document.getElementById('timer-start-btn');

    if (timerRemaining <= 10 && timerRemaining > 0) {
      playBeepSound();
      if (display) display.classList.add('urgent');
    }
    if (timerRemaining <= 0) {
      stopTimer();
      playTimerEndSound();
      if (display)  display.classList.add('urgent');
      if (startBtn) startBtn.textContent = '▶ ابدأ';
    }
  }, 1000);
}

function stopTimer() {
  timerRunning = false;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
  const sb = document.getElementById('timer-start-btn');
  const td = document.getElementById('timer-display');
  if (sb) sb.textContent = '▶ ابدأ';
  if (td) td.classList.remove('urgent');
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const m = Math.floor(Math.max(0, timerRemaining) / 60);
  const s = Math.max(0, timerRemaining) % 60;
  el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

// ── Round log ─────────────────────────────────────────────────────────────────
function addRoundLog() {
  const killedSel   = document.getElementById('round-killed');
  const expelledSel = document.getElementById('round-expelled');

  killedSel.innerHTML   = '<option value="">محدش مات (الطبيب أنقذه)</option>';
  expelledSel.innerHTML = '<option value="">محدش اتطرد</option>';

  activePlayers.forEach(name => {
    const opt1 = '<option value="' + name + '">' + name + '</option>';
    killedSel.innerHTML   += opt1;
    expelledSel.innerHTML += opt1;
  });

  document.getElementById('round-night-display').textContent = 'ليلة ' + roundNumber;
  document.getElementById('round-modal').style.display = 'flex';
}

function closeRoundModal() {
  document.getElementById('round-modal').style.display = 'none';
}

function saveRound() {
  const killed   = document.getElementById('round-killed').value;
  const expelled = document.getElementById('round-expelled').value;

  roundLog.push({ night: roundNumber, killed: killed || null, expelled: expelled || null });
  roundNumber++;

  if (killed)   activePlayers = activePlayers.filter(n => n !== killed);
  if (expelled) activePlayers = activePlayers.filter(n => n !== expelled);

  closeRoundModal();
  renderRoundLog();
}

function renderRoundLog() {
  const el = document.getElementById('round-log');
  if (!el) return;
  if (roundLog.length === 0) {
    el.innerHTML = '<div class="round-empty">لا يوجد جولات بعد</div>';
    return;
  }
  el.innerHTML = roundLog.map(entry => {
    const k = entry.killed   ? '<span>' + entry.killed   + '</span> اتقتل'  : 'محدش مات (الطبيب أنقذه)';
    const x = entry.expelled ? '<span>' + entry.expelled + '</span> اتطرد'  : 'محدش اتطرد';
    return '<div class="round-item">' +
      '<div class="round-item-title">🌙 ليلة ' + entry.night + '</div>' +
      '<div class="round-item-detail">🔫 ' + k + '<br>🗳 ' + x + '</div>' +
      '</div>';
  }).join('');
}

// ── Help ──────────────────────────────────────────────────────────────────────
function toggleHelp() {
  const el = document.getElementById('help-overlay');
  el.style.display = (el.style.display === 'none' || !el.style.display) ? 'flex' : 'none';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function resetGame() {
  stopTimer();
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
  showScreen('screen-count');
}

// Close overlays by clicking backdrop (not the inner box)
document.addEventListener('click', (e) => {
  if (e.target.id === 'help-overlay')    toggleHelp();
  if (e.target.id === 'round-modal')     closeRoundModal();
  if (e.target.id === 'confirm-overlay') cancelStart();
});

// ── Init ──────────────────────────────────────────────────────────────────────
initCountScreen();
initSound();
