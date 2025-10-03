import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { Canvas, CanvasRenderingContext2D } from 'react-native-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

// Game constants
const CANVAS_W = 390;
const CANVAS_H = 468;
const TOP_BOUND = 0;
const BOTTOM_BOUND = CANVAS_H;
const MAX_LIVES = 3;

// Seeded random number generator for consistent game generation
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

let gameRandom = new SeededRandom(12345);

// Game interfaces
interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  color: string;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  passed?: boolean;
  hasFire?: boolean;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

interface Heart {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface Coin {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

interface CoinEffect {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
}

interface LevelBoundary {
  x: number;
  level: number;
}

interface GameState {
  player: Player;
  platforms: Platform[];
  clouds: Cloud[];
  camera: { x: number; y: number };
  gravityBase: number;
  gravityCurrentDir: number;
  startTimeMs: number;
  gameSpeed: number;
  platformsPassed: number;
  lastPlatformX: number;
  lastCloudX: number;
  invulnerable: boolean;
  invulnerableTime: number;
  fireStateStartTime: number;
  level: number;
  checkpointFlag?: { x: number; y: number; width: number; height: number; passed: boolean };
  hearts: Heart[];
  nextHeartScore: number;
  coins: Coin[];
  coinEffects: CoinEffect[];
  levelBoundaries: LevelBoundary[];
}

export default function BaronApp() {
  const canvasRef = useRef<Canvas>(null);
  const gameStateRef = useRef<GameState>();
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef(0);
  const lastFireFrameTimeRef = useRef(0);
  const lastCoinFrameTimeRef = useRef(0);

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentFireFrame, setCurrentFireFrame] = useState(0);
  const [currentCoinFrame, setCurrentCoinFrame] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [isNewBestScore, setIsNewBestScore] = useState(false);

