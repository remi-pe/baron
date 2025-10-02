import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { Canvas, CanvasRenderingContext2D } from 'react-native-canvas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

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

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentFireFrame, setCurrentFireFrame] = useState(0);
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
    const characterHeight = 32;
    const minSpacing = characterHeight * 2;
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

      const overlapMin = 25 - 10 * p;
      const jitter = -5 + gameRandom.next() * 10;
      const step = Math.max(40, width - overlapMin + jitter);

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

    return newPlatforms;
  };

  // Generate coins on platforms
  const generateCoinsForPlatforms = (platforms: Platform[]) => {
    const coins: Coin[] = [];
    const COIN_W = 18;
    const COIN_H = 18;

    platforms.forEach((platform) => {
      if (!platform.hasFire && gameRandom.next() < 0.6) {
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
      gameSpeed: 1.5,
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

  // Game loop and rendering logic would continue here...
  // (This is a simplified version - the full implementation would include all the game logic)

  return (
    <View style={styles.container}>
      {/* Game Header */}
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={styles.heartsContainer}>
          {[1, 2, 3].map((heartIndex) => (
            <Text
              key={heartIndex}
              style={[
                styles.heart,
                { color: heartIndex <= lives ? '#ef4444' : '#9ca3af' }
              ]}
            >
              {heartIndex <= lives ? '♥' : '♡'}
            </Text>
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
    paddingVertical: 10,
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
    gap: 8,
  },
  heart: {
    fontSize: 24,
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
