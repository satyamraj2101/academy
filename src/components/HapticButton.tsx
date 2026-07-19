import React, { useRef } from 'react';
import { motion } from 'motion/react';

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  vibrationPattern?: number | number[];
  scaleAmount?: number;
  id?: string;
}

// Global toggle for haptic options (can be turned on/off in the header settings)
export const hapticSettings = {
  vibrationEnabled: true,
  soundEnabled: true,
};

// Singleton audio context for a short click synthesize sound when clicked
let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContextInstance) {
    try {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }
  return audioContextInstance;
}

export function playPremiumHapticSound(type: 'click' | 'success' | 'open') {
  if (!hapticSettings.soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'click') {
    // Elegant, premium soft tactile warm wooden/bubble tick (low volume, extremely rapid decay, sine wave)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.024);

    gain.gain.setValueAtTime(0.04, ctx.currentTime); // very subtle, non-intrusive
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.024);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.024);
  } else if (type === 'success') {
    // Smooth chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.2); // C6

    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } else if (type === 'open') {
    // Soft high-tech swish sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  }
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  children,
  vibrationPattern = 12,
  scaleAmount = 0.96,
  id,
  onClick,
  className = '',
  ...props
}) => {
  const triggerHaptic = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Try to vibrate mobile device
    if (hapticSettings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(vibrationPattern);
      } catch (err) {
        // Safe fail inside iframe
      }
    }

    // Play micro tactile feedback audio
    playPremiumHapticSound('click');

    // Call actual onClick handler
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      id={id}
      whileHover={{ scale: 1.018, y: -0.5 }}
      whileTap={{ scale: scaleAmount }}
      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      onClick={triggerHaptic}
      className={`cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:outline-none ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};
