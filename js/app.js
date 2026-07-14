const STORAGE_KEY = 'uma_track_selector';

const SECRET_THEMES_INFO = {
    "nature": "✨ Nice Nature (Bronze) ✨",
    "hina": "✨ Hina (Purple) ✨"
};
let unlockedThemes = []; 

// --- THEME LOGIC ---
function changeTheme() {
    const themeSelect = document.getElementById('themeSelect');
    if(!themeSelect) return;
    const theme = themeSelect.value;
    if(theme === 'default') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    saveState();
}

// --- WEATHER LOGIC & WEIGHTS ---
const seasons = ["Spring", "Summer", "Fall", "Winter"];
const weatherProfiles = {
    normal: { "Sunny / Firm": 10, "Sunny / Good": 10, "Cloudy / Firm": 10, "Cloudy / Good": 10, "Rainy / Soft": 10, "Rainy / Heavy": 10, "Snowy / Good": 10, "Snowy / Soft": 10 },
    favored: { "Sunny / Firm": 35, "Sunny / Good": 25, "Cloudy / Firm": 20, "Cloudy / Good": 10, "Rainy / Soft": 7, "Rainy / Heavy": 3, "Snowy / Good": 4, "Snowy / Soft": 1 },
    madness: { "Sunny / Firm": 3, "Sunny / Good": 7, "Cloudy / Firm": 10, "Cloudy / Good": 20, "Rainy / Soft": 25, "Rainy / Heavy": 35, "Snowy / Good": 5, "Snowy / Soft": 15 }
};

function getWeightedWeather(availableWeatherKeys) {
    const mode = document.getElementById('weatherMode') ? document.getElementById('weatherMode').value : 'favored';
    const profile = weatherProfiles[mode];
    let currentPool = availableWeatherKeys.map(w => ({ value: w, weight: profile[w] || 10 }));
    const totalWeight = currentPool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of currentPool) {
        if (random < item.weight) return item.value;
        random -= item.weight;
    }
    return currentPool[currentPool.length - 1].value;
}

// --- TRACK PARSING ---
function parseTracks(data) {
    return data.map(entry => {
        const line = entry.id;
        const parts = line.split(" ");
        const location = parts[0]; 
        const surface = parts[1]; const distance = parts[2];
        const category = (line.match(/\((.*?)\)/) || [])[1] || "";
        let fullDirection = "Right";
        if(line.includes("Left")) fullDirection="Left";
        if(line.includes("Stretch")) fullDirection="Stretch";
        const dirMatch = line.match(/(Right|Left|Stretch)[\/\w\u2192]*/);
        if(dirMatch) fullDirection = dirMatch[0];
        const maxRunners = (line.match(/Max Runners:\s*(\d+)/) || [])[1];
        return {
            name: `${location} ${surface} ${distance}`, surface, distance, category, location,
            direction: fullDirection.includes("Left") ? "Left" : fullDirection.includes("Stretch") ? "Stretch" : "Right",
            fullDirection, maxRunners: maxRunners ? parseInt(maxRunners) : 16,
            img: entry.img
        };
    });
}

const allTracks = typeof rawData !== 'undefined' ? parseTracks(rawData) : [];
function getCheckedValues(id) { return Array.from(document.querySelectorAll(`#${id} input:checked`)).map(cb => cb.value); }

function populateSearchDatalist() {
    const datalist = document.getElementById('trackDatalist');
    if(!datalist) return;
    datalist.innerHTML = '';
    allTracks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        datalist.appendChild(opt);
    });
}