  // Audio setup
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Load score history from AsyncStorage
  const loadScoreHistory = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('gravity-mario-scores');
      if (saved) {
        const scores = JSON.parse(saved);
        setScoreHistory(scores);
        return scores;
      }
    } catch (error) {
      console.error('Failed to load score history:', error);
    }
    return [];
  }, []);

  // Save score to history
  const saveScoreToHistory = useCallback(async (newScore: number) => {
    try {
      const currentHistory = await loadScoreHistory();
      const updatedHistory = [...currentHistory, newScore].sort((a, b) => b - a).slice(0, 10);
      await AsyncStorage.setItem('gravity-mario-scores', JSON.stringify(updatedHistory));
      setScoreHistory(updatedHistory);

      const isNewBest = currentHistory.length === 0 || newScore > Math.max(...currentHistory);
      setIsNewBestScore(isNewBest);
      return isNewBest;
    } catch (error) {
      console.error('Failed to save score:', error);
      return false;
    }
  }, [loadScoreHistory]);

  // Get best score
  const getBestScore = useCallback(() => {
    return scoreHistory.length > 0 ? Math.max(...scoreHistory) : 0;
  }, [scoreHistory]);

  // Audio functions
  const playVortexSound = useCallback(async () => {
    try {
      // For React Native, we'll use a simple beep sound
      // You can replace this with actual audio files
      console.log('Vortex sound played');
    } catch (error) {
      console.error('Failed to play vortex sound:', error);
    }
  }, []);

  const playOuchSound = useCallback(async () => {
    try {
      console.log('Ouch sound played');
    } catch (error) {
      console.error('Failed to play ouch sound:', error);
    }
  }, []);

  const playHeartCollectSound = useCallback(async () => {
    try {
      console.log('Heart collect sound played');
    } catch (error) {
      console.error('Failed to play heart collect sound:', error);
    }
  }, []);

  const playCoinCollectSound = useCallback(async () => {
    try {
      console.log('Coin collect sound played');
    } catch (error) {
      console.error('Failed to play coin collect sound:', error);
    }
  }, []);

  const playGameOverMusic = useCallback(async () => {
    try {
      console.log('Game over music played');
    } catch (error) {
      console.error('Failed to play game over music:', error);
    }
  }, []);

  // Get background color based on level
  const getLevelBackgroundColor = useCallback((level: number) => {
    const colors = [
      '#1a237e', // Level 1: Blue
      '#4a148c', // Level 2: Purple
      '#1b5e20', // Level 3: Green
      '#bf360c', // Level 4: Red-orange
      '#3e2723', // Level 5: Brown
      '#263238', // Level 6: Blue-grey
      '#1a1a1a', // Level 7: Dark grey
      '#4a0e4e', // Level 8: Dark purple
    ];
    return colors[(level - 1) % colors.length];
  }, []);

  // Calculate fire probability based on score and elapsed time
  const getFireProbability = useCallback((score: number, elapsedSec: number) => {
    const clamp = (v: number, min = 0, max = 0.85) => Math.max(min, Math.min(max, v));
    const base = 0.1;
    const scoreTerm = Math.min(0.5, (score / 100) * 0.05);
    const timeTerm = Math.min(0.25, (elapsedSec / 60) * 0.05);
    const graceFactor = Math.max(0.5, Math.min(1, score / 50));
    return clamp((base + scoreTerm + timeTerm) * graceFactor);
  }, []);

  // Generate clouds
  const generateClouds = (startX: number, count = 12) => {
    const newClouds: Cloud[] = [];
    for (let i = 0; i < count; i++) {
      const baseScale = 1.6 + gameRandom.next() * 0.4;
      const bump = 1.2 + gameRandom.next() * 0.2;
      const sizeMultiplier = baseScale * bump;

      newClouds.push({
        x: startX + i * (50 + gameRandom.next() * 80),
        y: 20 + gameRandom.next() * 140,
        width: (40 + gameRandom.next() * 50) * sizeMultiplier,
        height: (25 + gameRandom.next() * 35) * sizeMultiplier,
        opacity: 0.25 + gameRandom.next() * 0.4,
      });
    }
    return newClouds;
  };

  // Generate platforms (dynamic difficulty)
  const generatePlatforms = (startX: number, count = 10) => {
    const newPlatforms: Platform[] = [];
    const runnerHeight = 32; // Character height (named "runner")
    const minSpacing = runnerHeight * 2;
    const platformHeight = 8;

    let currentX = startX;
    for (let i = 0; i < count; i++) {
      const currentScore = gameStateRef.current?.platformsPassed || 0;
      const elapsedSec = gameStateRef.current ? (Date.now() - gameStateRef.current.startTimeMs) / 1000 : 0;
      const p = Math.min(1, currentScore / 600);

      let baseWidth = 100 - 30 * p;
      if (currentScore < 50) {
        baseWidth += (50 - currentScore) * 0.4;
      }

      const r = gameRandom.next();
      const ratio = r < 0.34 ? 1 : r < 0.67 ? 2 : 3;

      const widthRaw = baseWidth * ratio;
      const width = Math.max(60, Math.min(300, widthRaw + (-6 + gameRandom.next() * 12)));

      const numZones = Math.max(
        1,
        Math.floor((BOTTOM_BOUND - TOP_BOUND - platformHeight) / (platformHeight + minSpacing)),
      );
      const zoneHeight = (BOTTOM_BOUND - TOP_BOUND - platformHeight) / numZones;
      const zone = Math.floor(gameRandom.next() * numZones);
      const yInZone = gameRandom.next() * Math.max(1, zoneHeight - platformHeight - minSpacing);
      const platformY = TOP_BOUND + zone * zoneHeight + yInZone + minSpacing / 2;

      // Make level 2 easier by reducing horizontal spacing
      const currentLevel = Math.floor((gameStateRef.current?.platformsPassed || 0) / 20) + 1;
      const level2Bonus = currentLevel === 2 ? 20 : 0; // Reduce spacing by 20px in level 2
      
      const overlapMin = 25 - 10 * p;
      const jitter = -5 + gameRandom.next() * 10;
      const step = Math.max(40, width - overlapMin + jitter - level2Bonus);

      newPlatforms.push({
        x: currentX,
        y: Math.max(TOP_BOUND + minSpacing / 2, Math.min(platformY, BOTTOM_BOUND - platformHeight - minSpacing / 2)),
        width,
        height: platformHeight,
        color: '#8B4513',
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(currentScore, elapsedSec),
      });

      currentX += step;
    }

    // Ensure minimum vertical spacing between overlapping platforms
    newPlatforms.sort((a, b) => a.x - b.x);
    for (let i = 1; i < newPlatforms.length; i++) {
      const current = newPlatforms[i];
      const previous = newPlatforms[i - 1];
      const minVSpace = runnerHeight; // Minimum vertical gap = runner height
      const pHeight = 8;
      const horizontalOverlap = !(current.x > previous.x + previous.width || previous.x > current.x + current.width);
      if (horizontalOverlap) {
        const verticalDistance = Math.abs(current.y - previous.y);
        if (verticalDistance < minVSpace) {
          if (current.y > previous.y) {
            current.y = Math.min(previous.y + minVSpace, BOTTOM_BOUND - pHeight - minVSpace / 2);
          } else {
            current.y = Math.max(previous.y - minVSpace, TOP_BOUND + minVSpace / 2);
          }
        }
      }
    }

    return newPlatforms;
  };

  // Generate coins on platforms
  const generateCoinsForPlatforms = (platforms: Platform[]) => {
    const coins: Coin[] = [];
    const COIN_W = 18;
    const COIN_H = 18;

    platforms.forEach((platform) => {
      // 78% chance to spawn a coin on each platform (60% * 1.3 = 78%)
      if (!platform.hasFire && gameRandom.next() < 0.78) {
        const coinX = platform.x + platform.width / 2 - COIN_W / 2 + (gameRandom.next() - 0.5) * (platform.width * 0.4);
        const coinY = platform.y - COIN_H - 8;

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        });
      }

      // 30% chance to spawn a coin under the platform
      if (gameRandom.next() < 0.3) {
        const coinX = platform.x + platform.width / 2 - COIN_W / 2 + (gameRandom.next() - 0.5) * (platform.width * 0.4);
        const coinY = platform.y + platform.height + 8; // Under the platform

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        });
      }
    });

    return coins;
  };

  // Flip helper (instant snap with natural curves)
  const doFlip = useCallback(() => {
    if (!gameStateRef.current || isGameOver || !isPlaying) return;
    const st = gameStateRef.current;

    // Instant gravity direction flip - no blending
    st.gravityCurrentDir = -st.gravityCurrentDir; // ±1 to ∓1
    st.gravityEffectiveDir = st.gravityCurrentDir;
    st.gravityBlending = false; // No blending needed for instant snap

    playVortexSound();
  }, [isGameOver, isPlaying, playVortexSound]);

  // Initialize game
  const initializeGame = useCallback(() => {
    gameRandom = new SeededRandom(12345);

    const pickRatioWidth = () => {
      const r = gameRandom.next();
      const ratio = r < 0.34 ? 1 : r < 0.67 ? 2 : 3;
      const baseWidth = 100;
      return Math.max(60, Math.min(300, baseWidth * ratio));
    };

    const startTimeMs = Date.now();
    const initialScore = 0;
    const initialElapsedSec = 0;

    const platforms: Platform[] = [
      { x: 0, y: 160, width: pickRatioWidth(), height: 8, color: '#8B4513', passed: false, hasFire: false },
      {
        x: 170,
        y: 100,
        width: pickRatioWidth(),
        height: 8,
        color: '#8B4513',
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 330,
        y: 240,
        width: pickRatioWidth() * 1.4,
        height: 8,
        color: '#8B4513',
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 480,
        y: 110,
        width: pickRatioWidth(),
        height: 8,
        color: '#8B4513',
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 640,
        y: 200,
        width: pickRatioWidth(),
        height: 8,
        color: '#8B4513',
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
    ];

    const coins = generateCoinsForPlatforms(platforms);
    const generatedPlatforms = generatePlatforms(800, 20);
    platforms.push(...generatedPlatforms);
    const clouds = generateClouds(0, 20);

    gameStateRef.current = {
      player: {
        x: 20,
        y: 140,
        width: 42,
        height: 42,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        color: '#FF0000',
      },
      platforms,
      clouds,
      camera: { x: 0, y: 0 },
      gravityBase: 0.42,
      gravityCurrentDir: 1,
      startTimeMs,
      gameSpeed: 1.8, // Start at 1.8 speed (1.5 * 1.2)
      platformsPassed: 0,
      lastPlatformX: platforms[platforms.length - 1].x + platforms[platforms.length - 1].width + 200,
      lastCloudX: 20 * 130,
      invulnerable: false,
      invulnerableTime: 0,
      fireStateStartTime: 0,
      level: 1,
      checkpointFlag: undefined,
      hearts: [],
      nextHeartScore: 25,
      coins,
      coinEffects: [],
      levelBoundaries: [],
    };
    setLevel(1);
    setScore(0);
    setLives(3);
    setIsGameOver(false);
  }, [getFireProbability]);

  // Start Again
  const startAgain = useCallback(() => {
    setIsNewBestScore(false);
    initializeGame();
    setIsPlaying(true);
  }, [initializeGame]);

  // Touch controls for mobile
  const handleTouchStart = useCallback(() => {
    if (isGameOver) {
      startAgain();
    } else if (isPlaying) {
      doFlip();
    }
  }, [isGameOver, isPlaying, doFlip, startAgain]);

  // Draw a coin with 4-frame horizontal flip animation (200ms per frame)
  const drawCoin = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      frame: number,
    ) => {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);

      // 4 frames: 0(front) -> 1(tilt) -> 2(edge) -> 3(tilt)
      const frameToScaleX = [1, 0.5, 0.1, 0.5];
      const sx = frameToScaleX[(frame % 4 + 4) % 4];
      
      // Special rendering for edge state (frame 2) - Figma variant
      if (frame === 2) {
        // Draw edge view with subtle 3D effect (darker right edge)
        const barWidth = Math.max(1, w * 0.05); // Very thin bar
        const rightEdgeWidth = Math.max(0.5, barWidth * 0.3);
        
        // Main bar (golden-brown)
        ctx.fillStyle = '#daa520';
        ctx.fillRect(-barWidth / 2, -h / 2, barWidth, h);
        
        // Right edge (darker for 3D effect)
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(barWidth / 2 - rightEdgeWidth, -h / 2, rightEdgeWidth, h);
        
        // Left highlight (lighter)
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-barWidth / 2, -h / 2, Math.max(0.5, barWidth * 0.2), h);
      } else {
        // Normal coin rendering for other frames
        ctx.scale(sx, 1);

        // Outer coin
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1.5 as any;
        ctx.beginPath();
        ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner disc only if visible enough
        if (sx > 0.15) {
          ctx.fillStyle = '#daa520';
          ctx.beginPath();
          ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dollar sign only when mostly facing front
        if (sx > 0.4) {
          ctx.fillStyle = '#8b4513';
          ctx.textAlign = 'center' as any;
          ctx.textBaseline = 'middle' as any;
          // Font handling varies in react-native-canvas; keep simple glyph
          // Draw a simple vertical bar to hint the $ when fonts are unavailable
          ctx.fillRect(-1, -6, 2, 12);
        }
      }

      ctx.restore();
    },
    [],
  );

  // Minimal render loop to animate coins on mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0 as any;
    let cancelled = false;

    const setupAndRun = async () => {
      // react-native-canvas getContext may be Promise-based
      const maybeCtx: any = (canvas as any).getContext('2d');
      const ctx: CanvasRenderingContext2D =
        typeof maybeCtx?.then === 'function' ? await maybeCtx : (maybeCtx as CanvasRenderingContext2D);

      const render = () => {
        if (cancelled) return;
        const st = gameStateRef.current;
        if (!st) {
          raf = requestAnimationFrame(render);
          return;
        }

        // Clear and background
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = getLevelBackgroundColor(level);
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Advance coin frame every 200ms
        const now = Date.now();
        if (now - lastCoinFrameTimeRef.current > 200) {
          setCurrentCoinFrame((prev) => (prev + 1) % 4);
          lastCoinFrameTimeRef.current = now;
        }

        // Draw coins (relative to camera)
        const camX = st.camera.x;
        const camY = st.camera.y;
        st.coins.forEach((coin) => {
          if (coin.collected) return;
          const cx = coin.x - camX;
          const cy = coin.y - camY;
          if (cx + coin.width > 0 && cx < CANVAS_W) {
            // Per-coin phase to avoid synchronous flipping (stable hash from world pos)
            const phase = (Math.floor(coin.x * 0.07 + coin.y * 0.11) & 3); // 0..3
            const frame = (currentCoinFrame + phase) % 4;
            drawCoin(ctx, cx, cy, coin.width, coin.height, frame);
          }
        });

        raf = requestAnimationFrame(render);
      };

      render();
    };

    setupAndRun();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [level, drawCoin, currentCoinFrame]);

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={styles.heartsContainer}>
          {[1, 2, 3].map((heartIndex) => (
            <Svg
              key={heartIndex}
              width={22}
              height={22}
              viewBox="0 0 24 24"
            >
              <Defs>
                <LinearGradient id={`heartGradient${heartIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={heartIndex <= lives ? "#ff6b6b" : "#d1d5db"} />
                  <Stop offset="100%" stopColor={heartIndex <= lives ? "#c92a2a" : "#9ca3af"} />
                </LinearGradient>
              </Defs>
              <Path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={heartIndex <= lives ? `url(#heartGradient${heartIndex})` : "rgba(255, 255, 255, 0.4)"}
                stroke={heartIndex <= lives ? "none" : "white"}
                strokeWidth={heartIndex <= lives ? 0 : 1.5}
              />
            </Svg>
          ))}
        </View>
        <Text style={styles.scoreText}>Score: {score}</Text>
      </View>

      {/* Game Canvas */}
      <View style={styles.gameContainer}>
        <Canvas
          ref={canvasRef}
          style={styles.canvas}
          onTouchStart={handleTouchStart}
        />
        
        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverPanel}>
              <Text style={styles.gameOverTitle}>GAME OVER</Text>
              <Text style={styles.gameOverScore}>Score: {score}</Text>
              {isNewBestScore && (
                <Text style={styles.newBestScore}>🎉 NEW BEST SCORE! 🎉</Text>
              )}
              <TouchableOpacity style={styles.startAgainButton} onPress={startAgain}>
                <Text style={styles.startAgainText}>START AGAIN</Text>
              </TouchableOpacity>
              {getBestScore() > 0 && (
                <Text style={styles.bestScoreText}>Best Score: {getBestScore()}</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Flip Button */}
      <TouchableOpacity
        style={styles.flipButton}
        onPress={handleTouchStart}
        disabled={!isPlaying || isGameOver}
      >
        <Text style={styles.flipButtonText}>FLIP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  header: {
    width: 390,
    backgroundColor: '#064e3b',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  levelText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  heartsContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  scoreText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  gameContainer: {
    position: 'relative',
  },
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverPanel: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  gameOverScore: {
    fontSize: 20,
    color: '#6b7280',
    marginBottom: 24,
  },
  newBestScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d97706',
    marginBottom: 24,
    textAlign: 'center',
  },
  startAgainButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
  },
  startAgainText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bestScoreText: {
    fontSize: 16,
    color: '#6b7280',
  },
  flipButton: {
    width: 390,
    height: 56,
    backgroundColor: '#4338ca',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
  },
  flipButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
