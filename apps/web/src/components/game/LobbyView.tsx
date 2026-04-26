import { useState } from 'react';

import {
  MIN_PLAYERS_TO_START,
  type ErrorPayload,
  type Player,
  type SessionState,
} from '@ahorcado/shared';

import { categoryLabel } from '../../lib/categories';

interface Props {
  session: SessionState;
  players: Player[];
  myPlayerId: string | null;
  isHost: boolean;
  onStart: () => Promise<{ ok: true } | ErrorPayload>;
  onCloseSession: () => Promise<{ ok: true } | ErrorPayload>;
  onKickPlayer: (playerId: string) => Promise<{ ok: true } | ErrorPayload>;
}

export default function LobbyView({
  session,
  players,
  myPlayerId,
  isHost,
  onStart,
  onCloseSession,
  onKickPlayer,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function shareCode() {
    if (!('share' in navigator)) {
      void copyCode();
      return;
    }
    try {
      await (
        navigator as Navigator & { share: (data: ShareData) => Promise<void> }
      ).share({
        title: 'Únete a mi partida del Ahorcado',
        text: `Código de sala: ${session.code}`,
        url: `${window.location.origin}/join?code=${session.code}`,
      });
    } catch {
      // El usuario canceló o el navegador no soporta share
    }
  }

  async function handleStart() {
    if (starting) return;
    setStartError(null);
    setStarting(true);
    try {
      const result = await onStart();
      if ('code' in result && 'message' in result) {
        setStartError((result as ErrorPayload).message);
      }
    } finally {
      setStarting(false);
    }
  }

  const connectedCount = players.filter((p) => p.connected).length;
  const canStart = connectedCount >= MIN_PLAYERS_TO_START;
  const otherConnectedCount = players.filter(
    (p) => p.connected && p.id !== myPlayerId,
  ).length;
  const canCloseSession = isHost && otherConnectedCount === 0;

  async function handleCloseSession() {
    if (closing) return;
    if (!confirm('¿Cerrar esta sala? La partida no podrá reanudarse.')) return;
    setClosing(true);
    try {
      await onCloseSession();
    } finally {
      setClosing(false);
    }
  }

  async function handleKick(playerId: string, name: string) {
    if (kickingId) return;
    if (!confirm(`¿Expulsar a ${name} de la sala?`)) return;
    setKickingId(playerId);
    try {
      await onKickPlayer(playerId);
    } finally {
      setKickingId(null);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-md grid-cols-1 gap-6 px-4 pb-8 pt-6 text-slate-100 md:max-w-xl lg:max-w-2xl lg:grid-cols-2 lg:gap-8">
      <header className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
        <p className="text-xs uppercase tracking-widest text-amber-300">
          Sala creada — esperando jugadores
        </p>
        <button
          type="button"
          onClick={copyCode}
          aria-label="Copiar código de sala"
          className="select-all rounded-2xl border border-amber-400/40 bg-amber-400/10 px-6 py-3 font-mono text-4xl tracking-[0.5em] text-amber-300 transition hover:bg-amber-400/20 md:text-5xl"
          data-testid="lobby-code"
        >
          {session.code}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="rounded-full bg-white/5 px-4 py-1 text-xs text-slate-200 ring-1 ring-white/15 hover:bg-white/10"
          >
            {copied ? 'Copiado ✓' : 'Copiar código'}
          </button>
          <button
            type="button"
            onClick={shareCode}
            className="rounded-full bg-white/5 px-4 py-1 text-xs text-slate-200 ring-1 ring-white/15 hover:bg-white/10"
          >
            Compartir
          </button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 lg:col-start-1">
        <div className="flex flex-col">
          <dt className="text-[11px] uppercase tracking-widest text-slate-400">
            Rondas
          </dt>
          <dd className="text-lg font-semibold">{session.totalRounds}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[11px] uppercase tracking-widest text-slate-400">
            Categoría
          </dt>
          <dd className="text-lg font-semibold">
            {categoryLabel(session.categorySlug)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-span-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
          Jugadores ({players.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {players.map((p) => {
            const isMe = p.id === myPlayerId;
            return (
              <li
                key={p.id}
                data-testid="lobby-player"
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  isMe
                    ? 'border-amber-400/40 bg-amber-400/5'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-base font-bold uppercase"
                >
                  {p.name.slice(0, 1)}
                </span>
                <span className="flex-1 truncate text-base font-medium">
                  {p.name}
                  {isMe && <span className="ml-2 text-xs text-amber-300">(tú)</span>}
                </span>
                {p.isHost && (
                  <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-200">
                    Host
                  </span>
                )}
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    p.connected ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                {isHost && !p.isHost && !isMe && (
                  <button
                    type="button"
                    onClick={() => handleKick(p.id, p.name)}
                    disabled={kickingId === p.id}
                    aria-label={`Expulsar a ${p.name}`}
                    title={`Expulsar a ${p.name}`}
                    data-testid={`lobby-kick-${p.id}`}
                    className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/15 text-red-200 ring-1 ring-red-400/30 transition hover:bg-red-500/25 disabled:opacity-40"
                  >
                    {kickingId === p.id ? '…' : '✕'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {isHost ? (
        <div className="flex flex-col gap-2 lg:col-start-1">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart || starting}
            className="rounded-xl bg-amber-400 px-4 py-3 text-base font-semibold text-slate-950 shadow-md transition hover:bg-amber-300 disabled:bg-slate-700/60 disabled:text-slate-300"
            data-testid="lobby-start-btn"
          >
            {starting
              ? 'Iniciando…'
              : canStart
                ? 'Iniciar partida'
                : `Necesitas ${MIN_PLAYERS_TO_START} jugadores conectados`}
          </button>
          {canCloseSession && (
            <button
              type="button"
              onClick={handleCloseSession}
              disabled={closing}
              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
              data-testid="lobby-close-btn"
            >
              {closing ? 'Cerrando…' : 'Cerrar sala'}
            </button>
          )}
          {startError && (
            <p role="alert" className="text-sm text-red-300">
              {startError}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-slate-400 lg:col-start-1">
          Esperando que el host inicie la partida…
        </p>
      )}
    </section>
  );
}
