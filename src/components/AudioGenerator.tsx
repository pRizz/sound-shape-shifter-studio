import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { WaveformPreview } from './WaveformPreview';
import { toast } from '@/hooks/use-toast';

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface Note {
  name: string;
  frequency: number;
  isSharp?: boolean;
}

const notes: Note[] = [
  { name: 'C', frequency: 261.63 },
  { name: 'C#', frequency: 277.18, isSharp: true },
  { name: 'D', frequency: 293.66 },
  { name: 'D#', frequency: 311.13, isSharp: true },
  { name: 'E', frequency: 329.63 },
  { name: 'F', frequency: 349.23 },
  { name: 'F#', frequency: 369.99, isSharp: true },
  { name: 'G', frequency: 392.00 },
  { name: 'G#', frequency: 415.30, isSharp: true },
  { name: 'A', frequency: 440.00 },
  { name: 'A#', frequency: 466.16, isSharp: true },
  { name: 'B', frequency: 493.88 },
];

const octaves = [3, 4, 5, 6, 7];

export const AudioGenerator = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState(440);
  const [waveType, setWaveType] = useState<WaveType>('sine');
  const [selectedOctave, setSelectedOctave] = useState(4);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const startTone = useCallback(() => {
    try {
      const audioContext = initAudioContext();
      
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      
      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      setIsPlaying(true);

      toast({
        title: "Audio Started",
        description: `Playing ${waveType} wave at ${frequency}Hz`,
      });
    } catch (error) {
      console.error('Error starting audio:', error);
      toast({
        title: "Audio Error",
        description: "Failed to start audio. Please try again.",
        variant: "destructive",
      });
    }
  }, [frequency, waveType, initAudioContext]);

  const stopTone = useCallback(() => {
    if (oscillatorRef.current && gainNodeRef.current) {
      const audioContext = audioContextRef.current;
      if (audioContext) {
        gainNodeRef.current.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.01);
        setTimeout(() => {
          if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current = null;
            gainNodeRef.current = null;
          }
        }, 20);
      }
    }
    setIsPlaying(false);
    
    toast({
      title: "Audio Stopped",
      description: "Tone generation stopped",
    });
  }, []);

  const updateFrequency = useCallback((newFrequency: number) => {
    if (oscillatorRef.current && audioContextRef.current) {
      oscillatorRef.current.frequency.setValueAtTime(newFrequency, audioContextRef.current.currentTime);
    }
  }, []);

  const handleFrequencyChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 20000) {
      setFrequency(numValue);
      updateFrequency(numValue);
    }
  };

  const handleNoteClick = (note: Note) => {
    const noteFrequency = note.frequency * Math.pow(2, selectedOctave - 4);
    setFrequency(Math.round(noteFrequency * 100) / 100);
    updateFrequency(noteFrequency);
  };

  const handleWaveTypeChange = (newWaveType: WaveType) => {
    setWaveType(newWaveType);
    if (oscillatorRef.current) {
      // Need to restart the oscillator to change wave type
      if (isPlaying) {
        stopTone();
        setTimeout(() => startTone(), 50);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && oscillatorRef.current) {
      // Restart with new wave type
      stopTone();
      setTimeout(() => startTone(), 50);
    }
  }, [waveType]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-active bg-clip-text text-transparent">
            Audio Frequency Generator
          </h1>
          <p className="text-muted-foreground">
            Professional-grade tone generator with multiple waveforms
          </p>
        </div>

        {/* Main Control Panel */}
        <Card className="bg-gradient-panel border-border/50 shadow-panel p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Waveform Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" />
                Waveform Type
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {(['sine', 'square', 'triangle', 'sawtooth'] as WaveType[]).map((type) => (
                  <Button
                    key={type}
                    variant={waveType === type ? "default" : "secondary"}
                    onClick={() => handleWaveTypeChange(type)}
                    className={`h-20 flex flex-col items-center justify-center gap-2 bg-gradient-control hover:bg-gradient-active transition-all duration-300 ${
                      waveType === type ? 'shadow-glow border-primary' : 'border-border/30'
                    }`}
                  >
                    <WaveformPreview waveType={type} isActive={waveType === type} />
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Frequency Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Frequency Control
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    className="bg-audio-control border-border/30 text-center font-mono text-lg"
                    min="1"
                    max="20000"
                    step="0.01"
                  />
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Hz</span>
                </div>

                {/* Play/Stop Controls */}
                <div className="flex gap-3">
                  <Button
                    onClick={isPlaying ? stopTone : startTone}
                    size="lg"
                    className={`flex-1 transition-all duration-300 ${
                      isPlaying 
                        ? 'bg-destructive hover:bg-destructive/90 shadow-glow' 
                        : 'bg-gradient-active hover:opacity-90 shadow-control'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="h-5 w-5 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Musical Notes Panel */}
        <Card className="bg-gradient-panel border-border/50 shadow-panel p-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
              Musical Notes
            </h3>
            
            {/* Octave Selection */}
            <div className="space-y-3">
              <span className="text-sm font-medium text-muted-foreground">Octave</span>
              <div className="flex gap-2">
                {octaves.map((octave) => (
                  <Button
                    key={octave}
                    variant={selectedOctave === octave ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedOctave(octave)}
                    className={`transition-all duration-300 ${
                      selectedOctave === octave ? 'shadow-control' : ''
                    }`}
                  >
                    {octave}
                  </Button>
                ))}
              </div>
            </div>

            {/* Note Buttons */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {notes.map((note) => (
                <Button
                  key={note.name}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleNoteClick(note)}
                  className={`transition-all duration-300 hover:shadow-control ${
                    note.isSharp 
                      ? 'bg-audio-panel hover:bg-audio-control text-primary' 
                      : 'bg-gradient-control hover:bg-gradient-active'
                  }`}
                >
                  {note.name}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Current Settings Display */}
        <Card className="bg-gradient-panel border-border/50 shadow-panel p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Settings</p>
              <p className="font-mono text-lg">
                <span className="text-primary">{frequency}Hz</span> • {" "}
                <span className="text-accent capitalize">{waveType}</span> • {" "}
                <span className={`${isPlaying ? 'text-neon-green' : 'text-muted-foreground'}`}>
                  {isPlaying ? 'Playing' : 'Stopped'}
                </span>
              </p>
            </div>
            
            {isPlaying && (
              <div className="h-3 w-3 bg-neon-green rounded-full animate-pulse shadow-glow"></div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};