const STORAGE_KEY = 'uma_track_selector';
let isMuted = localStorage.getItem('uma_mute') === 'true';

const SECRET_THEMES_INFO = {
    "nature": "✨ Nice Nature (Bronze) ✨",
    "hina": "✨ Hina (Purple) ✨"
};
let unlockedThemes = []; 

// --- AUDIO CONTROLLER ---
const SoundController = {
    ctx: null,
    init: function() {
        if (isMuted) return;
        if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        if (this.ctx.state === 'suspended') { this.ctx.resume(); }
    },
    playTick: function() {
        if(isMuted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.05);
    },
    playFanfare: function() {
        if(isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.value = freq;
            const startTime = now + (i * 0.08); const stopTime = startTime + 0.8;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, stopTime);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(startTime); osc.stop(stopTime);
        });
    },
    playJackpot: function() {
        if(isMuted) return;
        const audio = new Audio('sounds/jackpot.mp3');
        audio.volume = 0.7;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                if(!this.ctx) return;
                const now = this.ctx.currentTime;
                [1200, 1500, 1800, 1200, 1500, 1800, 2400].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'square'; osc.frequency.value = freq;
                    const t = now + (i * 0.1);
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
                    osc.connect(gain); gain.connect(this.ctx.destination);
                    osc.start(t); osc.stop(t + 0.1);
                });
            });
        }
    }
};

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('uma_mute', isMuted);
    updateMuteIcon();
    if(!isMuted) SoundController.init();
}

function updateMuteIcon() {
    const btn = document.getElementById('muteBtn');
    if(btn) {
        btn.innerText = isMuted ? '🔇' : '🔊';
        btn.style.opacity = isMuted ? '0.5' : '1';
    }
}

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

function startRoll() {
    if(!isMuted) SoundController.init();
    const btn = document.getElementById('rollBtn'); 
    const stage = document.getElementById('mainStage');
    const title = document.getElementById('resultTitle');
    const imgTarget = document.getElementById('imgTarget');
    const copyBtn = document.getElementById('copyBtn');
    const historyDisp = document.getElementById('trackHistoryDisplay');
    
    if(historyDisp) historyDisp.style.display = 'none'; 
    
    const terrain = getCheckedValues('terrainFilter');
    const cat = getCheckedValues('catFilter');
    const dir = getCheckedValues('dirFilter');
    const caps = getCheckedValues('capFilter').map(Number);

    const pool = allTracks.filter(t => 
        terrain.includes(t.surface) && cat.includes(t.category) && 
        dir.some(d => t.direction.includes(d)) && caps.includes(t.maxRunners)
    );

    if(pool.length === 0) { title.innerText = "NO MATCHES"; stage.classList.remove('show'); return; }

    copyBtn.style.display = 'none';
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
        } else { finalize(pool); }
    }
    setTimeout(step, 300);
}

let currentResult = null;

