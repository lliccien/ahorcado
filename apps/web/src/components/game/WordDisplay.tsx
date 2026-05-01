interface Props {
  maskedView: Array<string | null>;
  solved?: boolean;
}

/**
 * Tabla de tamaños por palabra continua más larga. Cada tier define ancho,
 * alto, gap entre letras y tamaño de fuente para mobile / sm / md+.
 *
 * Regla mobile (320–390px viewport): la palabra continua más larga debe
 * caber en una sola línea. Las palabras separadas por espacios sí pueden
 * acomodarse en filas distintas (lo permite el `flex-wrap` del contenedor
 * padre).
 */
type SizeTier = {
  letter: string;
  gap: string;
};

function pickTier(longest: number): SizeTier {
  if (longest <= 6) {
    return {
      letter:
        'h-12 w-9 text-3xl sm:h-14 sm:w-10 sm:text-4xl md:h-16 md:w-12 md:text-5xl',
      gap: 'gap-1 sm:gap-1.5',
    };
  }
  if (longest <= 8) {
    return {
      letter:
        'h-11 w-8 text-2xl sm:h-13 sm:w-10 sm:text-4xl md:h-16 md:w-12 md:text-5xl',
      gap: 'gap-1 sm:gap-1.5',
    };
  }
  if (longest <= 11) {
    return {
      letter:
        'h-10 w-7 text-xl sm:h-12 sm:w-9 sm:text-3xl md:h-14 md:w-11 md:text-4xl',
      gap: 'gap-1 sm:gap-1.5',
    };
  }
  if (longest <= 14) {
    return {
      letter:
        'h-9 w-[1.3rem] text-lg sm:h-11 sm:w-7 sm:text-2xl md:h-13 md:w-9 md:text-3xl',
      gap: 'gap-[2px] sm:gap-1',
    };
  }
  if (longest <= 17) {
    return {
      letter:
        'h-8 w-[1.05rem] text-base sm:h-10 sm:w-6 sm:text-xl md:h-12 md:w-8 md:text-2xl',
      gap: 'gap-[2px] sm:gap-1',
    };
  }
  // ≥ 18
  return {
    letter:
      'h-7 w-[0.85rem] text-sm sm:h-9 sm:w-5 sm:text-lg md:h-11 md:w-7 md:text-xl',
    gap: 'gap-[1px] sm:gap-[2px] md:gap-1',
  };
}

export default function WordDisplay({ maskedView, solved = false }: Props) {
  // Agrupamos por palabras (cuando hay espacios) para que el wrap sea natural
  const groups: Array<Array<{ ch: string | null; idx: number }>> = [];
  let current: Array<{ ch: string | null; idx: number }> = [];
  for (let i = 0; i < maskedView.length; i++) {
    const ch = maskedView[i];
    if (ch === ' ') {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push({ ch, idx: i });
    }
  }
  if (current.length) groups.push(current);

  // Palabra continua más larga: define el tamaño de letra para que esa palabra
  // quepa entera en una línea aun en el viewport más estrecho.
  const longest = groups.reduce((m, g) => Math.max(m, g.length), 0);
  const tier = pickTier(longest);

  return (
    <div
      className="flex flex-wrap items-end justify-center gap-x-4 gap-y-2 px-2 sm:gap-x-6 sm:gap-y-3"
      aria-label={solved ? 'Palabra adivinada' : 'Palabra a adivinar'}
    >
      <style>{`
        @keyframes wordLetterReveal {
          from { transform: translateY(8px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      {groups.map((word, gi) => (
        <div key={gi} className={`flex ${tier.gap}`}>
          {word.map(({ ch, idx }) => (
            <span
              key={`${idx}-${ch ?? 'blank'}`}
              className={`flex items-end justify-center border-b-4 pb-1 font-mono uppercase transition-colors ${tier.letter} ${
                ch
                  ? solved
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-amber-300 text-amber-200'
                  : 'border-slate-600 text-transparent'
              }`}
              style={
                ch
                  ? { animation: 'wordLetterReveal 280ms ease-out' }
                  : undefined
              }
            >
              {ch ?? '_'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
