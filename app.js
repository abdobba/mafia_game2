'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
let playerCount   = 6;
let roles         = { mafia: 1, detective: 1, doctor: 1 };
let assignedRoles = [];
let currentIndex  = 0;
let soundEnabled  = true;
let revealLocked  = false;

// Game phase
let gamePhase      = 'day';   // 'day' | 'night'
let mafiaCount     = 0;
let citizenCount   = 0;

// Timer
let timerDuration  = 180;
let timerRemaining = 180;
let timerRunning   = false;
let timerInterval  = null;
let speakTimerRunning  = false;
let speakTimerInterval = null;
let speakTimerSecs     = 30;
let speakTimerRemaining = 30;
let currentSpeakerIdx  = 0;

// Round log
let roundNumber   = 1;
let roundLog      = [];
let activePlayers = [];   // { name, role, alive: true }

// Stats
let gameStats = { mafiaWins: 0, citizenWins: 0, gamesPlayed: 0 };

// Voting
let votes = {};   // name -> count

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
const getSavedNames  = () => load('mafia_names', []);
const getSavedRoles  = () => load('mafia_roles', { mafia: 1, detective: 1, doctor: 1 });
const getSavedCount  = () => load('mafia_count', 6);
const getSavedStats  = () => load('mafia_stats', { mafiaWins: 0, citizenWins: 0, gamesPlayed: 0 });

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function withAudio(fn) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const go  = () => fn(ctx);
    if (ctx.state !== 'running') ctx.resume().then(go).catch(() => {});
    else go();
  } catch(e) {}
}
function playTone(ctx, freq, type, startOffset, duration, gain = 0.18) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.frequency.value = freq; osc.type = type;
  const t = ctx.currentTime + startOffset;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t); osc.stop(t + duration);
}
function playRevealSound()   { withAudio(ctx => { [523,659,784,1047].forEach((f,i) => playTone(ctx,f,'sine',i*0.1,0.25)); }); }
function playBeepSound()     { withAudio(ctx => playTone(ctx, 660,'sine',0,0.1,0.15)); }
function playTimerEndSound() { withAudio(ctx => { [880,660,440].forEach((f,i) => playTone(ctx,f,'square',i*0.18,0.3,0.15)); }); }
function playPhaseSound(night) {
  withAudio(ctx => {
    if (night) { [300,200].forEach((f,i) => playTone(ctx,f,'sine',i*0.2,0.35,0.12)); }
    else        { [400,600].forEach((f,i) => playTone(ctx,f,'sine',i*0.15,0.3,0.12)); }
  });
}

function initSound() { soundEnabled = load('mafia_sound', true); updateSoundBtn(); }
function toggleSound() { soundEnabled = !soundEnabled; save('mafia_sound', soundEnabled); updateSoundBtn(); }
function updateSoundBtn() {
  const btn = document.getElementById('sound-btn');
  if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
}

