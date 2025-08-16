// Fairway Fiend Quick — web prototype (PWA, localStorage)

// --- GPS / Geolocation ---
let geoWatchId = null;
let currentFix = null;

function startGPS(){
  if (!('geolocation' in navigator)) {
    $('#gps-status').textContent = 'Not supported';
    return;
  }
  $('#gps-status').textContent = 'Requesting…';
  geoWatchId = navigator.geolocation.watchPosition(onGeo, onGeoError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 10000
  });
}
function stopGPS(){
  if (geoWatchId !== null){
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
}

function onGeo(pos){
  currentFix = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    acc: pos.coords.accuracy || null
  };
  $('#gps-status').textContent = `${currentFix.lat.toFixed(5)}, ${currentFix.lon.toFixed(5)}`;
  $('#gps-accuracy').textContent = currentFix.acc ? `± ${Math.round(currentFix.acc)} m` : '';
  // update yardages if a round is active
  if (currentRound) updateAllHoleDistances();
}
function onGeoError(err){
  const map = {1:'Permission denied', 2:'Position unavailable', 3:'Timeout'};
  $('#gps-status').textContent = map[err.code] || 'GPS error';
  $('#gps-accuracy').textContent = '';
}

function m2yd(m){ return m * 1.09361; }
function haversine(lat1, lon1, lat2, lon2){
  function toRad(d){ return d * Math.PI / 180; }
  const R = 6371000; // meters
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
// --- End GPS ---

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Tabs
$$('.tab').forEach(btn => btn.addEventListener('click', () => {
  $$('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.dataset.tab;
  $$('.tabview').forEach(v => v.classList.remove('active'));
  $('#tab-' + tab).classList.add('active');
  if (tab === 'rounds') renderRounds();
  if (tab === 'stats') renderStats();
}));

// Init date
$('#roundDate').valueAsDate = new Date();

// State
let currentRound = null; // not yet persisted
const STORAGE_KEY = 'ffq_rounds_v1';

function templateRound(courseName, teeName, dateStr, walking) {
  const holes = [];
  for (let i=1;i<=18;i++) {
    const par = [3,7].includes((i-1)%9+1) ? 3 : ([1,9,5].includes((i-1)%9+1) ? 5 : 4);
    holes.push({holeNumber:i, par, strokes: par, putts:2, penalties:0, fairway: par===3? null : 'hit', gir:false, tee:null, pin:null, yardToPin:null});
  }
  return {
    id: crypto.randomUUID(),
    date: dateStr,
    courseName, teeName, walking,
    holeResults: holes
  };
}

function saveRound(round) {
  const rounds = loadAllRounds();
  const idx = rounds.findIndex(r => r.id === round.id);
  if (idx === -1) rounds.unshift(round);
  else rounds[idx] = round;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
}

function loadAllRounds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function exportCSV() {
  const rounds = loadAllRounds();
  let out = 'Date,Course,Tees,Total Strokes,Total Putts,Total Penalties\n';
  rounds.forEach(r => {
    const totals = totalsFor(r);
    out += `${r.date},${csv(r.courseName)},${csv(r.teeName)},${totals.strokes},${totals.putts},${totals.penalties}\n`;
    r.holeResults.forEach(hr => {
      out += `,Hole ${hr.holeNumber} Par ${hr.par},,,Strokes ${hr.strokes} Putts ${hr.putts} Pen ${hr.penalties}\n`;
    });
  });
  const blob = new Blob([out], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Rounds.csv'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function csv(s){ return /[,"]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; }

$('#exportCsv').addEventListener('click', exportCSV);

// Start form
$('#start-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const course = $('#courseName').value || 'Temporary Course';
  const tee = $('#teeName').value || 'Blue';
  const date = $('#roundDate').value || new Date().toISOString().slice(0,10);
  const walking = $('#walking').checked;
  currentRound = templateRound(course, tee, date, walking);
  $('#round-title').textContent = `${course} • ${tee}`;
  $('#round-area').classList.remove('hidden');
  renderHoleGrid();
  window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'});
});

function renderHoleGrid() {
  const container = $('.holes');
  container.innerHTML = '';
  currentRound.holeResults.forEach(hr => {
    const el = document.createElement('div');
    el.className = 'hole';
    el.innerHTML = `
      <div class="label">H${hr.holeNumber} • Par ${hr.par}</div>
      <div class="counter" aria-label="Strokes">
        <button aria-label="decrease strokes">−</button>
        <input inputmode="numeric" pattern="[0-9]*" value="${hr.strokes}">
        <button aria-label="increase strokes">+</button>
      </div>
      <div class="counter" aria-label="Putts">
        <button aria-label="decrease putts">−</button>
        <input inputmode="numeric" pattern="[0-9]*" value="${hr.putts}">
        <button aria-label="increase putts">+</button>
      </div>
      <div class="counter" aria-label="Penalties">
        <button aria-label="decrease penalties">−</button>
        <input inputmode="numeric" pattern="[0-9]*" value="${hr.penalties}">
        <button aria-label="increase penalties">+</button>
      </div>
      <div class="badge fir ${hr.par===3?'hidden':''}" aria-label="Fairway toggle">${hr.par===3 ? '' : (hr.fairway||'hit').toUpperCase()}</div>
      <label class="toggle">
        <input type="checkbox" ${hr.greenInReg ? 'checked' : ''}> GIR
      </label>
    `;
    const [sMinus, sInput, sPlus] = el.querySelectorAll('.counter:nth-of-type(1) button, .counter:nth-of-type(1) input');
    const [pMinus, pInput, pPlus] = el.querySelectorAll('.counter:nth-of-type(2) button, .counter:nth-of-type(2) input');
    const [penMinus, penInput, penPlus] = el.querySelectorAll('.counter:nth-of-type(3) button, .counter:nth-of-type(3) input');
    const firBadge = el.querySelector('.badge.fir');
    const girToggle = el.querySelector('.toggle input');

    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

    sMinus.addEventListener('click', ()=>{ hr.strokes = clamp(hr.strokes-1,1,15); sInput.value=hr.strokes; postUpdate(); });
    sPlus.addEventListener('click', ()=>{ hr.strokes = clamp(hr.strokes+1,1,15); sInput.value=hr.strokes; postUpdate(); });
    sInput.addEventListener('change', ()=>{ hr.strokes = clamp(parseInt(sInput.value||hr.strokes)||hr.strokes,1,15); sInput.value=hr.strokes; postUpdate(); });

    pMinus.addEventListener('click', ()=>{ hr.putts = clamp(hr.putts-1,0,6); pInput.value=hr.putts; postUpdate(); });
    pPlus.addEventListener('click', ()=>{ hr.putts = clamp(hr.putts+1,0,6); pInput.value=hr.putts; postUpdate(); });
    pInput.addEventListener('change', ()=>{ hr.putts = clamp(parseInt(pInput.value||hr.putts)||hr.putts,0,6); pInput.value=hr.putts; postUpdate(); });

    penMinus.addEventListener('click', ()=>{ hr.penalties = clamp(hr.penalties-1,0,9); penInput.value=hr.penalties; postUpdate(); });
    penPlus.addEventListener('click', ()=>{ hr.penalties = clamp(hr.penalties+1,0,9); penInput.value=hr.penalties; postUpdate(); });
    penInput.addEventListener('change', ()=>{ hr.penalties = clamp(parseInt(penInput.value||hr.penalties)||hr.penalties,0,9); penInput.value=hr.penalties; postUpdate(); });

    if (firBadge && !firBadge.classList.contains('hidden')) {
      const cycle = ['hit','left','right','long','short'];
      firBadge.addEventListener('click', () => {
        const idx = cycle.indexOf(hr.fairway || 'hit');
        const next = cycle[(idx+1)%cycle.length];
        hr.fairway = next;
        firBadge.textContent = next.toUpperCase();
        postUpdate();
      });
    }
    girToggle.addEventListener('change', ()=>{ hr.greenInReg = girToggle.checked; postUpdate(); });

    container.appendChild(el);
    // minirow with GPS actions
    const mini = document.createElement('div');
    mini.className = 'minirow';
    mini.innerHTML = `
      <button class="ghost set-tee">Set Tee</button>
      <button class="ghost set-pin">Set Pin</button>
      <div class="dist yard">— yd</div>
    `;
    el.appendChild(mini);

    const btnTee = mini.querySelector('.set-tee');
    const btnPin = mini.querySelector('.set-pin');
    const distEl = mini.querySelector('.dist');

    btnTee.addEventListener('click', ()=>{
      if (!currentFix){ alert('No GPS fix yet. Move a bit or wait a second.'); return; }
      hr.tee = {lat: currentFix.lat, lon: currentFix.lon};
      saveRound(currentRound);
      updateHoleDistance(hr, distEl);
    });
    btnPin.addEventListener('click', ()=>{
      if (!currentFix){ alert('No GPS fix yet. Move a bit or wait a second.'); return; }
      hr.pin = {lat: currentFix.lat, lon: currentFix.lon};
      saveRound(currentRound);
      updateHoleDistance(hr, distEl);
    });

    // initial distance compute if stored
    updateHoleDistance(hr, distEl);
  });
  postUpdate();
  // Start GPS when round UI appears
  startGPS();
}


function totalsFor(round){
  const t = {strokes:0, putts:0, penalties:0, fir:0, gir:0};
  round.holeResults.forEach(hr => {
    t.strokes += hr.strokes;
    t.putts += hr.putts;
    t.penalties += hr.penalties;
    if (hr.fairway === 'hit') t.fir += 1;
    if (hr.greenInReg) t.gir += 1;
  });
  return t;
}

function postUpdate(){
  if (!currentRound) return;
  const t = totalsFor(currentRound);
  $('#sum-strokes').textContent = t.strokes;
  $('#sum-putts').textContent = t.putts;
  $('#sum-pen').textContent = t.penalties;
  $('#sum-fir').textContent = t.fir;
  $('#sum-gir').textContent = t.gir;
  // autosave draft
  saveRound(currentRound);
}

$('#finishRound').addEventListener('click', ()=>{
  if (!currentRound) return;
  // already saved; just clear working set
  currentRound = null;
  $('#round-area').classList.add('hidden');
  $('#start-form').reset();
  $('#roundDate').valueAsDate = new Date();
  renderRounds();
  stopGPS();
  alert('Round saved. Go hydrate, champ.');
});
$('#resetRound').addEventListener('click', ()=>{
  if (!currentRound) return;
  if (!confirm('Reset current round inputs?')) return;
  currentRound.holeResults.forEach(hr => {
    hr.strokes = hr.par;
    hr.putts = 2; hr.penalties=0; hr.fairway = hr.par===3? null : 'hit'; hr.greenInReg=false;
  });
  renderHoleGrid();
});

function renderRounds(){
  const ul = $('#roundList');
  const rounds = loadAllRounds();
  ul.innerHTML='';
  rounds.forEach(r => {
    const t = totalsFor(r);
    const li = document.createElement('li');
    li.innerHTML = `<div>
      <div><strong>${r.courseName}</strong> • ${r.teeName}</div>
      <div class="muted">${r.date}</div>
    </div>
    <div><strong>${t.strokes}</strong></div>`;
    ul.appendChild(li);
  });
}

function renderStats(){
  const rounds = loadAllRounds();
  $('#stat-rounds').textContent = rounds.length;
  if (!rounds.length){ 
    $('#stat-avg-score').textContent = '—';
    $('#stat-avg-putts').textContent = '—';
    $('#stat-avg-gir').textContent = '—';
    $('#stat-avg-fir').textContent = '—';
    return;
  }
  const sums = rounds.map(totalsFor).reduce((a,b)=>({strokes:a.strokes+b.strokes, putts:a.putts+b.putts, penalties:a.penalties+b.penalties, fir:a.fir+b.fir, gir:a.gir+b.gir}),{strokes:0,putts:0,penalties:0,fir:0,gir:0});
  $('#stat-avg-score').textContent = Math.round(sums.strokes/rounds.length);
  $('#stat-avg-putts').textContent = Math.round((sums.putts/rounds.length)*10)/10;
  $('#stat-avg-gir').textContent = (sums.gir/rounds.length).toFixed(1);
  $('#stat-avg-fir').textContent = (sums.fir/rounds.length).toFixed(1);
}


function updateHoleDistance(hr, el){
  if (!el) return;
  if (!hr.pin || !currentFix){
    el.textContent = hr.pin ? '— yd (waiting for GPS)' : 'Set Pin to get yardage';
    el.classList.toggle('bad', !hr.pin);
    return;
  }
  const d = haversine(currentFix.lat, currentFix.lon, hr.pin.lat, hr.pin.lon);
  const yards = Math.round(m2yd(d));
  hr.yardToPin = yards;
  el.textContent = `${yards} yd`;
  el.classList.toggle('bad', false);
}
function updateAllHoleDistances(){
  const rows = $$('.hole');
  if (!rows.length || !currentRound) return;
  currentRound.holeResults.forEach((hr, idx) => {
    const distEl = rows[idx].querySelector('.minirow .dist');
    updateHoleDistance(hr, distEl);
  });
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.classList.remove('hidden');
  btn.addEventListener('click', async ()=>{
    btn.disabled = true;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.textContent = outcome === 'accepted' ? 'Installed' : 'Install App';
  }, { once:true });
});

if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js');
  });
}
