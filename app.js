let playerCount = 6;
let roles = { mafia: 1, detective: 1, doctor: 1 };
let assignedRoles = [];
let currentIndex = 0;
let soundEnabled = true;
let revealLocked = false;

// Timer state
let timerDuration = 180;
let timerRemaining = 180;
let timerRunning = false;
let timerInterval = null;

// Round log state
let roundNumber = 1;
let roundLog = [];
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
  catch(e) { console.warn('Storage full or unavailable:', e); }
}
function getSavedNames() { return load('mafia_names', []); }
function getSavedRoles() { return load('mafia_roles', { mafia: 1, detective: 1, doctor: 1 }); }
function getSavedCount() { return load('mafia_count', 6); }

// ── Sound ─────────────────────────────────────────────────────────────────────
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

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// Always resume before playing to avoid browser blocking
function resumeAudio(ctx) {
  if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
    return ctx.resume();
  }
  return Promise.resolve();
}

function playRevealSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    resumeAudio(ctx).then(() => {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    });
  } catch {}
}

function playBeepSound(freq = 880, duration = 0.1) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    resumeAudio(ctx).then(() => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration);
    });
  } catch {}
}

function playTimerEndSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    resumeAudio(ctx).then(() => {
      [880, 660, 440].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'square';
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    });
  } catch {}
}

// ── Screen 1: Count ───────────────────────────────────────────────────────────
function initCountScreen() {
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
}

function changeCount(d) {
  playerCount = Math.max(3, playerCount + d);
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
    input.type = 'text';
    input.placeholder = 'لاعب ' + (i + 1);
    input.id = 'pname-' + i;
    // Handle Enter key to move to next input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = document.getElementById('pname-' + (i + 1));
        if (next) next.focus(); else goToRoles();
      }
    });
    grid.appendChild(input);
  }

  const autoLoaded = document.getElementById('auto-loaded-notice');
  if (saved.length === playerCount) {
    for (let i = 0; i < playerCount; i++) {
      const el = document.getElementById('pname-' + i);
      if (el) el.value = saved[i] || '';
    }
    document.getElementById('saved-names-banner').style.display = 'none';
    autoLoaded.style.display = 'block';
  } else if (saved.length > 0) {
    document.getElementById('saved-names-banner').style.display = 'block';
    document.getElementById('saved-names-preview').textContent = saved.join(' · ');
    autoLoaded.style.display = 'none';
  } else {
    document.getElementById('saved-names-banner').style.display = 'none';
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
    const v = document.getElementById('pname-' + i).value.trim();
    if (!v) { alert('من فضلك اكتب اسم كل لاعب'); return; }
    if (seen.has(v)) { alert('الاسم "' + v + '" متكرر! كل لاعب لازم يكون ليه اسم مختلف'); return; }
    seen.add(v);
    names.push(v);
  }

  save('mafia_names', names);
  const savedRoles = getSavedRoles();
  roles = { ...savedRoles };
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
  if (special > playerCount)
    warn.textContent = '⚠️ عدد الأدوار (' + special + ') أكبر من عدد اللاعبين (' + playerCount + ')';
  else if (roles.mafia === 0)
    warn.textContent = '⚠️ لازم يكون فيه مافيا واحد على الأقل';
  else if (roles.mafia >= Math.ceil(playerCount / 2))
    warn.textContent = '⚠️ المافيا كتير أوي! اللعبة مش هتبقى ممتعة';
  else
    warn.textContent = '';
}

// ── Start / Confirm ───────────────────────────────────────────────────────────
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

  const shuffledRoles   = shuffle(roleList);
  const shuffledPlayers = shuffle(names);
  assignedRoles = shuffledPlayers.map((p, i) => ({ name: p, role: shuffledRoles[i] }));
  currentIndex  = 0;
  revealLocked  = false;

  // Reset round tracking
  roundNumber = 1;
  roundLog    = [];
  activePlayers = assignedRoles.map(p => p.name);

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

  // Progress bar
  const pct = ((currentIndex + 1) / assignedRoles.length) * 100;
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = (currentIndex + 1) + ' من ' + assignedRoles.length;

  document.getElementById('role-emoji').textContent          = rd.emoji;
  document.getElementById('reveal-player-name').textContent  = p.name;
  document.getElementById('reveal-role-title').textContent   = rd.title;
  document.getElementById('reveal-role-info').textContent    = rd.info;

  // Badge animation
  const badge = document.getElementById('role-emoji');
  badge.style.transform  = 'scale(0) rotate(-20deg)';
  badge.style.transition = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      badge.style.transition = 'transform 0.4s cubic-bezier(.34,1.56,.64,1)';
      badge.style.transform  = 'scale(1) rotate(0deg)';
    });
  });
}

function nextPlayer() {
  if (revealLocked) return;
  revealLocked = true;
  currentIndex++;
  if (currentIndex >= assignedRoles.length) {
    buildDoneSummary();
    showScreen('screen-done');
    resetTimer();
  } else {
    showCover();
  }
}