// ── Screen 1: Count ───────────────────────────────────────────────────────────
function initCountScreen() {
  playerCount = getSavedCount();
  gameStats   = getSavedStats();
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview();
  renderStats();
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
function renderStats() {
  const el = document.getElementById('stats-display');
  if (!el) return;
  if (gameStats.gamesPlayed === 0) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML =
    '<div class="stat-item">🎮 <span>' + gameStats.gamesPlayed + '</span> لعبة</div>' +
    '<div class="stat-item">🔫 <span>' + gameStats.mafiaWins + '</span> فوز مافيا</div>' +
    '<div class="stat-item">👥 <span>' + gameStats.citizenWins + '</span> فوز مواطنين</div>';
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
    input.type = 'text'; input.placeholder = 'لاعب ' + (i+1);
    input.id = 'pname-' + i; input.autocomplete = 'off';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return; e.preventDefault();
      const next = document.getElementById('pname-' + (i+1));
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
    banner.style.display = 'none'; autoLoaded.style.display = 'block';
  } else if (saved.length > 0) {
    banner.style.display = 'block';
    document.getElementById('saved-names-preview').textContent = saved.join(' · ');
    autoLoaded.style.display = 'none';
  } else {
    banner.style.display = 'none'; autoLoaded.style.display = 'none';
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
  const names = [], seen = new Set();
  for (let i = 0; i < playerCount; i++) {
    const v = (document.getElementById('pname-' + i) || {}).value?.trim() || '';
    if (!v)          { alert('من فضلك اكتب اسم كل لاعب'); return; }
    if (seen.has(v)) { alert('الاسم "' + v + '" متكرر!'); return; }
    seen.add(v); names.push(v);
  }
  save('mafia_names', names);
  roles = { ...getSavedRoles() };
  // FIX: enforce minimum 1 for each role
  roles.mafia      = Math.max(1, roles.mafia);
  roles.detective  = Math.max(1, roles.detective);
  roles.doctor     = Math.max(1, roles.doctor);
  document.getElementById('cnt-mafia').textContent     = roles.mafia;
  document.getElementById('cnt-detective').textContent = roles.detective;
  document.getElementById('cnt-doctor').textContent    = roles.doctor;
  updateCitizens();
  showScreen('screen-roles');
}
function change(role, delta) {
  // FIX: minimum is 1 for all special roles
  roles[role] = Math.max(1, roles[role] + delta);
  document.getElementById('cnt-' + role).textContent = roles[role];
  updateCitizens();
}
function updateCitizens() {
  const special  = roles.mafia + roles.detective + roles.doctor;
  const citizens = Math.max(0, playerCount - special);
  document.getElementById('citizens-count').textContent = citizens;
  const warn = document.getElementById('warn-msg');
  if      (special > playerCount)                      warn.textContent = '⚠️ عدد الأدوار (' + special + ') أكبر من عدد اللاعبين (' + playerCount + ')';
  else if (roles.mafia >= Math.ceil(playerCount / 2)) warn.textContent = '⚠️ المافيا كتير أوي! اللعبة مش هتبقى ممتعة';
  else                                                  warn.textContent = '';
}

// ── Confirm & Start ───────────────────────────────────────────────────────────
function startGame() {
  const special = roles.mafia + roles.detective + roles.doctor;
  if (special > playerCount) { alert('عدد الأدوار أكبر من عدد اللاعبين'); return; }
  const citizens = playerCount - special;
  document.getElementById('confirm-summary').innerHTML =
    '<b>' + playerCount + ' لاعبين</b><br>' +
    '🔫 ' + roles.mafia + ' مافيا · 🔍 ' + roles.detective + ' محقق · 💊 ' + roles.doctor + ' طبيب · 👤 ' + citizens + ' مواطن';
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
  const sRoles   = shuffle(roleList);
  const sPlayers = shuffle(names);
  assignedRoles  = sPlayers.map((name, i) => ({ name, role: sRoles[i] }));

  currentIndex  = 0; revealLocked = false;
  roundNumber   = 1; roundLog = [];
  activePlayers = assignedRoles.map(p => ({ name: p.name, role: p.role, alive: true }));
  mafiaCount   = roles.mafia;
  citizenCount = playerCount - roles.mafia;
  gamePhase    = 'day';

  showScreen('screen-reveal');
  showCover();
}
function cancelStart() { document.getElementById('confirm-overlay').style.display = 'none'; }

// ── Reveal ────────────────────────────────────────────────────────────────────
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
  const p = assignedRoles[currentIndex], rd = roleData[p.role];
  const pct = ((currentIndex + 1) / assignedRoles.length) * 100;
  document.getElementById('progress-bar-fill').style.width    = pct + '%';
  document.getElementById('progress-text').textContent        = (currentIndex + 1) + ' من ' + assignedRoles.length;
  document.getElementById('role-emoji').textContent           = rd.emoji;
  document.getElementById('reveal-player-name').textContent   = p.name;
  document.getElementById('reveal-role-title').textContent    = rd.title;
  document.getElementById('reveal-role-info').textContent     = rd.info;
  const badge = document.getElementById('role-emoji');
  badge.style.transition = 'none'; badge.style.transform = 'scale(0) rotate(-20deg)';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    badge.style.transition = 'transform 0.4s cubic-bezier(.34,1.56,.64,1)';
    badge.style.transform  = 'scale(1) rotate(0deg)';
  }));
}
function nextPlayer() {
  if (revealLocked) return; revealLocked = true; currentIndex++;
  if (currentIndex >= assignedRoles.length) {
    buildDoneSummary(); showScreen('screen-done'); resetTimer(); initGamePanel();
  } else { showCover(); }
}