function finalize(pool) {
    const btn = document.getElementById('rollBtn'); const stage = document.getElementById('mainStage');
    const title = document.getElementById('resultTitle'); const meta = document.getElementById('resultMeta');
    const cond = document.getElementById('resultCond');
    const imgTarget = document.getElementById('imgTarget');
    const historyDisp = document.getElementById('trackHistoryDisplay');

    const finalTrack = pool[Math.floor(Math.random() * pool.length)];
    const finalSeason = seasons[Math.floor(Math.random() * seasons.length)];
    
    const nonSnowyKeys = ["Sunny / Firm", "Sunny / Good", "Cloudy / Firm", "Cloudy / Good", "Rainy / Soft", "Rainy / Heavy"];
    const snowyKeys = ["Snowy / Good", "Snowy / Soft"];
    const availableWeatherKeys = finalSeason === "Winter" ? nonSnowyKeys.concat(snowyKeys) : nonSnowyKeys;
    const finalWeather = getWeightedWeather(availableWeatherKeys);

    currentResult = { 
        track: finalTrack.name, 
        season: finalSeason, 
        weather: finalWeather,
        dir: finalTrack.fullDirection,
        rawName: finalTrack.name
    };

    stage.classList.remove('rolling'); 
    title.innerText = finalTrack.name;
    imgTarget.innerHTML = `<img src="${finalTrack.img}" alt="${finalTrack.name}">`;

    meta.innerHTML = `
        <span class="badge">${finalTrack.surface}</span> <span class="badge">${finalTrack.distance}</span>
        <span class="badge">${finalTrack.category}</span> <span class="badge">${finalTrack.fullDirection}</span>
        <span class="badge highlight">Max: ${finalTrack.maxRunners}</span>
    `;
    cond.innerHTML = `<span class="cond-hl">${finalSeason}</span> with <span class="cond-hl">${finalWeather}</span>`;
    
    // Check History File
    if (historyDisp) {
        if (typeof trackHistory !== 'undefined' && trackHistory[finalTrack.name]) {
            const uses = trackHistory[finalTrack.name];
            historyDisp.innerHTML = `📜 <strong>Track History:</strong> Previously used in ${uses.join(', ')}`;
        } else {
            historyDisp.innerHTML = `🌟 <strong>Track History:</strong> First time running this track!`;
        }
        historyDisp.style.display = 'block';
    }

    stage.classList.add('show');
    
    const copyBtn = document.getElementById('copyBtn');
    if(copyBtn) copyBtn.style.display = 'inline-block';

    fireConfetti(); 
    
    if (finalTrack.location === "Kokura" || finalTrack.name.includes("Kokura")) {
        SoundController.playJackpot();
        const gif = document.createElement('img');
        gif.src = 'nn_dance.gif';
        gif.className = 'kokura-dance';
        title.prepend(gif); 
    } else {
        SoundController.playFanfare();
    }

    setTimeout(() => { btn.disabled = false; btn.innerText = "ROLL TRACK"; }, 800);
}

// --- DISCORD CLIPBOARD GENERATOR ---
function copyToClipboard() {
    if(!currentResult) return;
    
    const tourneyMode = document.getElementById('tourneyMode') ? document.getElementById('tourneyMode').value : 'classic';
    const scenario = document.getElementById('scenarioSelect') ? document.getElementById('scenarioSelect').value : 'aoharu';
    const seasonInput = document.getElementById('tourneySeason');
    const openInput = document.getElementById('tourneyOpen');
    
    const seasonNum = seasonInput ? seasonInput.value : '1';
    const openNum = openInput ? openInput.value : '1';
    
    // Time processing
    const timeInput = document.getElementById('tourneyTime');
    let unixTimestamp;
    if (timeInput && timeInput.value) {
        unixTimestamp = Math.floor(new Date(timeInput.value).getTime() / 1000);
    } else {
        unixTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hr from now fallback
    }

    const isClimax = scenario === 'climax';
    const wrongScenarioStr = isClimax ? "(e.g. Aoharu instead of Climax)" : "(e.g. URA instead of Aoharu)";
    const banTimeLimit = isClimax ? "85 minutes" : "55 minutes"; 
    const draftTimeLimit = isClimax ? "80 minutes" : "50 minutes";

    const header = `Racc Open S${seasonNum}-${openNum.toString().padStart(2, '0')}\n<t:${unixTimestamp}:F>\n🏆 TRACK: ${currentResult.track} (${currentResult.dir})\n📅 CONDITIONS: ${currentResult.season} / ${currentResult.weather}`;

    let text = "";
    if (tourneyMode === 'classic') {
        text = `${header}\nRules:\n• Teams of 3, each player makes an uma in one run on the day and then they race. 5 races total. Points are allocated based on each player's placement and the team with the most points wins.\n• Captains are chosen for each team and teams are established via a snake draft made up of all people who have signed up\n• If there are 18 or more players, instead of all teams in one race, teams will be split into groups and each group will do 5 races. The winning team from each group and the next highest point scoring team will then do 5 more races to determine a winner.\n• Borrows are allowed for this tournament\n• If your career fails get fucked LMAO\n• The exception to this is if you start your career on the wrong scenario ${wrongScenarioStr}, in which case you may restart.\n• A ban system will be implemented wherein team Captains will DM me their single ban. Teams will have no knowledge of other bans, so bans can overlap. This means it is possible for only 1 uma to be banned during a tournament.\n• In order to join, you just enter the signup channel on the day, the start time is not rigid and may be delayed up to 30 minutes depending on numbers, but it may also start on the dot so try not to be late. The tournament may take up to two hours.\n• After Team Select, you will have a maximum of 5 minutes to make a ban.\n• Each team may only have 2 umas in the same style\n• Each team may only have 2 duplicate umas\n• After the ban phase, you will have only ${banTimeLimit} to make your uma before penalties apply.\n@everyone`;
    } else if (tourneyMode === 'draft') {
        text = `${header}\n\nRules:\n- There are NO bans for this tournament.\n- Instead of a ban phase, there will be an uma snake draft phase where teams will pick the umas they wish to run.\n- There can be no duplicate umas\n- Players will have ${draftTimeLimit} after the end of the uma draft phase to make their ace. \n- 2 points will be deducted per minute over the time limit up to 20 points. If a player is still not ready after 10 minutes, an NPC will replace them until they are able to join with a completed ace. \n- Teams of 3, each player makes an uma in one run on the day and then they race. 5 races total. Points are allocated based on each player's placement and the team with the most points wins.\n- Teams are established via a snake draft made up of all people who have signed up.\n- Borrows are allowed for this tournament\n- If your career fails get fucked LMAO\n- The exception to this is if you start your career on the wrong scenario ${wrongScenarioStr}, in which case you may restart.\n- In order to join, you just enter the signup channel on the day, the start time is not rigid and may be delayed up to 30 minutes depending on numbers, but it may also start on the dot so try not to be late. The tournament may take up to two hours.\n@everyone`;
    }

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = "✅ Copied to Discord!";
        
        // Auto-increment the Open Number
        if (openInput) {
            openInput.value = parseInt(openInput.value) + 1;
            saveState(); // Save the new incremented value to local storage
        }

        setTimeout(() => btn.innerText = originalText, 2000);
    }).catch(err => { console.error('Failed to copy:', err); });
}

