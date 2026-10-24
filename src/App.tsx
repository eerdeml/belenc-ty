/**
 * Main Application Component for Coastal Highway Racing.
 * Integrates Three.js canvas container, touch swipes, keyboard listeners, and Game HUD.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameStats, GameStatus } from './game/gameEngine';
import { GameHUD } from './components/GameHUD';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    speedKmH: 100,
    coins: 0,
    distanceMeters: 0,
    highScore: 0,
  });

  // Initialize Three.js engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
      onStatusChange: (newStatus) => {
        setGameStatus(newStatus);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Lane Change Handler
  const handleLaneChange = useCallback((direction: -1 | 1) => {
    engineRef.current?.changeLane(direction);
  }, []);

  // Game Control Handlers
  const handleStartGame = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleRestartGame = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  // Touch Swipe Gesture Detection for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    // Minimum swipe threshold (40px) and ensure horizontal intent
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
      if (diffX < 0) {
        handleLaneChange(-1); // Swipe left
      } else {
        handleLaneChange(1); // Swipe right
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#0a1120] select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Isolated Three.js Canvas Mount */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full z-0 overflow-hidden"
      />

      {/* Game HUD Overlay */}
      <GameHUD
        status={gameStatus}
        stats={stats}
        onLaneChange={handleLaneChange}
        onStartGame={handleStartGame}
        onTogglePause={handleTogglePause}
        onRestartGame={handleRestartGame}
      />
    </div>
  );
}