function startRoll() {
    if(!isMuted) SoundController.init();
    const btn = document.getElementById('rollBtn'); 
    const stage = document.getElementById('mainStage');
    const title = document.getElementById('resultTitle');
    const imgTarget = document.getElementById('imgTarget');
    
    const terrain = getCheckedValues('terrainFilter');
    const cat = getCheckedValues('catFilter');
    const dir = getCheckedValues('dirFilter');
    const caps = getCheckedValues('capFilter').map(Number);

    const pool = allTracks.filter(t => 
        terrain.includes(t.surface) && cat.includes(t.category) && 
        dir.some(d => t.direction.includes(d)) && caps.includes(t.maxRunners)
    );

    if(pool.length === 0) { title.innerText = "NO MATCHES"; stage.classList.remove('show'); return; }

    btn.disabled = true; btn.innerText = "GATE IN..."; 
    stage.classList.remove('show'); 
    stage.classList.add('rolling');
    imgTarget.innerHTML = '';
    
    let counter = 0; const maxIter = 25; let speed = 50;
    function step() {
        title.innerText = pool[Math.floor(Math.random() * pool.length)].name;
        SoundController.playTick();
        if(counter < maxIter) {
            counter++;
            if(counter > 15) speed += 20; if(counter > 20) speed += 40;
            setTimeout(step, speed);
        } else { finalize(pool[Math.floor(Math.random() * pool.length)]); }
    }
    setTimeout(step, 300);
}

function triggerManualSearch() {
    const searchInput = document.getElementById('trackSearch');
    if (!searchInput) return;
    const searchVal = searchInput.value;
    const track = allTracks.find(t => t.name.toLowerCase() === searchVal.toLowerCase());
    
    if (track) {
        if(!isMuted) SoundController.init();
        
        document.getElementById('mainStage').classList.remove('show');
        
        setTimeout(() => finalize(track), 200);
    } else {
        alert("Track not found! Check your spelling or select from the dropdown list.");
    }
}

function generateConditions() {
    const season = seasons[Math.floor(Math.random() * seasons.length)];
    const nonSnowyKeys = ["Sunny / Firm", "Sunny / Good", "Cloudy / Firm", "Cloudy / Good", "Rainy / Soft", "Rainy / Heavy"];
    const snowyKeys = ["Snowy / Good", "Snowy / Soft"];
    const availableWeatherKeys = season === "Winter" ? nonSnowyKeys.concat(snowyKeys) : nonSnowyKeys;
    return { season, weather: getWeightedWeather(availableWeatherKeys) };
}

function finalize(finalTrack) {
    const btn = document.getElementById('rollBtn'); const stage = document.getElementById('mainStage');
    const title = document.getElementById('resultTitle'); const meta = document.getElementById('resultMeta');
    const cond = document.getElementById('resultCond');
    const imgTarget = document.getElementById('imgTarget');

    const { season: finalSeason, weather: finalWeather } = generateConditions();

    stage.classList.remove('rolling'); 
    title.innerText = finalTrack.name;

    const img = document.createElement('img');
    img.src = finalTrack.img;
    img.alt = finalTrack.name;
    imgTarget.replaceChildren(img);

    meta.textContent = '';
    const badgeData = [
        { text: finalTrack.surface },
        { text: finalTrack.distance },
        { text: finalTrack.category },
        { text: finalTrack.fullDirection },
        { text: `Max: ${finalTrack.maxRunners}`, highlight: true }
    ];
    for (const b of badgeData) {
        const span = document.createElement('span');
        span.className = `badge${b.highlight ? ' highlight' : ''}`;
        span.textContent = b.text;
        meta.appendChild(span);
    }

    cond.textContent = '';
    const seasonSpan = document.createElement('span');
    seasonSpan.className = 'cond-hl';
    seasonSpan.textContent = finalSeason;
    cond.appendChild(seasonSpan);
    cond.appendChild(document.createTextNode(' with '));
    const weatherSpan = document.createElement('span');
    weatherSpan.className = 'cond-hl';
    weatherSpan.textContent = finalWeather;
    cond.appendChild(weatherSpan);

    stage.classList.add('show');

    fireConfetti(); 
    
    TrackEffects.run(finalTrack, title);

    setTimeout(() => { btn.disabled = false; btn.innerText = "ROLL TRACK"; }, 800);
}



