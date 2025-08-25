import { useCallback, useEffect, useState } from 'react';
import volumeImg from '../../../assets/volume.svg';
import Button from './Button';

export default function StrudelMusicButton() {
  const [isPlaying, setPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on first user interaction
    const initAudio = () => {
      if (!audioContext) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
      }
    };

    // We'll initialize on first click
    return () => {
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const playStrudelInspiredMusic = useCallback(() => {
    if (!audioContext) return;

    // Create a simple Mozart-inspired melodic pattern
    const melodyNotes = [220, 246.94, 261.63, 293.66, 261.63, 246.94, 233.08, 220]; // A minor scale
    const bassNotes = [110, 146.83, 110, 98]; // A, E, A, G bass pattern
    
    let noteIndex = 0;
    let bassIndex = 0;
    
    const playNote = () => {
      if (!isPlaying || !audioContext) return;
      
      // Melody oscillator
      const melodyOsc = audioContext.createOscillator();
      const melodyGain = audioContext.createGain();
      melodyOsc.connect(melodyGain);
      melodyGain.connect(audioContext.destination);
      
      melodyOsc.frequency.value = melodyNotes[noteIndex % melodyNotes.length];
      melodyOsc.type = 'square'; // 8-bit style
      melodyGain.gain.value = 0.1;
      
      // Bass oscillator
      const bassOsc = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      bassOsc.connect(bassGain);
      bassGain.connect(audioContext.destination);
      
      bassOsc.frequency.value = bassNotes[bassIndex % bassNotes.length];
      bassOsc.type = 'sawtooth';
      bassGain.gain.value = 0.08;
      
      const now = audioContext.currentTime;
      melodyOsc.start(now);
      melodyOsc.stop(now + 0.3);
      
      bassOsc.start(now);
      bassOsc.stop(now + 0.6);
      
      noteIndex++;
      if (noteIndex % 2 === 0) bassIndex++;
      
      // Schedule next note
      if (isPlaying) {
        setTimeout(playNote, 300); // 200ms intervals for Mozart-like timing
      }
    };
    
    playNote();
  }, [audioContext, isPlaying]);

  const toggleMusic = useCallback(async () => {
    if (!audioContext) {
      // Initialize audio context on first interaction
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      setPlaying(true);
      
      // Resume audio context if suspended
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return;
    }

    if (isPlaying) {
      setPlaying(false);
    } else {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      setPlaying(true);
    }
  }, [audioContext, isPlaying]);

  // Start playing when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && audioContext) {
      playStrudelInspiredMusic();
    }
  }, [isPlaying, audioContext, playStrudelInspiredMusic]);

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

  return (
    <>
      <Button
        onClick={() => void toggleMusic()}
        className="hidden lg:block"
        title="Play Mozart-inspired chiptune music (press m to play/mute)"
        imgUrl={volumeImg}
      >
        {isPlaying ? 'Mute' : 'Music'}
      </Button>
    </>
  );
}