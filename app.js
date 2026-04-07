let playerCount = 6;
let roles = { mafia: 1, detective: 1, doctor: 1 };
let assignedRoles = [];
let currentIndex = 0;

const roleData = {
  mafia:    { emoji: '🔫', title: 'المافيا', info: 'أنت من المافيا! تتعاون مع فريقك ليلاً لتقتلوا مواطناً. نهاراً تتظاهر بأنك بريء.' },
  detective:{ emoji: '🔍', title: 'المحقق', info: 'أنت المحقق! كل ليلة تختار لاعباً لتعرف إن كان مافيا أم لا.' },
  doctor:   { emoji: '💊', title: 'الطبيب', info: 'أنت الطبيب! كل ليلة تختار لاعب تنقذه من القتل.' },
  citizen:  { emoji: '👤', title: 'مواطن عادي', info: 'أنت مواطن! مفيش قدرات خاصة. شارك في النقاش وصوت لطرد المشتبه بيهم.' }
};

function changeCount(d) {
  playerCount = Math.max(3, playerCount + d);
  document.getElementById('player-count').textContent = playerCount;
}

function goToNames() {
  const grid = document.getElementById('names-grid');
  grid.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    grid.innerHTML += '<input type="text" placeholder="لاعب ' + (i+1) + '" id="pname-' + i + '" />';
  }
  showScreen('screen-names');
}

function goToRoles() {
  for (let i = 0; i < playerCount; i++) {
    const v = document.getElementById('pname-' + i).value.trim();
    if (!v) { alert('من فضلك اكتب اسم كل لاعب'); return; }
  }
  updateCitizens();
  showScreen('screen-roles');
}

function change(role, delta) {
  roles[role] = Math.max(0, roles[role] + delta);
  document.getElementById('cnt-' + role).textContent = roles[role];
  updateCitizens();
}

function updateCitizens() {
  const special = roles.mafia + roles.detective + roles.doctor;
  const citizens = Math.max(0, playerCount - special);
  document.getElementById('citizens-count').textContent = citizens;
  const warn = document.getElementById('warn-msg');
  if (special > playerCount) {
    warn.textContent = '⚠️ عدد الأدوار (' + special + ') أكبر من عدد اللاعبين (' + playerCount + ')';
  } else if (roles.mafia === 0) {
    warn.textContent = '⚠️ لازم يكون فيه مافيا واحد على الأقل';
  } else {
    warn.textContent = '';
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  const special = roles.mafia + roles.detective + roles.doctor;
  if (special > playerCount) { alert('عدد الأدوار أكبر من عدد اللاعبين'); return; }
  if (roles.mafia === 0) { alert('لازم يكون فيه مافيا واحد على الأقل'); return; }

  const names = [];
  for (let i = 0; i < playerCount; i++) {
    names.push(document.getElementById('pname-' + i).value.trim());
  }

  const roleList = [
    ...Array(roles.mafia).fill('mafia'),
    ...Array(roles.detective).fill('detective'),
    ...Array(roles.doctor).fill('doctor'),
    ...Array(playerCount - special).fill('citizen')
  ];

  const shuffledRoles = shuffle(roleList);
  const shuffledPlayers = shuffle(names);
  assignedRoles = shuffledPlayers.map((p, i) => ({ name: p, role: shuffledRoles[i] }));
  currentIndex = 0;

  showScreen('screen-reveal');
  showCover();
}

function showCover() {
  document.getElementById('cover-view').style.display = 'block';
  document.getElementById('role-view').style.display = 'none';
  document.getElementById('next-player-name').textContent = assignedRoles[currentIndex].name;
}

function showRole() {
  document.getElementById('cover-view').style.display = 'none';
  document.getElementById('role-view').style.display = 'block';
  const p = assignedRoles[currentIndex];
  const rd = roleData[p.role];
  document.getElementById('progress-text').textContent = (currentIndex + 1) + ' من ' + assignedRoles.length;
  document.getElementById('role-emoji').textContent = rd.emoji;
  document.getElementById('reveal-player-name').textContent = p.name;
  document.getElementById('reveal-role-title').textContent = rd.title;
  document.getElementById('reveal-role-info').textContent = rd.info;
}

function nextPlayer() {
  currentIndex++;
  if (currentIndex >= assignedRoles.length) {
    showScreen('screen-done');
  } else {
    showCover();
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function resetGame() {
  roles = { mafia: 1, detective: 1, doctor: 1 };
  playerCount = 6;
  document.getElementById('player-count').textContent = 6;
  document.getElementById('cnt-mafia').textContent = 1;
  document.getElementById('cnt-detective').textContent = 1;
  document.getElementById('cnt-doctor').textContent = 1;
  showScreen('screen-count');
}
