'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { GameScene } from "@/components/GameScene";

export default function Home() {
  const [lane, setLane] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem("skyway-highscore");
    if (!stored) return 0;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    localStorage.setItem("skyway-highscore", String(highScore));
  }, [highScore]);

  const clampLane = useCallback((value: number) => {
    return Math.min(2, Math.max(0, value));
  }, []);

  const handleMoveLeft = useCallback(() => {
    setLane((prev) => clampLane(prev - 1));
  }, [clampLane]);

  const handleMoveRight = useCallback(() => {
    setLane((prev) => clampLane(prev + 1));
  }, [clampLane]);

  const handleScoreChange = useCallback((value: number) => {
    setScore(value);
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setIsRunning(false);
      setIsGameOver(true);
      setHighScore((prev) => Math.max(prev, finalScore));
    },
    [],
  );

  const startGame = useCallback(() => {
    setLane(1);
    setScore(0);
    setIsGameOver(false);
    setIsRunning(true);
    setResetToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!isRunning) {
          startGame();
        }
        return;
      }

      if (!isRunning) return;

      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        event.preventDefault();
        handleMoveLeft();
      } else if (
        event.key === "ArrowRight" ||
        event.key === "d" ||
        event.key === "D"
      ) {
        event.preventDefault();
        handleMoveRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMoveLeft, handleMoveRight, isRunning, startGame]);

  const laneLabel = useMemo(() => {
    if (lane === 0) return "Left lane";
    if (lane === 2) return "Right lane";
    return "Center lane";
  }, [lane]);

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="flex h-full flex-1">
        <GameScene
          isRunning={isRunning}
          lane={lane}
          resetToken={resetToken}
          onScoreChange={handleScoreChange}
          onGameOver={handleGameOver}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex items-center justify-between px-6 pt-6 text-slate-100">
          <div>
            <h1 className="text-lg font-semibold uppercase tracking-[0.4em] text-sky-300 sm:text-xl">
              Skyway Runner
            </h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              Shift lanes to dodge the neon barriers.
            </p>
          </div>
          <div className="flex flex-col items-end text-right text-sm sm:text-base">
            <span className="text-xs uppercase text-slate-400">High Score</span>
            <span className="text-2xl font-semibold text-sky-100">
              {highScore.toString().padStart(5, "0")}
            </span>
          </div>
        </header>

        <main className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-end gap-6 pb-16">
          <div className="pointer-events-auto inline-flex items-center gap-4 rounded-full border border-slate-700/80 bg-slate-900/80 px-6 py-3 text-slate-200 backdrop-blur">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Score
            </span>
            <span className="text-3xl font-semibold text-sky-300">
              {score.toString().padStart(5, "0")}
            </span>
          </div>

          <div className="pointer-events-auto flex flex-col items-center gap-3 text-center text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {laneLabel}
            </p>
            <p className="max-w-sm text-sm text-slate-300 sm:text-base">
              Tap or use <span className="font-semibold text-sky-200">A / D</span>{" "}
              or <span className="font-semibold text-sky-200">← / →</span> to
              switch lanes. Avoid incoming barriers to keep your streak alive.
            </p>
          </div>

          {isGameOver && !isRunning && (
            <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-6 py-4 text-center text-sky-100 backdrop-blur">
              <span className="text-xs uppercase tracking-[0.4em] text-sky-300">
                Impact Detected
              </span>
              <p className="text-lg font-semibold">
                Final Score {score.toString().padStart(5, "0")}
              </p>
              <p className="text-xs text-sky-200/80">
                Press Start or hit Space to launch a new run.
              </p>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-4">
            <button
              type="button"
              className="rounded-full border border-sky-500/70 bg-sky-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:bg-sky-500/40"
              onClick={handleMoveLeft}
            >
              Move Left
            </button>
            <button
              type="button"
              className="rounded-full border border-sky-500/70 bg-sky-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:bg-sky-500/40"
              onClick={isRunning ? handleMoveRight : startGame}
            >
              {isRunning ? "Move Right" : isGameOver ? "Play Again" : "Start"}
            </button>
          </div>

          {!isRunning && (
            <button
              type="button"
              onClick={startGame}
              className="pointer-events-auto rounded-full bg-sky-500 px-10 py-4 text-xs font-semibold uppercase tracking-[0.4em] text-slate-950 shadow-lg shadow-sky-500/50 transition hover:bg-sky-400"
            >
              {isGameOver ? "Restart Run" : "Start Run"}
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
