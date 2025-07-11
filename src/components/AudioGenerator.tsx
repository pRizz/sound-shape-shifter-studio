import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Volume2, VolumeX, Plus, Trash2, Eye, EyeOff, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { WaveformPreview } from './WaveformPreview';
import { toast } from '@/hooks/use-toast';

type WaveType = 'sine' | 'square' | 'triangle' | 'sawtooth';

const maxGain = 0.2;

interface Note {
  name: string;
  frequency: number;
  isSharp?: boolean;
}

interface ActiveTone {
  id: string;
  frequency: number;
  waveType: WaveType;
  volume: number; // The user-set volume level
  isEnabled: boolean; // Whether the tone is muted or not
  oscillator: OscillatorNode;
  gainNode: GainNode;
  createdAt: Date;
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
  const [frequency, setFrequency] = useState(440);
  const [waveType, setWaveType] = useState<WaveType>('sine');
  const [selectedOctave, setSelectedOctave] = useState(4);
  const [volume, setVolume] = useState([50]);
  const [activeTones, setActiveTones] = useState<ActiveTone[]>([]);
  const [isAllPaused, setIsAllPaused] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  // Lazy load the audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      console.log('Making new audio context');
      audioContextRef.current = new AudioContext();
    }
    console.log('Reusing audio context');
    return audioContextRef.current;
  }, []);

  const generateToneId = () => `tone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addTone = useCallback(() => {
    try {
      console.log('Adding tone with settings:', { frequency, waveType, volume: volume[0] });
      
      const audioContext = getAudioContext();
      console.log('Audio context state:', audioContext.state);
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      const gainValue = (volume[0] / 100) * maxGain; // Lower max gain for multiple tones
      console.log('Setting gain value:', gainValue);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(gainValue, audioContext.currentTime + 0.01);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log('Starting oscillator...');
      oscillator.start();

      const newTone: ActiveTone = {
        id: generateToneId(),
        frequency,
        waveType,
        volume: volume[0],
        isEnabled: true,
        oscillator,
        gainNode,
        createdAt: new Date(),
      };

      console.log('Created new tone:', newTone.id);
      setActiveTones(prev => {
        const updated = [...prev, newTone];
        console.log('Updated active tones count:', updated.length);
        return updated;
      });

      toast({
        title: "Tone Added",
        description: `Added ${waveType} wave at ${frequency}Hz`,
      });
    } catch (error) {
      console.error('Error adding tone:', error);
      toast({
        title: "Audio Error",
        description: "Failed to add tone. Please try again.",
        variant: "destructive",
      });
    }
  }, [frequency, waveType, volume, getAudioContext]);

  const removeTone = useCallback((toneId: string) => {
    setActiveTones(prev => {
      const tone = prev.find(t => t.id === toneId);
      if (tone) {
        // Fade out and stop
        tone.gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current!.currentTime + 0.01);
        setTimeout(() => {
          tone.oscillator.stop();
        }, 20);
      }
      return prev.filter(t => t.id !== toneId);
    });

    toast({
      title: "Tone Removed",
      description: "Tone has been removed",
    });
  }, []);

  const updateToneVolume = useCallback((toneId: string, newVolume: number) => {
    console.log('updateToneVolume called:', { toneId, newVolume });

    setActiveTones(prev => prev.map(tone => {
      if (tone.id === toneId) {
        console.log('Found tone to update:', tone.id, 'enabled:', tone.isEnabled);
        
        if (audioContextRef.current && tone.gainNode) {
          // Calculate gain based on volume, enabled state, and global pause state
          const gainValue = (!isAllPaused && tone.isEnabled) ? (newVolume / 100) * maxGain : 0;
          console.log('Applying gain:', gainValue);
          
          try {
            tone.gainNode.gain.linearRampToValueAtTime(gainValue, audioContextRef.current.currentTime + 0.1);
            console.log('Volume updated successfully');
          } catch (error) {
            console.error('Error updating tone volume:', error);
          }
        }
        
        return { ...tone, volume: newVolume };
      }
        return tone;
    }));
  }, [isAllPaused]);

  const toggleTone = useCallback((toneId: string) => {
    console.log('toggleTone called for:', toneId);
    
    setActiveTones(prev => prev.map(tone => {
      if (tone.id === toneId) {
        const newEnabled = !tone.isEnabled;
        console.log(`Toggling tone ${toneId} from ${tone.isEnabled} to ${newEnabled}`);
        
        if (audioContextRef.current && tone.gainNode) {
          // Use current volume but apply enabled/disabled state, but only if not globally paused
          const gainValue = (!isAllPaused && newEnabled) ? (tone.volume / 100) * maxGain : 0;
          console.log('Setting gain to:', gainValue);
          
          try {
            tone.gainNode.gain.linearRampToValueAtTime(gainValue, audioContextRef.current.currentTime + 0.1);
            console.log('Toggle applied successfully');
          } catch (error) {
            console.error('Error toggling tone:', error);
          }
        }
        
        return { ...tone, isEnabled: newEnabled };
      }
      return tone;
    }));
  }, [isAllPaused]);

  const pauseAllTones = useCallback(() => {
    setActiveTones(prev => prev.map(tone => {
      if (audioContextRef.current && tone.gainNode) {
        // Mute all tones by setting gain to 0, but preserve their enabled state
        tone.gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.1);
      }
      return tone; // Don't change isEnabled state
    }));
    setIsAllPaused(true);

    toast({
      title: "All Tones Paused",
      description: "All active tones have been paused",
    });
  }, []);

  const unpauseAllTones = useCallback(() => {
    setActiveTones(prev => prev.map(tone => {
      if (audioContextRef.current && tone.gainNode) {
        // Restore each tone's volume based on its enabled state and volume level
        const gainValue = tone.isEnabled ? (tone.volume / 100) * maxGain : 0;
        tone.gainNode.gain.linearRampToValueAtTime(gainValue, audioContextRef.current.currentTime + 0.1);
      }
      return tone; // Don't change isEnabled state
    }));
    setIsAllPaused(false);

    toast({
      title: "All Tones Unpaused",
      description: "All active tones have been resumed",
    });
  }, []);

  const stopAllTones = useCallback(() => {
    activeTones.forEach(tone => {
      tone.gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current!.currentTime + 0.01);
      setTimeout(() => {
        tone.oscillator.stop();
      }, 20);
    });
    setActiveTones([]);
    setIsAllPaused(false);

    toast({
      title: "All Tones Stopped",
      description: "All active tones have been stopped",
    });
  }, [activeTones]);

  const handleFrequencyChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 20000) {
      setFrequency(numValue);
    }
  };

  const handleNoteClick = (note: Note) => {
    const noteFrequency = note.frequency * Math.pow(2, selectedOctave - 4);
    setFrequency(Math.round(noteFrequency * 100) / 100);
  };

  useEffect(() => {
    console.log('useEffect');
    return () => {
      console.log('useEffect cleanup');
      activeTones.forEach(tone => {
        tone.oscillator.stop();
      });
      console.log('audioContextRef.current', audioContextRef.current);
      if (audioContextRef.current) {
        console.log('closing audio context');
        audioContextRef.current.close();
      }
    };
  }, []);

  console.log('activeTones', activeTones);
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-active bg-clip-text text-transparent">
              Multi-Tone Audio Generator
            </h1>
            <a
              href="https://github.com/pRizz/sound-shape-shifter-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-6 w-6" />
            </a>
          </div>
          <p className="text-muted-foreground">
            Audio synthesizer with multiple simultaneous tones
          </p>
        </div>

        {/* Tone Creation Panel */}
        <Card className="bg-gradient-panel border-border/50 shadow-panel p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
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
                    onClick={() => setWaveType(type)}
                    className={`h-28 flex flex-col items-center justify-center gap-2 bg-gradient-control hover:bg-gradient-active transition-all duration-300 ${
                      waveType === type ? 'shadow-glow border-primary text-primary-foreground' : 'border-border/30'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <WaveformPreview waveType={type} size={40} isActive={waveType === type} />
                    </div>
                    <span className="text-xl font-bold capitalize text-foreground">{type}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Frequency Control */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Frequency & Volume
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

                {/* Volume Control for new tones */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {volume[0] === 0 ? (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm font-medium text-muted-foreground">Volume</span>
                    <span className="text-sm font-mono text-primary ml-auto">{volume[0]}%</span>
                  </div>
                  
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Add Tone Button */}
                <Button
                  onClick={addTone}
                  size="lg"
                  className="w-full bg-gradient-active hover:opacity-90 shadow-control transition-all duration-300"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Tone
                </Button>

                {/* Tone Preview */}
                <div className="text-center p-3 bg-audio-control/50 rounded-lg border border-border/30">
                  <p className="text-xs text-muted-foreground mb-1">Next tone will be:</p>
                  <p className="font-mono text-sm text-foreground">
                    <span className="text-primary font-medium">{frequency}Hz</span> • {" "}
                    <span className="text-accent capitalize">{waveType}</span> • {" "}
                    <span className="text-neon-green">{volume[0]}%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Tones:</span>
                  <Badge variant="secondary" className="bg-audio-control">
                    {activeTones.length}
                  </Badge>
                </div>

                <Button
                  onClick={isAllPaused ? unpauseAllTones : pauseAllTones}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={activeTones.length === 0}
                >
                  {isAllPaused ? (
                    <Play className="h-5 w-5 mr-2" />
                  ) : (
                    <Square className="h-5 w-5 mr-2" />
                  )}
                  {isAllPaused ? 'Unpause All Tones' : 'Pause All Tones'}
                </Button>

                <Button
                  onClick={stopAllTones}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={activeTones.length === 0}
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Delete All Tones
                </Button>
                
              </div>
            </div>
          </div>
        </Card>

        {/* Active Tones Panel */}
        {activeTones.length > 0 && (
          <Card className="bg-gradient-panel border-border/50 shadow-panel p-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {isAllPaused ? (
                  <Square className="h-5 w-5 text-orange-500" />
                ) : (
                  <Play className="h-5 w-5 text-neon-green" />
                )}
                Active Tones ({activeTones.length})
                {isAllPaused && (
                  <Badge variant="outline" className="ml-2 text-orange-500 border-orange-500/30">
                    Paused
                  </Badge>
                )}
              </h3>
              
              <div className="grid gap-4">
                {activeTones.map((tone) => (
                  <div
                    key={tone.id}
                    className={`p-4 rounded-lg bg-audio-control border transition-all duration-300 ${
                      tone.isEnabled 
                        ? isAllPaused 
                          ? 'border-orange-500/30 shadow-control opacity-80' 
                          : 'border-primary/30 shadow-control' 
                        : 'border-border/30 opacity-60'
                    }`}
                  >
                    {/* Mobile-friendly layout with flex wrap */}
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Waveform Preview and Tone Info */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="flex-shrink-0">
                          <WaveformPreview 
                            waveType={tone.waveType} 
                            size={40} 
                            isActive={tone.isEnabled && !isAllPaused} 
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-sm font-medium text-foreground whitespace-nowrap">
                              {tone.frequency}Hz
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {tone.waveType}
                            </Badge>
                            <span className={`text-xs whitespace-nowrap ${tone.isEnabled ? (isAllPaused ? 'text-orange-500' : 'text-neon-green') : 'text-muted-foreground'}`}>
                              {tone.isEnabled ? (isAllPaused ? 'Paused' : 'Playing') : 'Muted'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Volume Control - takes remaining space, wraps on mobile */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 min-w-[200px]">
                        <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Slider
                          value={[tone.volume]}
                          onValueChange={(value) => updateToneVolume(tone.id, value[0])}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono text-muted-foreground w-8 text-right flex-shrink-0">
                          {tone.volume}%
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Toggling tone:', tone.id, 'currently enabled:', tone.isEnabled);
                            toggleTone(tone.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {tone.isEnabled ? (
                            <Eye className="h-4 w-4 text-neon-green" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Removing tone:', tone.id);
                            removeTone(tone.id);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

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

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-8">
          <p>
            Free and open source software vibe coded by{' '}
            <a 
              href="https://github.com/pRizz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Peter Ryszkiewicz
            </a>{' '}
            and{' '}
            <a 
              href="https://lovable.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              lovable.dev
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};