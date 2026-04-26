interface Props {
  maskedView: Array<string | null>;
  solved?: boolean;
}

export default function WordDisplay({ maskedView, solved = false }: Props) {
  // Agrupamos por palabras (cuando hay espacios) para que el wrap sea natural
  const groups: Array<Array<string | null>> = [];
  let current: Array<string | null> = [];
  for (const ch of maskedView) {
    if (ch === ' ') {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(ch);
    }
  }
  if (current.length) groups.push(current);

  return (
    <div
      className="flex flex-wrap items-end justify-center gap-x-6 gap-y-3 px-2"
      aria-label={solved ? 'Palabra adivinada' : 'Palabra a adivinar'}
    >
      {groups.map((word, gi) => (
        <div key={gi} className="flex gap-1">
          {word.map((ch, i) => (
            <span
              key={`${gi}-${i}`}
              className={`flex h-12 w-9 items-end justify-center border-b-4 pb-1 font-mono text-3xl uppercase transition-colors sm:h-14 sm:w-10 sm:text-4xl ${
                ch
                  ? solved
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-amber-300 text-amber-200'
                  : 'border-slate-600 text-transparent'
              }`}
            >
              {ch ?? '_'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
