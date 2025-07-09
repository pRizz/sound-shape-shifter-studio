import { useMemo } from 'react';

interface WaveformPreviewProps {
  waveType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  size?: number;
  isActive?: boolean;
}

export const WaveformPreview = ({ waveType, size = 40, isActive = false }: WaveformPreviewProps) => {
  const path = useMemo(() => {
    const width = size;
    const height = size * 0.6;
    const centerY = height / 2;
    const amplitude = height * 0.35;
    
    switch (waveType) {
      case 'sine':
        return `M 0 ${centerY} Q ${width * 0.25} ${centerY - amplitude} ${width * 0.5} ${centerY} Q ${width * 0.75} ${centerY + amplitude} ${width} ${centerY}`;
      
      case 'square':
        return `M 0 ${centerY + amplitude} L 0 ${centerY - amplitude} L ${width * 0.5} ${centerY - amplitude} L ${width * 0.5} ${centerY + amplitude} L ${width} ${centerY + amplitude} L ${width} ${centerY - amplitude}`;
      
      case 'triangle':
        return `M 0 ${centerY + amplitude} L ${width * 0.25} ${centerY - amplitude} L ${width * 0.75} ${centerY + amplitude} L ${width} ${centerY - amplitude}`;
      
      case 'sawtooth':
        return `M 0 ${centerY + amplitude} L ${width * 0.5} ${centerY - amplitude} L ${width * 0.5} ${centerY + amplitude} L ${width} ${centerY - amplitude}`;
      
      default:
        return '';
    }
  }, [waveType, size]);

  return (
    <svg 
      width={size} 
      height={size * 0.6} 
      className={`transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}
    >
      <path
        d={path}
        stroke={isActive ? 'hsl(var(--audio-active))' : 'hsl(var(--waveform-line))'}
        strokeWidth="2"
        fill="none"
        className={`transition-all duration-300 ${isActive ? 'drop-shadow-glow' : ''}`}
      />
    </svg>
  );
};