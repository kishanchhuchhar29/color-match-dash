
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Color {
  name: string;
  value: string;
  shadow: string;
}

const ALL_COLORS: Color[] = [
  { name: "Red", value: "#ff3b30", shadow: "#ff3b3080" },
  { name: "Blue", value: "#007aff", shadow: "#007aff80" },
  { name: "Yellow", value: "#ffcc00", shadow: "#ffcc0080" },
  { name: "Green", value: "#34c759", shadow: "#34c75980" },
  { name: "Purple", value: "#af52de", shadow: "#af52de80" },
];

interface Ball {
  x: number;
  y: number;
  colorIndex: number;
  radius: number;
  bounceOffset: number;
  bounceSpeed: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  ball: Ball;
  obstacles: Obstacle[];
  gameSpeed: number;
  obstacleTimer: number;
  gameRunning: boolean;
  gameStarted: boolean;
  particles: Particle[];
}

export default function ColorMatchRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState>({
    ball: {
      x: 150,
      y: 500,
      colorIndex: 0,
      radius: 20,
      bounceOffset: 0,
      bounceSpeed: 0.15,
    },
    obstacles: [],
    gameSpeed: 2,
    obstacleTimer: 0,
    gameRunning: true,
    gameStarted: false,
    particles: [],
  });

  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupText, setPopupText] = useState<string>("");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);

  // Get available colors for current level
  const getCurrentLevelColors = useCallback((currentLevel: number): Color[] => {
    return ALL_COLORS.slice(0, Math.min(currentLevel + 1, 5));
  }, []);

  // Handle color change
  const changeColor = useCallback(() => {
    if (!gameStateRef.current.gameRunning) return;

    const colors = getCurrentLevelColors(level);
    gameStateRef.current.ball.colorIndex =
      (gameStateRef.current.ball.colorIndex + 1) % colors.length;
  }, [level, getCurrentLevelColors]);

  // Create particle effect
  const createParticles = useCallback(
    (x: number, y: number, color: string, isSuccess: boolean) => {
      const particleCount = isSuccess ? 15 : 8;
      for (let i = 0; i < particleCount; i++) {
        gameStateRef.current.particles.push({
          x: x + (Math.random() - 0.5) * 40,
          y: y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * (isSuccess ? 8 : 4),
          vy: (Math.random() - 0.5) * (isSuccess ? 8 : 4) - 2,
          life: isSuccess ? 60 : 30,
          color: isSuccess ? color : "#ff4444",
        });
      }
    },
    []
  );

  // Handle game over
  const handleGameOver = useCallback(() => {
    gameStateRef.current.gameRunning = false;
    const newHighScore = Math.max(score, highScore);
    setHighScore(newHighScore);
    setPopupText(
      "Game Over!\n" +
      `Score: ${score}\n` +
      `High Score: ${newHighScore}\n` +
      `Level: ${level}`
    );
    setShowPopup(true);
  }, [score, level, highScore]);

  // Draw UI function
  const drawUI = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      colors: Color[]
    ) => {
      // Title
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("COLOR MATCH RUNNER", width / 2, 30);
      ctx.restore();

      // Score
      ctx.save();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`${score}`, 20, 65);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.fillText("SCORE", 20, 80);
      ctx.restore();

      // Level
      ctx.save();
      ctx.fillStyle = "#8b5cf6";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`LV ${level}`, width - 20, 60);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.fillText(`${colors.length} COLORS`, width - 20, 75);
      ctx.restore();

      // Speed indicator
      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "right";
      ctx.fillText(
        `${gameStateRef.current.gameSpeed.toFixed(1)}x`,
        width - 20,
        95
      );
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px Arial";
      ctx.fillText("SPEED", width - 20, 105);
      ctx.restore();

      // Current color indicator
      ctx.save();
      ctx.fillStyle = colors[gameStateRef.current.ball.colorIndex].value;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(30, height - 60, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      ctx.fillText("YOUR COLOR", 55, height - 55);
      ctx.restore();

      // Controls
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.8;
      ctx.fillText(
        "TAP OR PRESS SPACE TO CHANGE COLOR",
        width / 2,
        height - 20
      );
      ctx.restore();

      // High score
      if (highScore > 0) {
        ctx.save();
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`HIGH: ${highScore}`, width / 2, height - 40);
        ctx.restore();
      }
    },
    [score, level, highScore]
  );

  // Main game loop
  useEffect(() => {
    if (!canvasRef.current || !gameStarted) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const colors = getCurrentLevelColors(level);

    const animate = () => {
      if (!gameStateRef.current.gameRunning) return;

      const state = gameStateRef.current;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Update game speed based on score (slower increase for reduced difficulty)
      const baseSpeed = 2;
      const speedIncrease = Math.floor(score / 100) * 0.25;
      state.gameSpeed = baseSpeed + speedIncrease;

      // Update level based on score (for UI consistency, but level up handled in scoring)
      const newLevel = Math.min(Math.floor(score / 200) + 1, 5);
      if (newLevel !== level) {
        setLevel(newLevel);
      }

      // Ball bouncing animation
      state.ball.bounceOffset += state.ball.bounceSpeed;
      const bounceHeight = Math.sin(state.ball.bounceOffset) * 5;

      // Gate dimensions
      const gateWidth = 140;
      const gateHeight = 80;
      const centerX = canvasWidth / 2 - gateWidth / 2;
      const pillarWidth = 25;

      // Generate obstacles
      state.obstacleTimer++;
      const obstacleFrequency = Math.max(100 - Math.floor(score / 200), 50);
      if (state.obstacleTimer >= obstacleFrequency) {
        state.obstacles.push({
          x: centerX,
          y: -gateHeight,
          width: gateWidth,
          height: gateHeight,
          colorIndex: Math.floor(Math.random() * colors.length),
          passed: false,
        });
        state.obstacleTimer = 0;
      }

      // Update obstacles
      state.obstacles = state.obstacles.filter((obstacle) => {
        obstacle.y += state.gameSpeed;

        // Check collision
        const ballLeft = state.ball.x - state.ball.radius;
        const ballRight = state.ball.x + state.ball.radius;
        const ballTop = state.ball.y - state.ball.radius + bounceHeight;
        const ballBottom = state.ball.y + state.ball.radius + bounceHeight;

        const obstacleLeft = obstacle.x;
        const obstacleRight = obstacle.x + obstacle.width;
        const obstacleTop = obstacle.y;
        const obstacleBottom = obstacle.y + obstacle.height;

        const collision =
          ballRight > obstacleLeft &&
          ballLeft < obstacleRight &&
          ballBottom > obstacleTop &&
          ballTop < obstacleBottom;

        if (collision && !obstacle.passed) {
          if (state.ball.colorIndex === obstacle.colorIndex) {
            // Correct match
            setScore((prevScore) => {
              const newScore = prevScore + 10;
              const newLevel = Math.min(Math.floor(newScore / 200) + 1, 5);
              if (newLevel > level) {
                setPopupText(
                  "Level " + level + " Complete!\n" +
                  `Score: ${newScore}\n` +
                  `Now for Level ${newLevel}: ${Math.min(newLevel + 1, 5)} Colors\n` +
                  "and speed increased!"
                );
                setShowPopup(true);
                gameStateRef.current.gameRunning = false;
                setLevel(newLevel);
              }
              return newScore;
            });
            createParticles(
              obstacle.x + obstacle.width / 2,
              obstacle.y + obstacle.height / 2,
              colors[obstacle.colorIndex].value,
              true
            );
            obstacle.passed = true;
          } else {
            // Wrong match - game over
            createParticles(state.ball.x, state.ball.y, "#ff4444", false);
            handleGameOver();
            return false;
          }
        }

        // Mark as passed if ball is above obstacle
        if (
          !obstacle.passed &&
          obstacle.y > state.ball.y + state.ball.radius + 20
        ) {
          obstacle.passed = true;
        }

        return obstacle.y < canvasHeight + 50;
      });

      // Update particles
      state.particles = state.particles.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.3; // gravity
        particle.life--;
        return particle.life > 0;
      });

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, "#0f172a");
      gradient.addColorStop(0.5, "#1e293b");
      gradient.addColorStop(1, "#334155");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw moving background lines
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 10; i++) {
        const y = ((Date.now() * 0.1 + i * 60) % (canvasHeight + 60)) - 60;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw obstacles (improved Gate UI with wall-like line)
      state.obstacles.forEach((obstacle) => {
        ctx.save();
        const gateColor = colors[obstacle.colorIndex];

        // Left pillar
        ctx.fillStyle = gateColor.value;
        ctx.shadowColor = gateColor.shadow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(obstacle.x, obstacle.y, pillarWidth, obstacle.height, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right pillar
        ctx.fillStyle = gateColor.value;
        ctx.beginPath();
        ctx.roundRect(
          obstacle.x + obstacle.width - pillarWidth,
          obstacle.y,
          pillarWidth,
          obstacle.height,
          8
        );
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top bar
        ctx.fillStyle = gateColor.value;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, 20, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Wall-like horizontal line connecting pillars
        ctx.strokeStyle = gateColor.value;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + pillarWidth, obstacle.y + obstacle.height / 2);
        ctx.lineTo(
          obstacle.x + obstacle.width - pillarWidth,
          obstacle.y + obstacle.height / 2
        );
        ctx.stroke();

        // Gate text with shadow
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 5;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "GATE",
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2
        );

        ctx.restore();
      });

      // Draw ball with bouncing effect
      ctx.save();
      const ballY = state.ball.y + bounceHeight;

      // Ball shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(
        state.ball.x,
        state.ball.y + state.ball.radius + 5,
        state.ball.radius * 0.8,
        5,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Ball glow
      ctx.globalAlpha = 1;
      ctx.shadowColor = colors[state.ball.colorIndex].shadow;
      ctx.shadowBlur = 25;

      // Ball body
      ctx.fillStyle = colors[state.ball.colorIndex].value;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(state.ball.x, ballY, state.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ball highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(
        state.ball.x - 5,
        ballY - 5,
        state.ball.radius * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      // Draw particles
      state.particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.life / 60;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw UI
      drawUI(ctx, canvasWidth, canvasHeight, colors);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    gameStarted,
    level,
    score,
    highScore,
    getCurrentLevelColors,
    createParticles,
    handleGameOver,
    changeColor,
    drawUI,
  ]);

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || !gameStateRef.current.gameRunning) return;

      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        e.preventDefault();
        changeColor();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      if (!gameStarted || !gameStateRef.current.gameRunning) return;
      e.preventDefault();
      changeColor();
    };

    const handleClick = () => {
      if (!gameStarted || !gameStateRef.current.gameRunning) return;
      changeColor();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("touchstart", handleTouch);
    if (canvasRef.current) {
      canvasRef.current.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("touchstart", handleTouch);
      if (canvasRef.current) {
        canvasRef.current.removeEventListener("click", handleClick);
      }
    };
  }, [gameStarted, changeColor]);

  // Handle popup actions
  const handlePopupAction = useCallback(() => {
    setShowPopup(false);
    if (popupText.startsWith("Game Over")) {
      // Game over reset, but preserve level
      setScore(0);
      // Do not reset level: keep current level
      gameStateRef.current.obstacles = [];
      gameStateRef.current.particles = [];
      gameStateRef.current.ball.colorIndex = 0;
      gameStateRef.current.gameSpeed = 2 + Math.floor((level - 1) * 100 / 100) * 0.25; // Set speed based on current level
      gameStateRef.current.obstacleTimer = 0;
      gameStateRef.current.gameRunning = true;
      gameStateRef.current.gameStarted = true;
    } else {
      // Level up resume
      gameStateRef.current.gameRunning = true;
      gameStateRef.current.gameStarted = true;
      gameStateRef.current.obstacles = [];
      gameStateRef.current.particles = [];
      gameStateRef.current.obstacleTimer = 0;
    }
    // Ensure animation restarts
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      const colors = getCurrentLevelColors(level); // Define colors here
      const animate = () => {
        if (!gameStateRef.current.gameRunning) return;
        const state = gameStateRef.current;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Update game speed
        const baseSpeed = 2;
        const speedIncrease = Math.floor(score / 100) * 0.25;
        state.gameSpeed = baseSpeed + speedIncrease;

        // Ball bouncing animation
        state.ball.bounceOffset += state.ball.bounceSpeed;
        const bounceHeight = Math.sin(state.ball.bounceOffset) * 5;

        // Gate dimensions
        const gateWidth = 140;
        const gateHeight = 80;
        const centerX = canvasWidth / 2 - gateWidth / 2;
        const pillarWidth = 25;

        // Generate obstacles
        state.obstacleTimer++;
        const obstacleFrequency = Math.max(100 - Math.floor(score / 200), 50);
        if (state.obstacleTimer >= obstacleFrequency) {
          state.obstacles.push({
            x: centerX,
            y: -gateHeight,
            width: gateWidth,
            height: gateHeight,
            colorIndex: Math.floor(Math.random() * colors.length),
            passed: false,
          });
          state.obstacleTimer = 0;
        }

        // Update obstacles
        state.obstacles = state.obstacles.filter((obstacle) => {
          obstacle.y += state.gameSpeed;

          // Check collision
          const ballLeft = state.ball.x - state.ball.radius;
          const ballRight = state.ball.x + state.ball.radius;
          const ballTop = state.ball.y - state.ball.radius + bounceHeight;
          const ballBottom = state.ball.y + state.ball.radius + bounceHeight;

          const obstacleLeft = obstacle.x;
          const obstacleRight = obstacle.x + obstacle.width;
          const obstacleTop = obstacle.y;
          const obstacleBottom = obstacle.y + obstacle.height;

          const collision =
            ballRight > obstacleLeft &&
            ballLeft < obstacleRight &&
            ballBottom > obstacleTop &&
            ballTop < obstacleBottom;

          if (collision && !obstacle.passed) {
            if (state.ball.colorIndex === obstacle.colorIndex) {
              setScore((prevScore) => {
                const newScore = prevScore + 10;
                const newLevel = Math.min(Math.floor(newScore / 200) + 1, 5);
                if (newLevel > level) {
                  setPopupText(
                    "Level " + level + " Complete!\n" +
                    `Score: ${newScore}\n` +
                    `Now for Level ${newLevel}: ${Math.min(newLevel + 1, 5)} Colors\n` +
                    "and speed increased!"
                  );
                  setShowPopup(true);
                  gameStateRef.current.gameRunning = false;
                  setLevel(newLevel);
                }
                return newScore;
              });
              createParticles(
                obstacle.x + obstacle.width / 2,
                obstacle.y + obstacle.height / 2,
                colors[obstacle.colorIndex].value,
                true
              );
              obstacle.passed = true;
            } else {
              createParticles(state.ball.x, state.ball.y, "#ff4444", false);
              handleGameOver();
              return false;
            }
          }

          if (
            !obstacle.passed &&
            obstacle.y > state.ball.y + state.ball.radius + 20
          ) {
            obstacle.passed = true;
          }

          return obstacle.y < canvasHeight + 50;
        });

        // Update particles
        state.particles = state.particles.filter((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.3;
          particle.life--;
          return particle.life > 0;
        });

        // Clear canvas
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, "#0f172a");
        gradient.addColorStop(0.5, "#1e293b");
        gradient.addColorStop(1, "#334155");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw background lines
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 10; i++) {
          const y = ((Date.now() * 0.1 + i * 60) % (canvasHeight + 60)) - 60;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw obstacles
        state.obstacles.forEach((obstacle) => {
          ctx.save();
          const gateColor = colors[obstacle.colorIndex];

          // Left pillar
          ctx.fillStyle = gateColor.value;
          ctx.shadowColor = gateColor.shadow;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(obstacle.x, obstacle.y, pillarWidth, obstacle.height, 8);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Right pillar
          ctx.fillStyle = gateColor.value;
          ctx.beginPath();
          ctx.roundRect(
            obstacle.x + obstacle.width - pillarWidth,
            obstacle.y,
            pillarWidth,
            obstacle.height,
            8
          );
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Top bar
          ctx.fillStyle = gateColor.value;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.roundRect(obstacle.x, obstacle.y, obstacle.width, 20, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Wall-like horizontal line
          ctx.strokeStyle = gateColor.value;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(obstacle.x + pillarWidth, obstacle.y + obstacle.height / 2);
          ctx.lineTo(
            obstacle.x + obstacle.width - pillarWidth,
            obstacle.y + obstacle.height / 2
          );
          ctx.stroke();

          // Gate text
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 5;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "GATE",
            obstacle.x + obstacle.width / 2,
            obstacle.y + obstacle.height / 2
          );

          ctx.restore();
        });

        // Draw ball
        ctx.save();
        const ballY = state.ball.y + bounceHeight;

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(
          state.ball.x,
          state.ball.y + state.ball.radius + 5,
          state.ball.radius * 0.8,
          5,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowColor = colors[state.ball.colorIndex].shadow;
        ctx.shadowBlur = 25;

        ctx.fillStyle = colors[state.ball.colorIndex].value;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(state.ball.x, ballY, state.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(
          state.ball.x - 5,
          ballY - 5,
          state.ball.radius * 0.3,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.restore();

        // Draw particles
        state.particles.forEach((particle) => {
          ctx.save();
          ctx.globalAlpha = particle.life / 60;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Draw UI
        drawUI(ctx, canvasWidth, canvasHeight, colors);

        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
  }, [popupText, score, level, getCurrentLevelColors, handleGameOver, createParticles, drawUI]);

  const startGame = () => {
    setGameStarted(true);
    gameStateRef.current.gameStarted = true;
    gameStateRef.current.gameRunning = true;
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-4">
        <div className="text-center p-8 bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl max-w-md border border-slate-700">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Color Match
            </h1>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">
              Runner
            </h2>
          </div>

          <div className="space-y-4 text-left mb-8 text-sm">
            <div className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0"></div>
              <span>Ball runs automatically like Chrome Dino</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex-shrink-0"></div>
              <span>Gates fall from above - match colors to survive</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
              <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-red-500 rounded-full flex-shrink-0"></div>
              <span>Score 200+ for 3rd color, 400+ for 4th, 600+ for 5th</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
              <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex-shrink-0"></div>
              <span>Speed increases gradually as you progress</span>
            </div>
          </div>

          <div className="mb-6 p-3 bg-slate-700/30 rounded-lg">
            <p className="text-yellow-400 font-semibold mb-1">Controls:</p>
            <p className="text-sm">TAP, CLICK, or SPACE to change ball color</p>
          </div>

          {highScore > 0 && (
            <div className="mb-6 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <p className="text-green-400 font-semibold">
                High Score: {highScore}
              </p>
            </div>
          )}

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg text-lg"
          >
            🚀 Start Running!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={320}
          height={600}
          className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 touch-none"
          style={{ touchAction: "none" }}
        />

        <div className="mt-2 text-center">
          <p className="text-slate-400 text-sm">
            Tap/Click or SPACE to change color
          </p>
          <p className="text-slate-300 text-xs mt-1">SPACE on keyboard</p>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 text-center shadow-2xl transform animate-pulse border border-slate-700 max-w-sm">
            <div className="text-2xl font-bold text-white mb-4 whitespace-pre-line">
              {popupText}
            </div>
            <button
              onClick={handlePopupAction}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
              autoFocus
            >
              {popupText.startsWith("Game Over") ? "🎮 Try Again" : "▶️ Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}