// ── Done + host view ──────────────────────────────────────────────────────────
function buildDoneSummary() {
  document.getElementById('host-panel').style.display = 'none';
  document.getElementById('host-btn').textContent = '👁 وضع المضيف';
  renderRoundLog();

  const groups = {};
  assignedRoles.forEach(p => {
    if (!groups[p.role]) groups[p.role] = [];
    groups[p.role].push(p.name);
  });
  const order = ['mafia','detective','doctor','citizen'];
  let html = '';
  order.forEach(role => {
    if (!groups[role]) return;
    const rd = roleData[role];
    html += '<div class="summary-row">' +
      '<span class="summary-emoji">' + rd.emoji + '</span>' +
      '<div><div class="summary-role">' + rd.title + '</div>' +
      '<div class="summary-names">' + groups[role].join('، ') + '</div></div>' +
      '</div>';
  });
  document.getElementById('host-summary').innerHTML = html;
}

function toggleHostView() {
  const el  = document.getElementById('host-panel');
  const btn = document.getElementById('host-btn');
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'block';
  btn.textContent  = visible ? '👁 وضع المضيف' : '🙈 إخفاء';
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function setTimer(seconds) {
  stopTimer();
  timerDuration  = seconds;
  timerRemaining = seconds;
  updateTimerDisplay();

  // Update active preset button
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  const presets = { 60: 0, 120: 1, 180: 2, 300: 3 };
  const idx = presets[seconds];
  if (idx !== undefined) {
    document.querySelectorAll('.preset-btn')[idx].classList.add('active');
  }

  document.getElementById('timer-start-btn').textContent = '▶ ابدأ';
  document.getElementById('timer-display').classList.remove('urgent');
}

function startTimer() {
  if (timerRunning) {
    // Pause
    stopTimer();
    document.getElementById('timer-start-btn').textContent = '▶ استمر';
  } else {
    // Resume / Start
    if (timerRemaining <= 0) {
      timerRemaining = timerDuration;
      document.getElementById('timer-display').classList.remove('urgent');
    }
    timerRunning = true;
    document.getElementById('timer-start-btn').textContent = '⏸ إيقاف';
    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay();
      if (timerRemaining <= 10 && timerRemaining > 0) {
        playBeepSound(660, 0.08);
        document.getElementById('timer-display').classList.add('urgent');
      }
      if (timerRemaining <= 0) {
        stopTimer();
        playTimerEndSound();
        document.getElementById('timer-display').classList.add('urgent');
        document.getElementById('timer-start-btn').textContent = '▶ ابدأ';
      }
    }, 1000);
  }
}

function stopTimer() {
  timerRunning = false;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
  document.getElementById('timer-start-btn').textContent = '▶ ابدأ';
  document.getElementById('timer-display').classList.remove('urgent');
}

function updateTimerDisplay() {
  const m = Math.floor(timerRemaining / 60);
  const s = timerRemaining % 60;
  document.getElementById('timer-display').textContent =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ── Round log ─────────────────────────────────────────────────────────────────
function addRoundLog() {
  // Populate selects with active players
  const killedSel   = document.getElementById('round-killed');
  const expelledSel = document.getElementById('round-expelled');

  killedSel.innerHTML   = '<option value="">محدش مات (الطبيب أنقذه)</option>';
  expelledSel.innerHTML = '<option value="">محدش اتطرد</option>';

  activePlayers.forEach(name => {
    killedSel.innerHTML   += '<option value="' + name + '">' + name + '</option>';
    expelledSel.innerHTML += '<option value="' + name + '">' + name + '</option>';
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

  const entry = { night: roundNumber, killed: killed || null, expelled: expelled || null };
  roundLog.push(entry);
  roundNumber++;

  // Remove dead/expelled from active players
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
    const killedLine   = entry.killed   ? '<span>' + entry.killed + '</span> اتقتل' : 'محدش مات (الطبيب أنقذه)';
    const expelledLine = entry.expelled ? '<span>' + entry.expelled + '</span> اتطرد' : 'محدش اتطرد';
    return '<div class="round-item">' +
      '<div class="round-item-title">🌙 ليلة ' + entry.night + '</div>' +
      '<div class="round-item-detail">🔫 ' + killedLine + '<br>🗳 ' + expelledLine + '</div>' +
      '</div>';
  }).join('');
}

// ── Help overlay ─────────────────────────────────────────────────────────────
function toggleHelp() {
  const el = document.getElementById('help-overlay');
  const isHidden = el.style.display === 'none' || el.style.display === '';
  el.style.display = isHidden ? 'flex' : 'none';
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

// Close overlays on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.id === 'help-overlay')    toggleHelp();
  if (e.target.id === 'round-modal')     closeRoundModal();
  if (e.target.id === 'confirm-overlay') cancelStart();
});

// ── Init ──────────────────────────────────────────────────────────────────────
initCountScreen();
initSound();