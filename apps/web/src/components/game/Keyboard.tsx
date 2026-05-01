import { useEffect } from 'react';

interface Props {
  guessed: string[];
  maskedView: Array<string | null>;
  disabled?: boolean;
  onLetter: (letter: string) => void;
}

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function Keyboard({
  guessed,
  maskedView,
  disabled = false,
  onLetter,
}: Props) {
  // Letras correctas: las que aparecen en maskedView
  const correctSet = new Set<string>();
  for (const ch of maskedView) {
    if (ch && ch !== ' ') correctSet.add(ch);
  }
  const guessedSet = new Set(guessed);

  useEffect(() => {
    if (disabled) return;
    function handler(e: KeyboardEvent) {
      const key = e.key
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
      if (!/^[a-zñ]$/.test(key)) return;
      if (guessedSet.has(key)) return;
      onLetter(key);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guessedSet, onLetter, disabled]);

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-1 sm:gap-1.5 lg:max-w-xl">
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          className="flex w-full justify-center gap-1 sm:gap-1.5"
        >
          {row.map((letter) => {
            const tried = guessedSet.has(letter);
            const correct = tried && correctSet.has(letter);
            const wrong = tried && !correct;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => !tried && !disabled && onLetter(letter)}
                disabled={tried || disabled}
                aria-pressed={tried}
                aria-label={`Letra ${letter.toUpperCase()}${correct ? ' (acierto)' : wrong ? ' (fallo)' : ''}`}
                data-testid={`keyboard-letter-${letter}`}
                className={`flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-md font-mono text-sm font-semibold uppercase transition sm:h-12 sm:min-w-[2.5rem] sm:text-lg md:h-14 md:text-xl ${
                  correct
                    ? 'bg-emerald-500 text-white'
                    : wrong
                      ? 'bg-red-600/40 text-red-200 line-through'
                      : disabled
                        ? 'bg-slate-700/40 text-slate-500'
                        : 'bg-slate-700 text-white hover:bg-slate-600 active:bg-slate-500'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
