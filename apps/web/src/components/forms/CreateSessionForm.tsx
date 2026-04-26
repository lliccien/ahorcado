import { useState } from 'react';

import {
  MAX_ROUNDS,
  MIN_ROUNDS,
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
} from '@ahorcado/shared';

import { CATEGORY_OPTIONS } from '../../lib/categories';
import { API_BASE_URL } from '../../lib/api';
import { getLastName, setLastName, setPlayerId } from '../../lib/storage';

export default function CreateSessionForm() {
  const [hostName, setHostName] = useState(() => getLastName());
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [category, setCategory] = useState<string>('random');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (
      hostName.trim().length < PLAYER_NAME_MIN ||
      hostName.trim().length > PLAYER_NAME_MAX
    ) {
      setError(
        `Tu nombre debe tener entre ${PLAYER_NAME_MIN} y ${PLAYER_NAME_MAX} caracteres`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalRounds,
          category,
          hostName: hostName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (Array.isArray(data?.message) ? data.message.join('; ') : data?.message) ||
          'No se pudo crear la sesión';
        setError(msg);
        return;
      }
      setLastName(hostName.trim());
      setPlayerId(data.code, data.hostPlayerId);
      window.location.href = `/play/${data.code}?host=1`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error de red al crear la sesión',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white/5 p-6 shadow-xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Crear partida
      </h1>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        Tu nombre
        <input
          type="text"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          minLength={PLAYER_NAME_MIN}
          maxLength={PLAYER_NAME_MAX}
          required
          autoComplete="given-name"
          className="rounded-lg bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Ej: Luis"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        Cantidad de rondas: <span className="text-amber-400">{totalRounds}</span>
        <input
          type="range"
          min={MIN_ROUNDS}
          max={MAX_ROUNDS}
          value={totalRounds}
          onChange={(e) => setTotalRounds(Number(e.target.value))}
          className="accent-amber-400"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{MIN_ROUNDS}</span>
          <span>{MAX_ROUNDS}</span>
        </div>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        <legend>Categoría</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_OPTIONS.map((opt) => {
            const selected = category === opt.slug;
            return (
              <button
                type="button"
                key={opt.slug}
                onClick={() => setCategory(opt.slug)}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                    : 'border-white/10 bg-slate-900/40 text-slate-200 hover:border-white/30'
                }`}
              >
                <span aria-hidden className="text-lg">
                  {opt.icon}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-amber-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-md transition hover:bg-amber-300 disabled:opacity-60"
      >
        {submitting ? 'Creando…' : 'Crear sala'}
      </button>
    </form>
  );
}
