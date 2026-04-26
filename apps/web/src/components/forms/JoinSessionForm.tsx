import { useState } from 'react';

import {
  CODE_LENGTH,
  PLAYER_NAME_MAX,
  PLAYER_NAME_MIN,
} from '@ahorcado/shared';

import { fetchSessionPublic } from '../../lib/api';
import { getLastName, setLastName } from '../../lib/storage';

const CODE_REGEX = /^[2-9A-HJ-NP-Z]{6}$/;

interface Props {
  initialCode?: string;
}

export default function JoinSessionForm({ initialCode = '' }: Props) {
  const [code, setCode] = useState(() =>
    initialCode.trim().toUpperCase().slice(0, CODE_LENGTH),
  );
  const [name, setName] = useState(() => getLastName());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();
    if (!CODE_REGEX.test(cleanCode)) {
      setError('Código inválido. Revisa que sean 6 caracteres.');
      return;
    }
    if (
      name.trim().length < PLAYER_NAME_MIN ||
      name.trim().length > PLAYER_NAME_MAX
    ) {
      setError(
        `Tu nombre debe tener entre ${PLAYER_NAME_MIN} y ${PLAYER_NAME_MAX} caracteres`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const info = await fetchSessionPublic(cleanCode);
      if (!info.exists) {
        setError('No encontramos una sala con ese código.');
        return;
      }
      if (info.status === 'FINISHED') {
        setError('Esta sala ya terminó.');
        return;
      }
      setLastName(name.trim());
      const params = new URLSearchParams({ name: name.trim() });
      window.location.href = `/play/${cleanCode}?${params.toString()}`;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos validar el código. Intenta de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white/5 p-6 shadow-xl ring-1 ring-white/10 backdrop-blur-md md:max-w-lg lg:max-w-xl"
      data-testid="join-session-form"
    >
      <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
        Unirse a una partida
      </h1>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        Código de la sala
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, CODE_LENGTH),
            )
          }
          maxLength={CODE_LENGTH}
          minLength={CODE_LENGTH}
          required
          placeholder="ABC123"
          className="rounded-lg bg-slate-900 px-4 py-3 text-center text-2xl font-mono uppercase tracking-[0.4em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
          data-testid="join-code-input"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
        Tu nombre
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={PLAYER_NAME_MIN}
          maxLength={PLAYER_NAME_MAX}
          required
          autoComplete="given-name"
          className="rounded-lg bg-slate-900 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Ej: María"
          data-testid="join-name-input"
        />
      </label>

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
        data-testid="join-submit"
      >
        {submitting ? 'Validando…' : 'Entrar'}
      </button>
    </form>
  );
}
