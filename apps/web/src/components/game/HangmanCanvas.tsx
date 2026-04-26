import { LIVES_PER_ROUND } from '@ahorcado/shared';

interface Props {
  livesRemaining: number;
  className?: string;
}

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
      className={`mx-auto h-44 w-44 sm:h-56 sm:w-56 ${className}`}
    >
      {/* Suelo y horca (siempre visibles) */}
      <line x1="20" y1="210" x2="180" y2="210" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="210" x2="50" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="20" x2="140" y2="20" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <line x1="140" y1="20" x2="140" y2="40" stroke={stroke} strokeWidth="4" strokeLinecap="round" />

      {/* 1 — cabeza */}
      {errors >= 1 && (
        <circle
          cx="140"
          cy="58"
          r="18"
          fill="none"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
        />
      )}

      {/* 2 — cuello / cuerda al cuello (línea entre travesaño y cabeza) */}
      {errors >= 2 && (
        <line x1="140" y1="40" x2="140" y2="40" stroke={stroke} strokeWidth="4" />
      )}

      {/* 3 — torso */}
      {errors >= 3 && (
        <line
          x1="140"
          y1="76"
          x2="140"
          y2="140"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* 4 — brazo izquierdo */}
      {errors >= 4 && (
        <line
          x1="140"
          y1="92"
          x2="115"
          y2="115"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* 5 — brazo derecho */}
      {errors >= 5 && (
        <line
          x1="140"
          y1="92"
          x2="165"
          y2="115"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* 6 — pierna izquierda */}
      {errors >= 6 && (
        <line
          x1="140"
          y1="140"
          x2="120"
          y2="180"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* 7 — pierna derecha */}
      {errors >= 7 && (
        <line
          x1="140"
          y1="140"
          x2="160"
          y2="180"
          stroke={dead ? '#ef4444' : stroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}

      {/* 8 — ojos X (muerto) */}
      {errors >= 8 && (
        <g stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
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
