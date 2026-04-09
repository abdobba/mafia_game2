let playerCount = 6;
let roles = { mafia: 1, detective: 1, doctor: 1 };
let assignedRoles = [];
let currentIndex = 0;
let soundEnabled = true;
let revealLocked = false; // ✅ FIX 4: double-tap guard

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
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
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

// ✅ FIX: AudioContext واحد ثابت بدل ما نعمل واحد جديد كل مرة
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playRevealSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    // ✅ FIX: resume() علشان المتصفح مش يبلوك الصوت
    const play = () => {
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
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch {}
}

// ── Screen 1: Count ───────────────────────────────────────────────────────────
function initCountScreen() {
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
}

// ✅ FIX 2: changeCount يحدّث playerCount في الـ state بشكل صح
function changeCount(d) {
  playerCount = Math.max(3, playerCount + d);
  document.getElementById('player-count').textContent = playerCount;
}

// ✅ FIX 2: زر الرجوع من screen-names بيحتفظ بالعدد الحالي من الـ UI مش من الـ localStorage
function backToCount() {
  showScreen('screen-count');
  document.getElementById('player-count').textContent = playerCount;
}

// ── Screen 2: Names ───────────────────────────────────────────────────────────
function goToNames() {
  save('mafia_count', playerCount);
  const saved = getSavedNames();
  const grid  = document.getElementById('names-grid');
  grid.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    grid.innerHTML += '<input type="text" placeholder="لاعب ' + (i+1) + '" id="pname-' + i + '" />';
  }

  const autoLoaded = document.getElementById('auto-loaded-notice');
  if (saved.length === playerCount) {
    for (let i = 0; i < playerCount; i++)
      document.getElementById('pname-' + i).value = saved[i] || '';
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
  const seen  = new Set(); // ✅ FIX 3: كشف الأسماء المتكررة

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
  // ✅ FIX 3: تحذير لو المافيا أكتر من نص اللاعبين — اللعبة مش هتبقى ممتعة
  else if (roles.mafia >= Math.ceil(playerCount / 2))
    warn.textContent = '⚠️ المافيا كتير أوي! اللعبة مش هتبقى ممتعة';
  else
    warn.textContent = '';
}

// ── Start / Confirm ───────────────────────────────────────────────────────────
function startGame() {
  const special = roles.mafia + roles.detective + roles.doctor;
  if (special > playerCount) { alert('عدد الأدوار أكبر من عدد اللاعبين'); return; }
  if (roles.mafia === 0)      { alert('لازم يكون فيه مافيا واحد على الأقل'); return; }
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

  const names = getSavedNames();

  const special  = roles.mafia + roles.detective + roles.doctor;
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
  revealLocked  = false; // ✅ reset lock on new game

  showScreen('screen-reveal');
  showCover();
}

function cancelStart() {
  document.getElementById('confirm-overlay').style.display = 'none';
}

// ── Reveal flow ───────────────────────────────────────────────────────────────
function showCover() {
  revealLocked = false; // ✅ FIX 4: unlock when showing cover
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
  document.getElementById('progress-text').textContent        = (currentIndex + 1) + ' من ' + assignedRoles.length;
  document.getElementById('role-emoji').textContent           = rd.emoji;
  document.getElementById('reveal-player-name').textContent   = p.name;
  document.getElementById('reveal-role-title').textContent    = rd.title;
  document.getElementById('reveal-role-info').textContent     = rd.info;
  const badge = document.getElementById('role-emoji');
  badge.style.transform  = 'scale(0)';
  badge.style.transition = '';
  setTimeout(() => { badge.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1)'; badge.style.transform = 'scale(1)'; }, 10);
}

// ✅ FIX 4: حماية من double-tap على زر "فهمت"
function nextPlayer() {
  if (revealLocked) return;
  revealLocked = true;
  currentIndex++;
  if (currentIndex >= assignedRoles.length) {
    buildDoneSummary();
    showScreen('screen-done');
  } else {
    showCover();
  }
}

// ── Done + host view ──────────────────────────────────────────────────────────
function buildDoneSummary() {
  document.getElementById('host-panel').style.display = 'none';
  document.getElementById('host-btn').textContent = '👁 وضع المضيف';

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
  playerCount = getSavedCount();
  document.getElementById('player-count').textContent = playerCount;
  showScreen('screen-count');
}

// ── Init ──────────────────────────────────────────────────────────────────────
initCountScreen();
initSound();