let isMuted = localStorage.getItem('uma_mute') === 'true';

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
        if(isMuted || !this.ctx) return;
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
