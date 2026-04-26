interface Props {
  maskedView: Array<string | null>;
  solved?: boolean;
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

  return (
    <div
      className="flex flex-wrap items-end justify-center gap-x-6 gap-y-3 px-2"
      aria-label={solved ? 'Palabra adivinada' : 'Palabra a adivinar'}
    >
      <style>{`
        @keyframes wordLetterReveal {
          from { transform: translateY(8px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
      {groups.map((word, gi) => (
        <div key={gi} className="flex gap-1">
          {word.map(({ ch, idx }) => (
            <span
              key={`${idx}-${ch ?? 'blank'}`}
              className={`flex h-12 w-9 items-end justify-center border-b-4 pb-1 font-mono text-3xl uppercase transition-colors sm:h-14 sm:w-10 sm:text-4xl md:h-16 md:w-12 md:text-5xl ${
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