// --- TRACK EFFECTS REGISTRY ---
const TrackEffects = {
    registry: [
        {
            match: (t) => t.location === "Kokura" || t.name.includes("Kokura"),
            run: (title) => {
                SoundController.playJackpot();
                const gif = document.createElement('img');
                gif.src = 'nn_dance.gif';
                gif.className = 'kokura-dance';
                title.prepend(gif);
            }
        }
    ],
    run: function(track, title) {
        const matched = this.registry.find(e => e.match(track));
        if (matched) {
            matched.run(title);
        } else {
            SoundController.playFanfare();
        }
    }
};

// --- VISUALS & EASTER EGGS ---
let confettiAnimId = null;
function fireConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const style = getComputedStyle(document.documentElement);
    const colors = [style.getPropertyValue('--primary').trim(), style.getPropertyValue('--accent').trim(), '#fbbf24', '#fff'];
    const particles = Array.from({length: 60}, () => ({
        x: window.innerWidth/2, y: window.innerHeight/2, r: Math.random()*6+2,
        dx: (Math.random()-0.5)*20, dy: (Math.random()-0.5)*20,
        color: colors[Math.floor(Math.random() * colors.length)], life: 80
    }));
    function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height); let active = false;
        for (const p of particles) {
            if(p.life <= 0) continue;
            active = true;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
            ctx.fillStyle = p.color; ctx.globalAlpha = p.life/80; ctx.fill();
            p.x+=p.dx; p.y+=p.dy; p.dy+=0.4; p.life--; p.r*=0.96;
        }
        if(active) confettiAnimId = requestAnimationFrame(animate);
    }
    confettiAnimId = requestAnimationFrame(animate);
}

let keyBuffer = "";
function handleEasterEgg(key) {
    keyBuffer += key.toUpperCase();
    if(keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);
    if(keyBuffer.endsWith("NATURE")) { unlockTheme("nature", SECRET_THEMES_INFO.nature); }
    if(keyBuffer.endsWith("NEURO")) { playEasterSound("sounds/heart.mp3"); keyBuffer = ""; }
    if(keyBuffer.endsWith("RACC")) { unlockTheme("hina", SECRET_THEMES_INFO.hina); playEasterSound("sounds/hina.mp3"); keyBuffer = ""; }
    if(keyBuffer.endsWith("NEICHA")) { triggerNiceNatureEvent(); keyBuffer = ""; }
}

function unlockTheme(themeId, themeName) {
    const select = document.getElementById('themeSelect');
    if(!select.querySelector(`option[value="${themeId}"]`)) {
        const opt = document.createElement('option');
        opt.value = themeId;
        opt.innerText = themeName;
        select.appendChild(opt);
        if(!unlockedThemes.includes(themeId)) { alert(`🎉 Unlocked Secret Theme: ${themeName}!`); }
    }
    if(!unlockedThemes.includes(themeId)) { unlockedThemes.push(themeId); saveState(); }
    select.value = themeId;
    changeTheme();
}

function playEasterSound(path) {
    if(isMuted) return;
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(e => console.error("Audio play blocked", e));
}

function triggerNiceNatureEvent() {
    if (document.getElementById('nn-jumpscare')) return;
    const audio = new Audio('sounds/oisu.mp3');
    audio.volume = isMuted ? 0 : 1.0; 
    const img = document.createElement('img');
    img.src = 'nn_plush.png';
    Object.assign(img.style, {
        height: '90vh', maxHeight: '90vw', objectFit: 'contain',
        filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))',
        transform: 'scale(0)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });
    const container = document.createElement('div');
    container.id = 'nn-jumpscare';
    Object.assign(container.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: '11000', pointerEvents: 'none', opacity: '0', transition: 'opacity 0.1s linear'
    });
    container.appendChild(img);
    document.body.appendChild(container);
    const executeScare = () => {
        container.style.opacity = '1';
        const playPromise = audio.play();
        requestAnimationFrame(() => { img.style.transform = 'scale(1)'; });
        audio.onended = () => { img.style.transform = 'scale(0)'; setTimeout(() => container.remove(), 300); };
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                setTimeout(() => { img.style.transform = 'scale(0)'; setTimeout(() => container.remove(), 300); }, 2500);
            });
        }
    };
    if (img.complete) { executeScare(); } else { img.onload = executeScare; img.onerror = () => { container.remove(); }; }
}

