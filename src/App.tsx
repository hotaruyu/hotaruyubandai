import { useState, useEffect } from 'react'

// EDM Synthesizer Engine
class EDMSynth {
  audioCtx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  isRunning = false;
  timer: number | null = null;
  step = 0;

  start() {
    if (this.isRunning) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.5, this.audioCtx.currentTime + 0.5); // Fade in

    this.isRunning = true;
    this.step = 0;
    this.playLoop();
  }

  playLoop() {
    if (!this.isRunning || !this.audioCtx || !this.masterGain) return;

    const tempo = 128;
    const stepDuration = 60 / tempo / 4; // 16th notes

    // Kick Drum (every 1/4 note)
    if (this.step % 4 === 0) {
      this.playKick(this.audioCtx.currentTime);
    }

    // Bass Synth (simple pulsing arpeggio)
    const notes = [55, 55, 58, 55, 60, 55, 58, 62]; // MIDI notes (G2, Bb2, C3, D3 area)
    const freq = 440 * Math.pow(2, (notes[this.step % 8] - 69) / 12);
    this.playBass(this.audioCtx.currentTime, freq);

    this.step = (this.step + 1) % 16;
    setTimeout(() => this.playLoop(), stepDuration * 1000);
  }

  playKick(time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  playBass(time: number, freq: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);
      setTimeout(() => {
        this.audioCtx?.close();
      }, 600);
    }
  }
}

const edmSynth = new EDMSynth();

function App() {
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds default
  const [isRunning, setIsRunning] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  const playAlertAndVoice = () => {
    // タイマー終了時にEDM BGMを停止
    edmSynth.stop();

    // 最初に短いアラート音（ピ・ポン！）を鳴らして注意を引きます
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    playTone(880, 0, 0.2); 
    playTone(1046.50, 0.2, 0.4); 

    setTimeout(() => {
      playVoiceAlert();
    }, 800);
  };

  const playVoiceAlert = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("Time's up!");
      msg.lang = 'en-US';
      msg.pitch = 1.0; 
      msg.rate = 1.0;
      msg.onstart = () => setIsTalking(true);
      msg.onend = () => setIsTalking(false);
      window.speechSynthesis.speak(msg);
    }
  };

  useEffect(() => {
    let intervalId: number;
    if (isRunning && timeLeft > 0) {
      // タイマーが走っている時はEDM BGMを再生
      edmSynth.start();
      
      intervalId = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playAlertAndVoice();
    } else {
      // 一時停止中などはBGMを止める
      edmSynth.stop();
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    if (timeLeft === 0) setTimeLeft(10); 
    setIsRunning(!isRunning);
  };
  
  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(10);
    edmSynth.stop();
  };


  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="app-container">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className={`image-wrapper ${isTalking ? 'character-talking' : ''}`}>
          <img src="/bike2.png" alt="Cyber Bike" className="bike-bg" />
          <video 
            src="/cyber_video.mp4" 
            className="character-img holo-overlay" 
            autoPlay 
            loop 
            muted 
            playsInline
          />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <div className="decoration-star">✨</div>

        <div className="timer-section">
          <div className={`timer-display ${timeLeft === 0 && !isRunning ? 'finished' : ''}`}>
            {displayTime}
          </div>

          <div className="controls-container">            
            <div className="start-button-container">
              <button 
                className={`start-button ${isRunning ? 'running' : ''}`}
                onClick={toggleTimer}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              
              <button 
                className="stop-button"
                onClick={stopTimer}
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
