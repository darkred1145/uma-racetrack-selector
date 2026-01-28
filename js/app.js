const STORAGE_KEY = 'uma_track_selector';
let isMuted = localStorage.getItem('uma_mute') === 'true';

const SECRET_THEMES_INFO = {
    "nature": "✨ Nice Nature (Bronze) ✨",
    "hina": "✨ Hina (Purple) ✨"
};
let unlockedThemes = []; 

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

const seasons = ["Spring", "Summer", "Fall", "Winter"];
const nonSnowyWeather = ["Sunny / Firm", "Sunny / Good", "Cloudy / Firm", "Cloudy / Good", "Rainy / Soft", "Rainy / Heavy"];
const snowyWeather = ["Snowy / Good", "Snowy / Soft"];

function parseTracks(data) {
    return data.map(entry => {
        const line = entry.id;
        const parts = line.split(" ");
        const location = parts[0]; const surface = parts[1]; const distance = parts[2];
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

    const finalTrack = pool[Math.floor(Math.random() * pool.length)];
    const finalSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const availableWeather = finalSeason === "Winter" ? nonSnowyWeather.concat(snowyWeather) : nonSnowyWeather;
    const finalWeather = availableWeather[Math.floor(Math.random() * availableWeather.length)];

    currentResult = { track: finalTrack.name, season: finalSeason, weather: finalWeather };

    stage.classList.remove('rolling'); 
    title.innerText = finalTrack.name;
    imgTarget.innerHTML = `<img src="${finalTrack.img}" alt="${finalTrack.name}">`;

    meta.innerHTML = `
        <span class="badge">${finalTrack.surface}</span> <span class="badge">${finalTrack.distance}</span>
        <span class="badge">${finalTrack.category}</span> <span class="badge">${finalTrack.fullDirection}</span>
        <span class="badge highlight">Max: ${finalTrack.maxRunners}</span>
    `;
    cond.innerHTML = `<span class="cond-hl">${finalSeason}</span> with <span class="cond-hl">${finalWeather}</span>`;
    stage.classList.add('show');
    fireConfetti(); SoundController.playFanfare();
    setTimeout(() => { btn.disabled = false; btn.innerText = "ROLL TRACK"; }, 800);
}

function copyToClipboard() {
    if(!currentResult) return;
    const text = `🏆 TRACK: ${currentResult.track}\n📅 COND: ${currentResult.season} / ${currentResult.weather}`;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerText;
        btn.innerText = "✅ Copied!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }).catch(err => { console.error('Failed to copy:', err); });
}

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

/* --- EASTER EGG LOGIC --- */

let keyBuffer = "";

function handleEasterEgg(key) {
    keyBuffer += key.toUpperCase();
    if(keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20);

    if(keyBuffer.endsWith("NATURE")) { unlockTheme("nature", SECRET_THEMES_INFO.nature); }
    if(keyBuffer.endsWith("NEURO")) { playEasterSound("sounds/heart.mp3"); keyBuffer = ""; }
    if(keyBuffer.endsWith("RACC")) { 
        unlockTheme("hina", SECRET_THEMES_INFO.hina); 
        playEasterSound("sounds/hina.mp3"); 
        keyBuffer = "";
    }
    
    // Manual Trigger for Nice Nature Event
    if(keyBuffer.endsWith("NEICHA")) {
        triggerNiceNatureEvent();
        keyBuffer = "";
    }
}

function unlockTheme(themeId, themeName) {
    const select = document.getElementById('themeSelect');

    if(!select.querySelector(`option[value="${themeId}"]`)) {
        const opt = document.createElement('option');
        opt.value = themeId;
        opt.innerText = themeName;
        select.appendChild(opt);
 
        if(!unlockedThemes.includes(themeId)) {
            alert(`🎉 Unlocked Secret Theme: ${themeName}!`);
        }
    }

    if(!unlockedThemes.includes(themeId)) {
        unlockedThemes.push(themeId);
        saveState();
    }

    select.value = themeId;
    changeTheme();
}

function playEasterSound(path) {
    if(isMuted) return;
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play blocked", e));
}

/* --- UPDATED: BIGGER NICE NATURE JUMPSCARE LOGIC --- */

function triggerNiceNatureEvent() {
    if (document.getElementById('nn-jumpscare')) return;

    const audio = new Audio('sounds/oisu.mp3');
    // Louder volume for impact
    audio.volume = isMuted ? 0 : 1.0; 

    // Create Container - Full screen overlay, centered
    const container = document.createElement('div');
    container.id = 'nn-jumpscare';
    Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.6)', // Dark overlay
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '11000', // Very high z-index
        pointerEvents: 'none'
    });

    // Create Image - Much bigger, starts scaled down to 0
    const img = document.createElement('img');
    img.src = 'nn_plush.png';
    Object.assign(img.style, {
        height: '90vh', // Very big
        maxHeight: '90vw',
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.3))',
        transform: 'scale(0)', // Start invisible
        // Very bouncy, sudden transition
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
    });
    
    container.appendChild(img);
    document.body.appendChild(container);

    const startScare = () => {
        // Scale up rapidly
        requestAnimationFrame(() => {
            img.style.transform = 'scale(1)';
        });

        // Handle Audio End -> Scale out
        audio.onended = () => {
            img.style.transform = 'scale(0)';
            // Wait for transition before removing
            setTimeout(() => container.remove(), 600);
        };
        
        // Fallback safety
        audio.play().catch(e => {
            console.warn("Autoplay blocked, running silent visual", e);
            setTimeout(() => {
                if(img.parentNode) {
                   img.style.transform = 'scale(0)';
                   setTimeout(() => container.remove(), 600); 
                }
            }, 2500); 
        });
    };

    // Slight delay before the shock
    setTimeout(startScare, 100);
}