// ── Done screen ───────────────────────────────────────────────────────────────
function buildDoneSummary() {
  const hostPanel = document.getElementById('host-panel');
  const hostBtn   = document.getElementById('host-btn');
  if (hostPanel) hostPanel.style.display = 'none';
  if (hostBtn)   hostBtn.textContent = '👁 وضع المضيف';
  renderRoundLog();
  const groups = {};
  assignedRoles.forEach(p => { if (!groups[p.role]) groups[p.role] = []; groups[p.role].push(p.name); });
  let html = '';
  ['mafia','detective','doctor','citizen'].forEach(role => {
    if (!groups[role]) return;
    const rd = roleData[role];
    html += '<div class="summary-row"><span class="summary-emoji">' + rd.emoji + '</span>' +
      '<div><div class="summary-role">' + rd.title + '</div>' +
      '<div class="summary-names">' + groups[role].join('، ') + '</div></div></div>';
  });
  const el = document.getElementById('host-summary');
  if (el) el.innerHTML = html;
}
function toggleHostView() {
  const el = document.getElementById('host-panel'), btn = document.getElementById('host-btn');
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'block';
  btn.textContent  = visible ? '👁 وضع المضيف' : '🙈 إخفاء';
}

// ── Game Panel (phase + alive counter + vote + speak timer) ──────────────────
function initGamePanel() {
  gamePhase = 'day';
  updatePhaseUI();
  updateAliveCounter();
  renderVotePanel();
  renderSpeakPanel();
}

function updatePhaseUI() {
  const btn  = document.getElementById('phase-btn');
  const card = document.getElementById('phase-card');
  const lbl  = document.getElementById('phase-label');
  if (!btn) return;
  if (gamePhase === 'night') {
    card.className = 'card phase-card night';
    lbl.textContent  = '🌙 الليل';
    btn.textContent  = '☀️ تحويل النهار';
  } else {
    card.className = 'card phase-card day';
    lbl.textContent  = '☀️ النهار';
    btn.textContent  = '🌙 تحويل الليل';
  }
}

function togglePhase() {
  gamePhase = gamePhase === 'day' ? 'night' : 'day';
  playPhaseSound(gamePhase === 'night');
  updatePhaseUI();
}

function updateAliveCounter() {
  const alive  = activePlayers.filter(p => p.alive);
  const mafia  = alive.filter(p => p.role === 'mafia').length;
  const others = alive.length - mafia;
  const el = document.getElementById('alive-counter');
  if (!el) return;
  el.innerHTML =
    '<div class="alive-item"><span class="alive-num">' + alive.length + '</span><span class="alive-lbl">أحياء</span></div>' +
    '<div class="alive-sep"></div>' +
    '<div class="alive-item"><span class="alive-num mafia-col">' + mafia + '</span><span class="alive-lbl">مافيا</span></div>' +
    '<div class="alive-sep"></div>' +
    '<div class="alive-item"><span class="alive-num citizen-col">' + others + '</span><span class="alive-lbl">مواطنين</span></div>';
}

// ── Vote panel ────────────────────────────────────────────────────────────────
function renderVotePanel() {
  const container = document.getElementById('vote-players');
  if (!container) return;
  const alive = activePlayers.filter(p => p.alive);
  votes = {};
  alive.forEach(p => votes[p.name] = 0);
  container.innerHTML = alive.map(p =>
    '<div class="vote-row" id="vrow-' + p.name + '">' +
    '<span class="vote-name">' + p.name + '</span>' +
    '<div class="vote-controls">' +
    '<button onclick="changeVote(\'' + p.name + '\',-1)">−</button>' +
    '<span class="vote-count" id="vcnt-' + p.name + '">0</span>' +
    '<button onclick="changeVote(\'' + p.name + '\',1)">+</button>' +
    '</div></div>'
  ).join('');
  document.getElementById('vote-result').textContent = '';
}

function changeVote(name, d) {
  votes[name] = Math.max(0, (votes[name] || 0) + d);
  const el = document.getElementById('vcnt-' + name);
  if (el) el.textContent = votes[name];
  highlightVoteLeader();
}

function highlightVoteLeader() {
  const alive = activePlayers.filter(p => p.alive);
  let max = 0;
  alive.forEach(p => { if ((votes[p.name]||0) > max) max = votes[p.name]; });
  alive.forEach(p => {
    const row = document.getElementById('vrow-' + p.name);
    if (row) row.classList.toggle('vote-leader', max > 0 && votes[p.name] === max);
  });
}

