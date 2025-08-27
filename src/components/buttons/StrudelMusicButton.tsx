import { useCallback, useEffect, useState, useRef } from 'react';
import volumeImg from '../../../assets/volume.svg';
import Button from './Button';

export default function StrudelMusicButton() {
  const [isPlaying, setPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(true);
  const scheduledNodesRef = useRef<AudioNode[]>([]);

  // Mozart x Hip-Hop composition patterns translated to Web Audio API
  const playMozartHipHop = useCallback(() => {
    if (!audioContext || !isPlaying) return;

    // Clear any previously scheduled nodes
    scheduledNodesRef.current.forEach(node => {
      try {
        if (node instanceof OscillatorNode) {
          node.stop();
        }
      } catch (e) {
        // Node might already be stopped
      }
    });
    scheduledNodesRef.current = [];

    const tempo = 92; // BPM from original
    const cycleLength = 4; // 4 beats per cycle
    const beatDuration = 60 / tempo; // Duration of one beat in seconds
    const cycleDuration = beatDuration * cycleLength;

    let currentTime = audioContext.currentTime;
    let cycleCount = 0;
    const maxCycles = 24; // Total arrangement cycles

    const playArrangement = () => {
      if (!isPlaying || !audioContext) return;

      // A minor scale frequencies (starting from A4)
      const aMinorScale = [
        220.00, // A3
        246.94, // B3  
        261.63, // C4
        293.66, // D4
        329.63, // E4
        349.23, // F4
        392.00, // G4
        440.00, // A4
        493.88, // B4
        523.25, // C5
        587.33, // D5
        659.25, // E5
      ];

      // Bass frequencies (octave lower)
      const bassFreqs = {
        A2: 110, E2: 82.41, G2: 98, D2: 73.42
      };

      // Chord progressions for harmony
      const chordProgression = [
        [220, 261.63, 329.63], // Am
        [329.63, 392.00, 493.88], // E7 
        [220, 261.63, 329.63], // Am
        [293.66, 349.23, 440], // Dm
        [196, 246.94, 293.66], // G
        [261.63, 329.63, 392], // C
        [174.61, 220, 261.63], // F
        [329.63, 392.00, 493.88], // E7
      ];

      // Theme melody pattern from original: "0 2 3 5 3 2 1 0 7 5 4 2"
      const melodyPattern = [0, 2, 3, 5, 3, 2, 1, 0, 7, 5, 4, 2];
      const baseFreq = 523.25; // C5
      
      const playSection = (sectionType: 'theme' | 'development' | 'drop') => {
        // Play drums (808-style)
        const playDrums = () => {
          // Hi-hats (8 per cycle)
          for (let i = 0; i < 8; i++) {
            const hihat = audioContext.createOscillator();
            const hihatGain = audioContext.createGain();
            const hihatFilter = audioContext.createBiquadFilter();
            
            hihat.connect(hihatFilter);
            hihatFilter.connect(hihatGain);
            hihatGain.connect(audioContext.destination);
            
            hihat.frequency.value = 8000 + Math.random() * 2000;
            hihat.type = 'square';
            hihatFilter.type = 'highpass';
            hihatFilter.frequency.value = 6000;
            hihatGain.gain.value = 0.05;
            
            const startTime = currentTime + (i * cycleDuration / 8);
            hihat.start(startTime);
            hihat.stop(startTime + 0.05);
            scheduledNodesRef.current.push(hihat);
          }
          
          // Kick drums and snares
          const kickTimes = [0, 0.75, 1.5]; // Syncopated pattern
          const snareTimes = [1, 3]; // On beats 2 and 4
          
          kickTimes.forEach(time => {
            const kick = audioContext.createOscillator();
            const kickGain = audioContext.createGain();
            const kickFilter = audioContext.createBiquadFilter();
            
            kick.connect(kickFilter);
            kickFilter.connect(kickGain);
            kickGain.connect(audioContext.destination);
            
            kick.frequency.value = 60;
            kick.type = 'sine';
            kickFilter.type = 'lowpass';
            kickFilter.frequency.value = 100;
            kickGain.gain.value = 0.3;
            
            kick.start(currentTime + time * beatDuration);
            kick.stop(currentTime + time * beatDuration + 0.1);
            scheduledNodesRef.current.push(kick);
          });
          
          snareTimes.forEach(time => {
            const snare = audioContext.createOscillator();
            const snareGain = audioContext.createGain();
            const snareFilter = audioContext.createBiquadFilter();
            
            snare.connect(snareFilter);
            snareFilter.connect(snareGain);
            snareGain.connect(audioContext.destination);
            
            snare.frequency.value = 200 + Math.random() * 100;
            snare.type = 'square';
            snareFilter.type = 'bandpass';
            snareFilter.frequency.value = 1000;
            snareGain.gain.value = 0.2;
            
            snare.start(currentTime + time * beatDuration);
            snare.stop(currentTime + time * beatDuration + 0.1);
            scheduledNodesRef.current.push(snare);
          });
        };

        // Play bass line
        const playBass = () => {
          const bassPattern = [bassFreqs.A2, bassFreqs.E2, bassFreqs.A2, bassFreqs.G2];
          bassPattern.forEach((freq, i) => {
            const bass = audioContext.createOscillator();
            const bassGain = audioContext.createGain();
            const bassFilter = audioContext.createBiquadFilter();
            
            bass.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(audioContext.destination);
            
            bass.frequency.value = freq;
            bass.type = 'sawtooth';
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 300;
            bassGain.gain.value = 0.15;
            
            bass.start(currentTime + i * beatDuration);
            bass.stop(currentTime + (i + 1) * beatDuration);
            scheduledNodesRef.current.push(bass);
          });
        };

        // Play melody theme
        const playMelody = () => {
          melodyPattern.forEach((noteIndex, i) => {
            const freq = aMinorScale[noteIndex] || baseFreq;
            const melody = audioContext.createOscillator();
            const melodyGain = audioContext.createGain();
            
            melody.connect(melodyGain);
            melodyGain.connect(audioContext.destination);
            
            melody.frequency.value = sectionType === 'drop' ? freq * 2 : freq; // Octave up for drop
            melody.type = 'square'; // Piano-like but chiptune
            melodyGain.gain.value = 0.12;
            
            const noteStart = currentTime + (i * cycleDuration / melodyPattern.length);
            const noteLength = cycleDuration / melodyPattern.length * 0.8;
            
            melody.start(noteStart);
            melody.stop(noteStart + noteLength);
            scheduledNodesRef.current.push(melody);
            
            // Add echo effect for drop section
            if (sectionType === 'drop') {
              const echo = audioContext.createOscillator();
              const echoGain = audioContext.createGain();
              echo.connect(echoGain);
              echoGain.connect(audioContext.destination);
              echo.frequency.value = freq * 2;
              echo.type = 'square';
              echoGain.gain.value = 0.06;
              echo.start(noteStart + cycleDuration / 8);
              echo.stop(noteStart + cycleDuration / 8 + noteLength * 0.6);
              scheduledNodesRef.current.push(echo);
            }
          });
        };

        // Play chords
        const playChords = () => {
          const chordIndex = cycleCount % chordProgression.length;
          const chord = chordProgression[chordIndex];
          
          chord.forEach(freq => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.frequency.value = freq * 0.5; // Lower octave
            osc.type = 'sawtooth';
            gain.gain.value = 0.04;
            
            osc.start(currentTime);
            osc.stop(currentTime + cycleDuration);
            scheduledNodesRef.current.push(osc);
          });
        };

        playDrums();
        playBass();
        playMelody();
        playChords();
      };

      // Arrangement structure: A_THEME (8 cycles) -> B_DEV (8 cycles) -> DROP (8 cycles)
      if (cycleCount < 8) {
        playSection('theme');
      } else if (cycleCount < 16) {
        playSection('development');
      } else {
        playSection('drop');
      }

      currentTime += cycleDuration;
      cycleCount++;

      // Loop the arrangement
      if (cycleCount >= maxCycles) {
        cycleCount = 0;
      }

      // Use audioContext.currentTime + cycleDuration for precise timing instead of setTimeout
      if (isPlaying) {
        const nextScheduleTime = audioContext.currentTime + cycleDuration;
        const timeout = (nextScheduleTime - audioContext.currentTime) * 1000;
        setTimeout(() => playArrangement(), Math.max(0, timeout));
      }
    };

    playArrangement();
  }, [audioContext, isPlaying]);

  const toggleMusic = useCallback(async () => {
    if (!audioContext) {
      // Initialize audio context on first interaction
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      
      // Resume audio context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Don't set playing to true here - let the useEffect handle it
      return;
    }

    if (isPlaying) {
      // Stop all scheduled audio nodes
      scheduledNodesRef.current.forEach(node => {
        try {
          if (node instanceof OscillatorNode) {
            node.stop();
          }
        } catch (e) {
          // Node might already be stopped
        }
      });
      scheduledNodesRef.current = [];
      setPlaying(false);
    } else {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      setPlaying(true);
    }
  }, [audioContext, isPlaying]);

  // Start playing when audioContext is first created
  useEffect(() => {
    if (audioContext && !isPlaying) {
      setPlaying(true);
    }
  }, [audioContext]);

  // Start playing when isPlaying becomes true (but avoid double-trigger on initial context creation)
  useEffect(() => {
    if (isPlaying && audioContext) {
      playMozartHipHop();
    }
  }, [isPlaying, audioContext, playMozartHipHop]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'm' || event.key === 'M') {
        void toggleMusic();
      }
    },
    [toggleMusic],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

  return (
    <>
      <Button
        onClick={() => void toggleMusic()}
        className="hidden lg:block"
        title="Play Mozart x Hip-Hop composition (press m to play/mute)"
        imgUrl={volumeImg}
        disabled={!isReady}
      >
        {isPlaying ? 'Mute' : isReady ? 'Music' : 'Loading...'}
      </Button>
    </>
  );
}