function checkStartupEvent() {
    const hasVisited = localStorage.getItem('uma_has_visited');
    if (!hasVisited || Math.random() < 0.10) { setTimeout(triggerNiceNatureEvent, 1500); }
    if (!hasVisited) { localStorage.setItem('uma_has_visited', 'true'); }
}

// --- STATE MANAGEMENT ---
function saveState() {
    const state = {
        theme: document.getElementById('themeSelect') ? document.getElementById('themeSelect').value : 'default',
        terrain: getCheckedValues('terrainFilter'),
        cat: getCheckedValues('catFilter'),
        dir: getCheckedValues('dirFilter'),
        caps: getCheckedValues('capFilter'),
        muted: isMuted,
        unlocked: unlockedThemes,
        weatherMode: document.getElementById('weatherMode') ? document.getElementById('weatherMode').value : 'favored'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
    updateMuteIcon();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state.unlocked && Array.isArray(state.unlocked)) {
            unlockedThemes = state.unlocked;
            const select = document.getElementById('themeSelect');
            unlockedThemes.forEach(themeId => {
                if (select && !select.querySelector(`option[value="${themeId}"]`)) {
                    const opt = document.createElement('option');
                    opt.value = themeId;
                    opt.innerText = SECRET_THEMES_INFO[themeId] || themeId;
                    select.appendChild(opt);
                }
            });
        }
        
        const setSelect = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.value = val;
        };
        setSelect('themeSelect', state.theme);
        setSelect('weatherMode', state.weatherMode);

        if(state.theme) changeTheme();

        const setChecks = (id, values) => {
            if(!values) return;
            document.querySelectorAll(`#${id} input`).forEach(cb => { cb.checked = values.includes(cb.value); });
        };
        setChecks('terrainFilter', state.terrain);
        setChecks('catFilter', state.cat);
        setChecks('dirFilter', state.dir);
        setChecks('capFilter', state.caps);
    } catch (e) { console.error("Failed to load state", e); }
}

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkStartupEvent();
    populateSearchDatalist();

    const rollBtn = document.getElementById('rollBtn');
    if(rollBtn) rollBtn.addEventListener('click', startRoll);
    const muteBtn = document.getElementById('muteBtn');
    if(muteBtn) muteBtn.addEventListener('click', toggleMute);

    const manualSelectBtn = document.getElementById('manualSelectBtn');
    if(manualSelectBtn) {
        manualSelectBtn.addEventListener('click', triggerManualSearch);
        const searchInput = document.getElementById('trackSearch');
        if(searchInput) {
            searchInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') triggerManualSearch(); });
            searchInput.addEventListener('input', () => { manualSelectBtn.disabled = !searchInput.value.trim(); });
            manualSelectBtn.disabled = !searchInput.value.trim();
        }
    }
    
    // Theme select: change + save
    const themeEl = document.getElementById('themeSelect');
    if(themeEl) {
        themeEl.addEventListener('change', () => { changeTheme(); saveState(); });
    }
    
    // Weather select: save state
    const weatherEl = document.getElementById('weatherMode');
    if(weatherEl) weatherEl.addEventListener('change', saveState);
    
    document.querySelectorAll('input[type="checkbox"]').forEach(el => { el.addEventListener('change', saveState); });
    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; 
        handleEasterEgg(e.key);
    });
});