function declareExpelled() {
  const alive = activePlayers.filter(p => p.alive);
  if (!alive.length) return;
  let maxVotes = 0, leaders = [];
  alive.forEach(p => {
    const v = votes[p.name] || 0;
    if (v > maxVotes) { maxVotes = v; leaders = [p]; }
    else if (v === maxVotes && v > 0) leaders.push(p);
  });
  const result = document.getElementById('vote-result');
  if (!leaders.length || maxVotes === 0) { result.textContent = 'مفيش تصويت بعد'; return; }
  if (leaders.length > 1) {
    result.textContent = '⚖️ تعادل بين: ' + leaders.map(p => p.name).join(' و ');
    return;
  }
  const expelled = leaders[0];
  const rd = roleData[expelled.role];
  expelled.alive = false;
  result.innerHTML = '🗳 اتطرد: <b>' + expelled.name + '</b> — كان ' + rd.emoji + ' ' + rd.title;
  updateAliveCounter();
  checkWinCondition();
  // refresh vote panel without expelled player
  renderVotePanel();
}

function checkWinCondition() {
  const alive   = activePlayers.filter(p => p.alive);
  const mafiaAlive   = alive.filter(p => p.role === 'mafia').length;
  const citizenAlive = alive.filter(p => p.role !== 'mafia').length;
  if (mafiaAlive === 0) { showWinBanner('citizen'); return; }
  if (mafiaAlive >= citizenAlive) { showWinBanner('mafia'); return; }
}

function showWinBanner(winner) {
  const el = document.getElementById('win-banner');
  if (!el) return;
  gameStats = getSavedStats();
  gameStats.gamesPlayed++;
  if (winner === 'mafia') { gameStats.mafiaWins++; el.innerHTML = '<div class="win-content mafia-win">🔫 المافيا كسبت!</div>'; }
  else                    { gameStats.citizenWins++; el.innerHTML = '<div class="win-content citizen-win">👥 المواطنون كسبوا!</div>'; }
  save('mafia_stats', gameStats);
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Speak timer ───────────────────────────────────────────────────────────────
function renderSpeakPanel() {
  currentSpeakerIdx = 0;
  speakTimerSecs = 30;
  speakTimerRemaining = speakTimerSecs;
  stopSpeakTimer();
  updateSpeakUI();
}

function updateSpeakUI() {
  const alive = activePlayers.filter(p => p.alive);
  const nameEl = document.getElementById('speak-name');
  const timeEl = document.getElementById('speak-timer-display');
  if (!nameEl || !timeEl) return;
  if (!alive.length) { nameEl.textContent = '—'; timeEl.textContent = '00'; return; }
  const speaker = alive[currentSpeakerIdx % alive.length];
  nameEl.textContent = speaker ? speaker.name : '—';
  timeEl.textContent = String(speakTimerRemaining).padStart(2, '0');
}

function startSpeakTimer() {
  const alive = activePlayers.filter(p => p.alive);
  if (!alive.length) return;
  if (speakTimerRunning) { stopSpeakTimer(); document.getElementById('speak-start-btn').textContent = '▶'; return; }
  speakTimerRunning = true;
  document.getElementById('speak-start-btn').textContent = '⏸';
  speakTimerInterval = setInterval(() => {
    speakTimerRemaining--;
    document.getElementById('speak-timer-display').textContent = String(speakTimerRemaining).padStart(2,'0');
    if (speakTimerRemaining <= 5 && speakTimerRemaining > 0) playBeepSound();
    if (speakTimerRemaining <= 0) {
      stopSpeakTimer();
      playTimerEndSound();
      document.getElementById('speak-start-btn').textContent = '▶';
    }
  }, 1000);
}

function stopSpeakTimer() {
  speakTimerRunning = false;
  if (speakTimerInterval) { clearInterval(speakTimerInterval); speakTimerInterval = null; }
}

function nextSpeaker() {
  stopSpeakTimer();
  const alive = activePlayers.filter(p => p.alive);
  currentSpeakerIdx = (currentSpeakerIdx + 1) % Math.max(1, alive.length);
  speakTimerRemaining = speakTimerSecs;
  document.getElementById('speak-start-btn').textContent = '▶';
  updateSpeakUI();
}

function setSpeakTime(secs) {
  stopSpeakTimer();
  speakTimerSecs = secs;
  speakTimerRemaining = secs;
  document.getElementById('speak-start-btn').textContent = '▶';
  document.querySelectorAll('.speak-preset').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.secs) === secs);
  });
  updateSpeakUI();
}

