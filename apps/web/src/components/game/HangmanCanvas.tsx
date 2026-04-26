import { LIVES_PER_ROUND } from '@ahorcado/shared';

interface Props {
  livesRemaining: number;
  className?: string;
}

const FADE_IN = {
  opacity: 1,
  animation: 'hangmanPartIn 320ms ease-out',
} as const;

/**
 * 8 vidas → 8 errores antes del game over.
 * El número de partes a dibujar es `errors = LIVES_PER_ROUND - lives`.
 *
 * Orden de aparición (tomado de assests/ahorcado.png):
 * 1: cabeza, 2: cuello/cuerda, 3: torso, 4: brazo izq, 5: brazo der,
 * 6: pierna izq, 7: pierna der, 8: ojos X (muerto).
 */
export default function HangmanCanvas({ livesRemaining, className = '' }: Props) {
  const errors = Math.max(
    0,
    Math.min(LIVES_PER_ROUND, LIVES_PER_ROUND - livesRemaining),
  );
  const dead = errors >= LIVES_PER_ROUND;

  const stroke = '#f1f5f9';
  const accent = '#fcd34d';

  return (
    <svg
      viewBox="0 0 200 220"
      role="img"
      aria-label={`Ahorcado: ${errors} de ${LIVES_PER_ROUND} errores`}
      className={`mx-auto h-44 w-44 sm:h-56 sm:w-56 md:h-64 md:w-64 lg:h-72 lg:w-72 ${className}`}
      style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.6))' }}
    >
      <style>{`
        @keyframes hangmanPartIn {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes hangmanXBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
      {/* Suelo y horca (siempre visibles) */}
      <line x1="20" y1="210" x2="180" y2="210" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="210" x2="50" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="20" x2="140" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="140" y1="20" x2="140" y2="40" stroke={stroke} strokeWidth="4" strokeLinecap="round" />

      {errors >= 1 && (
        <circle
          cx="140"
          cy="58"
          r="18"
          fill="none"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          style={FADE_IN}
        />
      )}

      {errors >= 2 && (
        <line
          x1="140"
          y1="40"
          x2="140"
          y2="40"
          stroke={stroke}
          strokeWidth="4"
          style={FADE_IN}
        />
      )}

      {errors >= 3 && (
        <line
          x1="140"
          y1="76"
          x2="140"
          y2="140"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={FADE_IN}
        />
      )}

      {errors >= 4 && (
        <line
          x1="140"
          y1="92"
          x2="115"
          y2="115"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={FADE_IN}
        />
      )}

      {errors >= 5 && (
        <line
          x1="140"
          y1="92"
          x2="165"
          y2="115"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={FADE_IN}
        />
      )}

      {errors >= 6 && (
        <line
          x1="140"
          y1="140"
          x2="120"
          y2="180"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={FADE_IN}
        />
      )}

      {errors >= 7 && (
        <line
          x1="140"
          y1="140"
          x2="160"
          y2="180"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={FADE_IN}
        />
      )}

      {errors >= 8 && (
        <g
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            animation:
              'hangmanPartIn 320ms ease-out, hangmanXBlink 1.4s ease-in-out infinite 320ms',
          }}
        >
          <line x1="131" y1="52" x2="138" y2="59" />
          <line x1="138" y1="52" x2="131" y2="59" />
          <line x1="142" y1="52" x2="149" y2="59" />
          <line x1="149" y1="52" x2="142" y2="59" />
        </g>
      )}

      {/* Indicador de vidas (corazones pequeños) */}
      <g transform="translate(10, 18)" aria-hidden>
        {Array.from({ length: LIVES_PER_ROUND }).map((_, i) => {
          const alive = i < livesRemaining;
          return (
            <circle
              key={i}
              cx={0}
              cy={i * 14}
              r={4}
              fill={alive ? accent : 'transparent'}
              stroke={alive ? accent : '#475569'}
              strokeWidth="2"
            />
          );
        })}
      </g>
    </svg>
  );
}