// --- VISUALS & EASTER EGGS ---
function fireConfetti() {
    const canvas = document.getElementById('confetti'); const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const particles = Array.from({length: 80}, () => ({
        x: window.innerWidth/2, y: window.innerHeight/2, r: Math.random()*6+2,
        dx: (Math.random()-0.5)*25, dy: (Math.random()-0.5)*25, color: color, life: 100
    }));
    function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height); let active = false;
        particles.forEach(p => {
            if(p.life > 0) {
                active = true; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
                ctx.fillStyle = p.color; ctx.globalAlpha = p.life/100; ctx.fill();
                p.x+=p.dx; p.y+=p.dy; p.dy+=0.5; p.life--; p.r*=0.96;
            }
        });
        if(active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    animate();
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
    audio.play().catch(e => console.log("Audio play blocked", e));
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
        weatherMode: document.getElementById('weatherMode') ? document.getElementById('weatherMode').value : 'favored',
        tourneyMode: document.getElementById('tourneyMode') ? document.getElementById('tourneyMode').value : 'classic',
        scenario: document.getElementById('scenarioSelect') ? document.getElementById('scenarioSelect').value : 'aoharu',
        season: document.getElementById('tourneySeason') ? document.getElementById('tourneySeason').value : '1',
        openNum: document.getElementById('tourneyOpen') ? document.getElementById('tourneyOpen').value : '1'
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
        setSelect('tourneyMode', state.tourneyMode);
        setSelect('scenarioSelect', state.scenario);
        
        const seasonInput = document.getElementById('tourneySeason');
        if(seasonInput && state.season) seasonInput.value = state.season;
        const openInput = document.getElementById('tourneyOpen');
        if(openInput && state.openNum) openInput.value = state.openNum;

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
    const rollBtn = document.getElementById('rollBtn');
    if(rollBtn) rollBtn.addEventListener('click', startRoll);
    const muteBtn = document.getElementById('muteBtn');
    if(muteBtn) muteBtn.addEventListener('click', toggleMute);
    const copyBtn = document.getElementById('copyBtn');
    if(copyBtn) copyBtn.addEventListener('click', copyToClipboard);
    
    // Listeners for dropdowns/inputs to save state
    ['themeSelect', 'weatherMode', 'tourneyMode', 'scenarioSelect', 'tourneySeason', 'tourneyOpen'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', saveState);
    });
    
    document.querySelectorAll('input[type="checkbox"]').forEach(el => { el.addEventListener('change', saveState); });
    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; 
        handleEasterEgg(e.key);
    });
});