// ── Discussion Timer ──────────────────────────────────────────────────────────
function setTimer(seconds) {
  stopTimer();
  timerDuration = seconds; timerRemaining = seconds;
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
  if (timerRunning) { stopTimer(); if (sb) sb.textContent = '▶ استمر'; return; }
  if (timerRemaining <= 0) { timerRemaining = timerDuration; if (td) td.classList.remove('urgent'); }
  timerRunning = true;
  if (sb) sb.textContent = '⏸ إيقاف';
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    const d = document.getElementById('timer-display');
    const s = document.getElementById('timer-start-btn');
    if (timerRemaining <= 10 && timerRemaining > 0) { playBeepSound(); if (d) d.classList.add('urgent'); }
    if (timerRemaining <= 0) { stopTimer(); playTimerEndSound(); if (d) d.classList.add('urgent'); if (s) s.textContent = '▶ ابدأ'; }
  }, 1000);
}
function stopTimer() { timerRunning = false; if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function resetTimer() {
  stopTimer(); timerRemaining = timerDuration; updateTimerDisplay();
  const sb = document.getElementById('timer-start-btn');
  const td = document.getElementById('timer-display');
  if (sb) sb.textContent = '▶ ابدأ';
  if (td) td.classList.remove('urgent');
}
function updateTimerDisplay() {
  const el = document.getElementById('timer-display'); if (!el) return;
  const m = Math.floor(Math.max(0,timerRemaining)/60), s = Math.max(0,timerRemaining)%60;
  el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

// ── Round log ─────────────────────────────────────────────────────────────────
function addRoundLog() {
  const killedSel = document.getElementById('round-killed');
  const expSel    = document.getElementById('round-expelled');
  killedSel.innerHTML = '<option value="">محدش مات (الطبيب أنقذه)</option>';
  expSel.innerHTML    = '<option value="">محدش اتطرد</option>';
  activePlayers.filter(p => p.alive).forEach(p => {
    const o = '<option value="' + p.name + '">' + p.name + '</option>';
    killedSel.innerHTML += o; expSel.innerHTML += o;
  });
  document.getElementById('round-night-display').textContent = 'ليلة ' + roundNumber;
  document.getElementById('round-modal').style.display = 'flex';
}
function closeRoundModal() { document.getElementById('round-modal').style.display = 'none'; }
function saveRound() {
  const killed   = document.getElementById('round-killed').value;
  const expelled = document.getElementById('round-expelled').value;
  roundLog.push({ night: roundNumber, killed: killed || null, expelled: expelled || null });
  roundNumber++;
  if (killed)   { const p = activePlayers.find(x => x.name === killed);   if (p) p.alive = false; }
  if (expelled) { const p = activePlayers.find(x => x.name === expelled); if (p) p.alive = false; }
  closeRoundModal();
  renderRoundLog();
  updateAliveCounter();
  renderVotePanel();
  updateSpeakUI();
  checkWinCondition();
}
function renderRoundLog() {
  const el = document.getElementById('round-log'); if (!el) return;
  if (!roundLog.length) { el.innerHTML = '<div class="round-empty">لا يوجد جولات بعد</div>'; return; }
  el.innerHTML = roundLog.map(e => {
    const k = e.killed   ? '<span>' + e.killed   + '</span> اتقتل'  : 'محدش مات';
    const x = e.expelled ? '<span>' + e.expelled + '</span> اتطرد'  : 'محدش اتطرد';
    return '<div class="round-item"><div class="round-item-title">🌙 ليلة ' + e.night + '</div>' +
           '<div class="round-item-detail">🔫 ' + k + '<br>🗳 ' + x + '</div></div>';
  }).join('');
}

// ── Help ──────────────────────────────────────────────────────────────────────
function toggleHelp() {
  const el = document.getElementById('help-overlay');
  el.style.display = (!el.style.display || el.style.display === 'none') ? 'flex' : 'none';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}
function resetGame() {
  stopTimer(); stopSpeakTimer();
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
  updatePlayersPreview(); renderStats();
  showScreen('screen-count');
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'help-overlay')    toggleHelp();
  if (e.target.id === 'round-modal')     closeRoundModal();
  if (e.target.id === 'confirm-overlay') cancelStart();
});

// ── Init ──────────────────────────────────────────────────────────────────────
initCountScreen();
initSound();