function checkStartupEvent() {
    const hasVisited = localStorage.getItem('uma_has_visited');
    
    // Trigger if: First visit EVER -or- 10% RNG check passes
    if (!hasVisited || Math.random() < 0.10) {
        // Delay slightly longer so the user sees the page load first
        setTimeout(triggerNiceNatureEvent, 2000);
    }

    // Mark as visited
    if (!hasVisited) {
        localStorage.setItem('uma_has_visited', 'true');
    }
}

/* --- STATE MANAGEMENT & INIT --- */

function saveState() {
    const state = {
        theme: document.getElementById('themeSelect').value,
        terrain: getCheckedValues('terrainFilter'),
        cat: getCheckedValues('catFilter'),
        dir: getCheckedValues('dirFilter'),
        caps: getCheckedValues('capFilter'),
        muted: isMuted,
        unlocked: unlockedThemes
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
                if (!select.querySelector(`option[value="${themeId}"]`)) {
                    const opt = document.createElement('option');
                    opt.value = themeId;
                    opt.innerText = SECRET_THEMES_INFO[themeId] || themeId;
                    select.appendChild(opt);
                }
            });
        }

        if(state.theme) {
            const select = document.getElementById('themeSelect');
            if(select.querySelector(`option[value="${state.theme}"]`)) {
                select.value = state.theme;
                changeTheme();
            }
        }

        const setChecks = (id, values) => {
            if(!values) return;
            document.querySelectorAll(`#${id} input`).forEach(cb => {
                cb.checked = values.includes(cb.value);
            });
        };
        setChecks('terrainFilter', state.terrain);
        setChecks('catFilter', state.cat);
        setChecks('dirFilter', state.dir);
        setChecks('capFilter', state.caps);

    } catch (e) {
        console.error("Failed to load state", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    // Run the Jumpscare Check
    checkStartupEvent();
    
    const rollBtn = document.getElementById('rollBtn');
    if(rollBtn) rollBtn.addEventListener('click', startRoll);
    
    const muteBtn = document.getElementById('muteBtn');
    if(muteBtn) muteBtn.addEventListener('click', toggleMute);
    
    const copyBtn = document.getElementById('copyBtn');
    if(copyBtn) copyBtn.addEventListener('click', copyToClipboard);

    const themeSelect = document.getElementById('themeSelect');
    if(themeSelect) {
        themeSelect.addEventListener('change', changeTheme);
    }

    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('change', saveState);
    });

    document.addEventListener('keydown', (e) => {
        if(e.target.tagName === 'INPUT') return;
        handleEasterEgg(e.key);
    });
});
