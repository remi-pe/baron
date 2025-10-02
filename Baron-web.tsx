"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

// Seeded random number generator for consistent game generation
class SeededRandom {
  private seed: number
  constructor(seed: number) {
    this.seed = seed
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

let gameRandom = new SeededRandom(12345) // Fixed seed for consistent game generation

const CANVAS_W = 390
const CANVAS_H = 468
const TOP_BOUND = 0
const BOTTOM_BOUND = CANVAS_H
const MAX_LIVES = 3

interface Player {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  onGround: boolean
  color: string
}

interface Platform {
  x: number
  y: number
  width: number
  height: number
  color: string
  passed?: boolean
  hasFire?: boolean
}

interface Cloud {
  x: number
  y: number
  width: number
  height: number
  opacity: number
}

interface Heart {
  x: number
  y: number
  width: number
  height: number
  collected: boolean
}

interface Coin {
  x: number
  y: number
  width: number
  height: number
  collected: boolean
}

interface CoinEffect {
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
  duration: number
}

interface LevelBoundary {
  x: number
  level: number
}

interface GameState {
  player: Player
  platforms: Platform[]
  clouds: Cloud[]
  camera: { x: number; y: number }

  // Gravity (instant flip)
  gravityBase: number // g0
  gravityCurrentDir: number // ±1 (1 for down, -1 for up)

  // Runtime
  startTimeMs: number

  gameSpeed: number
  platformsPassed: number
  lastPlatformX: number
  lastCloudX: number
  invulnerable: boolean
  invulnerableTime: number
  fireStateStartTime: number
  level: number
  checkpointFlag?: { x: number; y: number; width: number; height: number; passed: boolean }

  // Collectibles
  hearts: Heart[]
  nextHeartScore: number
  coins: Coin[]
  coinEffects: CoinEffect[]

  // Level boundaries
  levelBoundaries: LevelBoundary[]
}

function BrandHeader() {
  return (
    <div className="w-[390px] mb-3 flex justify-center">
      <img src="/simple-branding.svg" alt="Branding" className="h-12 w-auto" />
    </div>
  )
}

export default function BaronWeb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState>()
  const keysRef = useRef<Set<string>>(new Set())
  const animationFrameRef = useRef<number>()
  const characterImageRef = useRef<HTMLImageElement[] | null>(null)
  const fireStateImageRef = useRef<HTMLImageElement[] | null>(null)
  const cloudImageRef = useRef<HTMLImageElement>()
  const fireImageRef = useRef<HTMLImageElement[]>()
  const lastFrameTimeRef = useRef(0)
  const lastFireFrameTimeRef = useRef(0)
  const lastCoinFrameTimeRef = useRef(0)

  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [currentFireFrame, setCurrentFireFrame] = useState(0)
  const [currentCoinFrame, setCurrentCoinFrame] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [scoreHistory, setScoreHistory] = useState<number[]>([])
  const [isNewBestScore, setIsNewBestScore] = useState(false)

  // Load Rethink Sans font
  useEffect(() => {
    const link = document.createElement("link")
    link.href =
      "https://fonts.googleapis.com/css2?family=Rethink+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap"
    link.rel = "stylesheet"
    document.head.appendChild(link)

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  // Get background color based on level
  const getLevelBackgroundColor = useCallback((level: number) => {
    const colors = [
      "#1a237e", // Level 1: Blue
      "#4a148c", // Level 2: Purple
      "#1b5e20", // Level 3: Green
      "#bf360c", // Level 4: Red-orange
      "#3e2723", // Level 5: Brown
      "#263238", // Level 6: Blue-grey
      "#1a1a1a", // Level 7: Dark grey
      "#4a0e4e", // Level 8: Dark purple
    ]
    return colors[(level - 1) % colors.length]
  }, [])

  // Load score history from localStorage
  const loadScoreHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem("gravity-mario-scores")
      if (saved) {
        const scores = JSON.parse(saved)
        setScoreHistory(scores)
        return scores
      }
    } catch (error) {
      console.error("Failed to load score history:", error)
    }
    return []
  }, [])

  // Save score to history
  const saveScoreToHistory = useCallback(
    (newScore: number) => {
      try {
        const currentHistory = loadScoreHistory()
        const updatedHistory = [...currentHistory, newScore].sort((a, b) => b - a).slice(0, 10) // Keep top 10 scores
        localStorage.setItem("gravity-mario-scores", JSON.stringify(updatedHistory))
        setScoreHistory(updatedHistory)

        // Check if this is a new best score
        const isNewBest = currentHistory.length === 0 || newScore > Math.max(...currentHistory)
        setIsNewBestScore(isNewBest)

        return isNewBest
      } catch (error) {
        console.error("Failed to save score:", error)
        return false
      }
    },
    [loadScoreHistory],
  )

  // Get best score
  const getBestScore = useCallback(() => {
    const history = scoreHistory.length > 0 ? scoreHistory : loadScoreHistory()
    return history.length > 0 ? Math.max(...history) : 0
  }, [scoreHistory, loadScoreHistory])

  // Create audio context and generate vortex sound
  const playVortexSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const oscillator3 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      const gainNode2 = audioContext.createGain()
      const gainNode3 = audioContext.createGain()
      const masterGain = audioContext.createGain()

      oscillator1.connect(gainNode1)
      oscillator2.connect(gainNode2)
      oscillator3.connect(gainNode3)
      gainNode1.connect(masterGain)
      gainNode2.connect(masterGain)
      gainNode3.connect(masterGain)
      masterGain.connect(audioContext.destination)

      const startTime = audioContext.currentTime
      const duration = 0.25

      oscillator1.frequency.setValueAtTime(100, startTime)
      oscillator1.frequency.exponentialRampToValueAtTime(60, startTime + duration)
      oscillator1.type = "sawtooth"

      oscillator2.frequency.setValueAtTime(220, startTime)
      oscillator2.frequency.exponentialRampToValueAtTime(500, startTime + duration * 0.3)
      oscillator2.frequency.exponentialRampToValueAtTime(180, startTime + duration)
      oscillator2.type = "triangle"

      oscillator3.frequency.setValueAtTime(900, startTime)
      oscillator3.frequency.exponentialRampToValueAtTime(1200, startTime + duration * 0.2)
      oscillator3.frequency.exponentialRampToValueAtTime(450, startTime + duration)
      oscillator3.type = "sine"

      gainNode1.gain.setValueAtTime(0.25, startTime)
      gainNode1.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      gainNode2.gain.setValueAtTime(0.2, startTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      gainNode3.gain.setValueAtTime(0.12, startTime)
      gainNode3.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      masterGain.gain.setValueAtTime(0.35, startTime)
      masterGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      oscillator1.start(startTime)
      oscillator2.start(startTime)
      oscillator3.start(startTime)
      oscillator1.stop(startTime + duration)
      oscillator2.stop(startTime + duration)
      oscillator3.stop(startTime + duration)
    } catch {
      // no-op
    }
  }, [])

  const playOuchSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.22

      // Tone (descending pitch)
      const osc = audioContext.createOscillator()
      const toneGain = audioContext.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(620, now)
      osc.frequency.exponentialRampToValueAtTime(160, now + duration)
      toneGain.gain.setValueAtTime(0.0001, now)
      toneGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01)
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      // Short noise burst for impact
      const noiseBufferLen = Math.floor(0.1 * audioContext.sampleRate)
      const noiseBuffer = audioContext.createBuffer(1, noiseBufferLen, audioContext.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < noiseBufferLen; i++) {
        const t = i / noiseBufferLen
        data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t)
      }
      const noise = audioContext.createBufferSource()
      noise.buffer = noiseBuffer
      const noiseFilter = audioContext.createBiquadFilter()
      noiseFilter.type = "bandpass"
      noiseFilter.frequency.setValueAtTime(800, now)
      noiseFilter.Q.setValueAtTime(0.8, now)
      const noiseGain = audioContext.createGain()
      noiseGain.gain.setValueAtTime(0.0001, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.3, now + 0.005)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      // Master
      const master = audioContext.createGain()
      master.gain.setValueAtTime(0.35, now)

      // Connect
      osc.connect(toneGain)
      toneGain.connect(master)
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)
      master.connect(audioContext.destination)

      // Start/stop
      osc.start(now)
      noise.start(now)
      osc.stop(now + duration)
      noise.stop(now + 0.14)
    } catch {
      // no-op (autoplay restrictions may block without prior user gesture)
    }
  }, [])

  const playHeartCollectSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ac = new AudioCtx()
      const now = ac.currentTime

      const master = ac.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5)
      master.connect(ac.destination)

      // Bright ascending triad: C5 -> E5 -> G5
      const notes = [
        { f: 523.25, t: 0.0, d: 0.2 }, // C5
        { f: 659.25, t: 0.07, d: 0.2 }, // E5
        { f: 783.99, t: 0.14, d: 0.25 }, // G5
      ]

      notes.forEach(({ f, t, d }) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(f, now + t)
        g.gain.setValueAtTime(0.0001, now + t)
        g.gain.exponentialRampToValueAtTime(0.18, now + t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
        osc.connect(g)
        g.connect(master)
        osc.start(now + t)
        osc.stop(now + t + d + 0.02)
      })
    } catch {
      // no-op
    }
  }, [])

  const playCoinCollectSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ac = new AudioCtx()
      const now = ac.currentTime

      const master = ac.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(0.3, now + 0.01)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
      master.connect(ac.destination)

      // Quick ascending ding: C6 -> E6
      const notes = [
        { f: 1046.5, t: 0.0, d: 0.15 }, // C6
        { f: 1318.5, t: 0.05, d: 0.2 }, // E6
      ]

      notes.forEach(({ f, t, d }) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(f, now + t)
        g.gain.setValueAtTime(0.0001, now + t)
        g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
        osc.connect(g)
        g.connect(master)
        osc.start(now + t)
        osc.stop(now + t + d + 0.02)
      })
    } catch {
      // no-op
    }
  }, [])

  const playGameOverMusic = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ac = new AudioCtx()
      const now = ac.currentTime

      const master = ac.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(0.25, now + 0.02)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4)
      master.connect(ac.destination)

      // Simple descending jingle
      const notes = [
        { f: 523.25, t: 0.0, d: 0.25 }, // C5
        { f: 466.16, t: 0.25, d: 0.25 }, // A#4
        { f: 392.0, t: 0.5, d: 0.35 }, // G4
        { f: 349.23, t: 0.9, d: 0.5 }, // F4
      ]

      notes.forEach(({ f, t, d }) => {
        const osc = ac.createOscillator()
        const g = ac.createGain()
        osc.type = "square"
        osc.frequency.setValueAtTime(f, now + t)
        g.gain.setValueAtTime(0.0001, now + t)
        g.gain.exponentialRampToValueAtTime(0.2, now + t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + d)
        osc.connect(g)
        g.connect(master)
        osc.start(now + t)
        osc.stop(now + t + d + 0.05)
      })

      // Soft noise tail
      const noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate)
      const channel = noiseBuffer.getChannelData(0)
      for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1
      const noise = ac.createBufferSource()
      noise.buffer = noiseBuffer
      const lp = ac.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.setValueAtTime(800, now)
      lp.frequency.exponentialRampToValueAtTime(220, now + 0.6)
      const ng = ac.createGain()
      ng.gain.setValueAtTime(0.0001, now)
      ng.gain.exponentialRampToValueAtTime(0.08, now + 0.05)
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)
      noise.connect(lp)
      lp.connect(ng)
      ng.connect(master)
      noise.start(now)
      noise.stop(now + 0.7)
    } catch {
      // no-op
    }
  }, [])

  // Calculate fire probability based on score and elapsed time (increased by 30%)
  const getFireProbability = useCallback((score: number, elapsedSec: number) => {
    const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
    // Baseline terms
    const base = 0.1
    const scoreTerm = Math.min(0.5, (score / 100) * 0.05)
    const timeTerm = Math.min(0.25, (elapsedSec / 60) * 0.05)

    // Early grace: reduce fires up to score 50 (e.g., at 25 → ~50% of normal)
    const graceFactor = Math.max(0.5, Math.min(1, score / 50))
    // Increase fire probability by 30%
    return clamp((base + scoreTerm + timeTerm) * graceFactor * 1.3)
  }, [])

  // Load character images
  useEffect(() => {
    const img1 = new Image()
    const img1_5 = new Image()
    const img2 = new Image()
    img1.crossOrigin = "anonymous"
    img1_5.crossOrigin = "anonymous"
    img2.crossOrigin = "anonymous"
    img1.src = "/Character_1.svg"
    img1_5.src = "/character_1.5.svg"
    img2.src = "/Character_2.svg"
    let loadedCount = 0
    const onLoad = () => {
      loadedCount++
      if (loadedCount === 3) characterImageRef.current = [img1, img1_5, img2]
    }
    img1.onload = onLoad
    img1_5.onload = onLoad
    img2.onload = onLoad
  }, [])

  // Load fire state images (hurt animation)
  useEffect(() => {
    const fire1 = new Image()
    const fire2 = new Image()
    const fire3 = new Image()
    fire1.crossOrigin = "anonymous"
    fire2.crossOrigin = "anonymous"
    fire3.crossOrigin = "anonymous"
    fire1.src = "/F1.svg"
    fire2.src = "/F2.svg"
    fire3.src = "/F3.svg"
    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded === 3) fireStateImageRef.current = [fire1, fire2, fire3]
    }
    fire1.onload = onLoad
    fire2.onload = onLoad
    fire3.onload = onLoad
  }, [])

  // Load cloud image
  useEffect(() => {
    const cloudImg = new Image()
    cloudImg.crossOrigin = "anonymous"
    cloudImg.src = "/cloud.svg"
    cloudImg.onload = () => (cloudImageRef.current = cloudImg)
  }, [])

  // Load platform fire images
  useEffect(() => {
    const fire1 = new Image()
    const fire2 = new Image()
    fire1.crossOrigin = "anonymous"
    fire2.crossOrigin = "anonymous"
    fire1.src = "/fire_1.svg"
    fire2.src = "/fire_2.svg"
    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded === 2) fireImageRef.current = [fire1, fire2]
    }
    fire1.onload = onLoad
    fire2.onload = onLoad
  }, [])

  // Generate clouds
  const generateClouds = (startX: number, count = 12) => {
    const newClouds: Cloud[] = []
    for (let i = 0; i < count; i++) {
      const baseScale = 1.6 + gameRandom.next() * 0.4
      const bump = 1.2 + gameRandom.next() * 0.2 // +20% to +40%
      const sizeMultiplier = baseScale * bump

      newClouds.push({
        x: startX + i * (50 + gameRandom.next() * 80),
        y: 20 + gameRandom.next() * 140,
        width: (40 + gameRandom.next() * 50) * sizeMultiplier,
        height: (25 + gameRandom.next() * 35) * sizeMultiplier,
        opacity: 0.25 + gameRandom.next() * 0.4,
      })
    }
    return newClouds
  }

  // Generate platforms (dynamic difficulty)
  const generatePlatforms = (startX: number, count = 10) => {
    const newPlatforms: Platform[] = []
    const characterHeight = 32
    const minSpacing = characterHeight * 2 // 64px
    const platformHeight = 8

    let currentX = startX
    for (let i = 0; i < count; i++) {
      const currentScore = gameStateRef.current?.platformsPassed || 0
      const elapsedSec = gameStateRef.current ? (performance.now() - gameStateRef.current.startTimeMs) / 1000 : 0
      const p = Math.min(1, currentScore / 600)

      // Difficulty-scaled base width: larger early, smaller later
      let baseWidth = 100 - 30 * p
      // Early width bonus up to score 50: +20 at score 0, +10 at score 25, 0 at score 50
      if (currentScore < 50) {
        baseWidth += (50 - currentScore) * 0.4
      }

      // Choose a ratio in {1, 2, 3}
      const r = gameRandom.next()
      const ratio = r < 0.34 ? 1 : r < 0.67 ? 2 : 3

      // Final width with gentle jitter and clamped bounds
      const widthRaw = baseWidth * ratio
      const width = Math.max(60, Math.min(300, widthRaw + (-6 + gameRandom.next() * 12)))

      const numZones = Math.max(
        1,
        Math.floor((BOTTOM_BOUND - TOP_BOUND - platformHeight) / (platformHeight + minSpacing)),
      )
      const zoneHeight = (BOTTOM_BOUND - TOP_BOUND - platformHeight) / numZones
      const zone = Math.floor(gameRandom.next() * numZones)
      const yInZone = gameRandom.next() * Math.max(1, zoneHeight - platformHeight - minSpacing)
      const platformY = TOP_BOUND + zone * zoneHeight + yInZone + minSpacing / 2

      // Horizontal step keeps a bit of overlap and some randomness
      const overlapMin = 25 - 10 * p
      const jitter = -5 + gameRandom.next() * 10
      const step = Math.max(40, width - overlapMin + jitter)

      newPlatforms.push({
        x: currentX,
        y: Math.max(TOP_BOUND + minSpacing / 2, Math.min(platformY, BOTTOM_BOUND - platformHeight - minSpacing / 2)),
        width,
        height: platformHeight,
        color: "#8B4513",
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(currentScore, elapsedSec),
      })

      currentX += step
    }

    // ensure min vertical spacing across overlaps
    newPlatforms.sort((a, b) => a.x - b.x)
    for (let i = 1; i < newPlatforms.length; i++) {
      const current = newPlatforms[i]
      const previous = newPlatforms[i - 1]
      const minVSpace = 64
      const pHeight = 8
      const horizontalOverlap = !(current.x > previous.x + previous.width || previous.x > current.x + current.width)
      if (horizontalOverlap) {
        const verticalDistance = Math.abs(current.y - previous.y)
        if (verticalDistance < minVSpace) {
          if (current.y > previous.y) {
            current.y = Math.min(previous.y + minVSpace, BOTTOM_BOUND - pHeight - minVSpace / 2)
          } else {
            current.y = Math.max(previous.y - minVSpace, TOP_BOUND + minVSpace / 2)
          }
        }
      }
    }

    return newPlatforms
  }

  // Generate coins on platforms
  const generateCoinsForPlatforms = (platforms: Platform[]) => {
    const coins: Coin[] = []
    const COIN_W = 18
    const COIN_H = 18

    platforms.forEach((platform) => {
      // 60% chance to spawn a coin on each platform (except those with fire)
      if (!platform.hasFire && gameRandom.next() < 0.6) {
        const coinX = platform.x + platform.width / 2 - COIN_W / 2 + (gameRandom.next() - 0.5) * (platform.width * 0.4)
        const coinY = platform.y - COIN_H - 8

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        })
      }
    })

    return coins
  }

  // Flip helper (instant snap with natural curves)
  const doFlip = useCallback(() => {
    if (!gameStateRef.current || isGameOver || !isPlaying) return
    const st = gameStateRef.current

    // Instant gravity direction flip
    st.gravityCurrentDir = -st.gravityCurrentDir // ±1 to ∓1

    playVortexSound()
  }, [isGameOver, isPlaying, playVortexSound])

  // Initialize
  const initializeGame = useCallback(() => {
    gameRandom = new SeededRandom(12345)

    const pickRatioWidth = () => {
      const r = gameRandom.next()
      const ratio = r < 0.34 ? 1 : r < 0.67 ? 2 : 3
      const baseWidth = 100 // start wider; dynamic difficulty will shrink later
      return Math.max(60, Math.min(300, baseWidth * ratio))
    }

    const startTimeMs = performance.now()

    const initialScore = 0
    const initialElapsedSec = 0

    const platforms: Platform[] = [
      { x: 0, y: 160, width: pickRatioWidth(), height: 8, color: "#8B4513", passed: false, hasFire: false },
      {
        x: 170,
        y: 100,
        width: pickRatioWidth(),
        height: 8,
        color: "#8B4513",
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 330,
        y: 240,
        width: pickRatioWidth() * 1.4, // Make platform 3 40% longer
        height: 8,
        color: "#8B4513",
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 480,
        y: 110,
        width: pickRatioWidth(),
        height: 8,
        color: "#8B4513",
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
      {
        x: 640,
        y: 200,
        width: pickRatioWidth(),
        height: 8,
        color: "#8B4513",
        passed: false,
        hasFire: gameRandom.next() < getFireProbability(initialScore, initialElapsedSec),
      },
    ]

    const coins = generateCoinsForPlatforms(platforms)

    // Add extra coins to platform 4 (index 3)
    if (platforms.length >= 4) {
      const platform4 = platforms[3]
      const COIN_W = 18
      const COIN_H = 18

      // Add 3 coins on platform 4
      for (let i = 0; i < 3; i++) {
        const coinX = platform4.x + (i + 1) * (platform4.width / 4) - COIN_W / 2
        const coinY = platform4.y - COIN_H - 8

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        })
      }
    }

    // Add extra coins to platform 2 (index 1)
    if (platforms.length >= 2) {
      const platform2 = platforms[1]
      const COIN_W = 18
      const COIN_H = 18

      // Add 5 coins on platform 2
      for (let i = 0; i < 5; i++) {
        const coinX = platform2.x + (i + 1) * (platform2.width / 6) - COIN_W / 2
        const coinY = platform2.y - COIN_H - 8

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        })
      }
    }

    // Add multiple fires to platform 5 (index 4)
    if (platforms.length >= 5) {
      platforms[4].hasFire = true // Ensure platform 5 has fire
    }

    // Add extra coins to platform 7 (index 6)
    if (platforms.length >= 7) {
      const platform7 = platforms[6]
      const COIN_W = 18
      const COIN_H = 18

      // Add 6 coins on platform 7
      for (let i = 0; i < 6; i++) {
        const coinX = platform7.x + (i + 1) * (platform7.width / 7) - COIN_W / 2
        const coinY = platform7.y - COIN_H - 8

        coins.push({
          x: Math.round(coinX),
          y: Math.round(coinY),
          width: COIN_W,
          height: COIN_H,
          collected: false,
        })
      }
    }

    const generatedPlatforms = generatePlatforms(800, 20)
    platforms.push(...generatedPlatforms)

    // Manual placement tweaks:
    // 1) Place platform 25 closer to platform 24 (horizontal only)
    if (platforms.length >= 25) {
      const p24 = platforms[23]
      const p25 = platforms[24]
      const closeGap = 10 // small horizontal gap
      p25.x = p24.x + p24.width + closeGap
    }

    // 2) Place platform 13 further from platform 12 (both horizontal and vertical)
    if (platforms.length >= 13) {
      const p12 = platforms[11]
      const p13 = platforms[12]

      // Horizontal: ensure at least this much gap
      const extraGapX = 60
      p13.x = Math.max(p13.x, p12.x + p12.width + extraGapX)

      // Vertical: move away from p12 by a bit, clamped to bounds
      const extraGapY = 50
      const platformHeight = 8
      const minY = TOP_BOUND + 32
      const maxY = BOTTOM_BOUND - 32
      const minMargin = 32 // keep some clearance from top/bottom
      const targetY = p12.y < (TOP_BOUND + BOTTOM_BOUND) / 2 ? p12.y + extraGapY : p12.y - extraGapY
      p13.y = Math.max(minY, Math.min(maxY, targetY))
    }

    const clouds = generateClouds(0, 20)

    gameStateRef.current = {
      player: {
        x: 20,
        y: 140,
        width: 42,
        height: 42,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        color: "#FF0000",
      },
      platforms,
      clouds,
      camera: { x: 0, y: 0 },

      gravityBase: 0.42, // 30% weaker baseline (back to working value)
      gravityCurrentDir: 1,

      // runtime
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
      nextHeartScore: 25, // Start at 25, then every 25
      coins,
      coinEffects: [],
      levelBoundaries: [],
    }
    setLevel(1)
    setScore(0)
    setLives(3)
    setIsGameOver(false)
  }, [getFireProbability])

  // Start Again - moved before useEffect that uses it
  const startAgain = useCallback(() => {
    setIsNewBestScore(false)
    initializeGame()
    setIsPlaying(true)
  }, [initializeGame])

  // Input: Space flips during play; Space starts again on Game Over
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSpace = e.code === "Space" || e.key === " "
      if (isSpace) {
        e.preventDefault()
        if (isGameOver) {
          keysRef.current.delete(" ")
          startAgain()
        } else if (isPlaying) {
          doFlip()
        }
        return
      }
      keysRef.current.add(e.key.toLowerCase())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const isSpace = e.code === "Space" || e.key === " "
      if (!isSpace) keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [isPlaying, isGameOver, doFlip, startAgain])

  const handleCanvasClick = useCallback(() => {
    if (isGameOver) {
      startAgain()
    } else if (isPlaying) {
      doFlip()
    }
  }, [isGameOver, isPlaying, doFlip, startAgain])

  const checkCollision = (rect1: any, rect2: any) =>
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y

  // Platform fire collision (30% overlap) - supports double fires for higher score
  const checkFireCollision = (player: Player, platform: Platform) => {
    if (!platform.hasFire) return false
    const fireWidth = 27
    const fireHeight = 32
    const fires: { x: number; y: number; width: number; height: number }[] = []

    const centerX = platform.x + (platform.width - fireWidth) / 2
    const y = platform.y - fireHeight - 1
    fires.push({ x: centerX, y, width: fireWidth, height: fireHeight })

    // After score 150 and wide platform, add two side fires to increase difficulty
    const currentScore = gameStateRef.current?.platformsPassed || 0
    if (currentScore > 150 && platform.width > 150) {
      const leftX = platform.x + 10
      const rightX = platform.x + platform.width - fireWidth - 10
      fires.push({ x: leftX, y, width: fireWidth, height: fireHeight })
      fires.push({ x: rightX, y, width: fireWidth, height: fireHeight })
    }

    for (const fire of fires) {
      const overlapLeft = Math.max(player.x, fire.x)
      const overlapRight = Math.min(player.x + player.width, fire.x + fire.width)
      const overlapTop = Math.max(player.y, fire.y)
      const overlapBottom = Math.min(player.y + player.height, fire.y + fire.height)
      if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) continue
      const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
      const playerArea = player.width * player.height
      if (overlapArea / playerArea >= 0.3) return true
    }
    return false
  }

  // Try to spawn a heart on a platform ahead of the player
  const trySpawnHeart = (st: GameState) => {
    const player = st.player
    const HEART_W = 14
    const HEART_H = 12
    // Look for a safe platform somewhat ahead
    const aheadMin = player.x + 420
    const aheadMax = player.x + 1000
    const candidate = st.platforms.find(
      (p) => p.x + p.width / 2 > aheadMin && p.x + p.width / 2 < aheadMax && p.width > 110,
    )
    if (!candidate) return false
    const heart: Heart = {
      x: Math.round(candidate.x + candidate.width / 2 - HEART_W / 2),
      y: Math.round(candidate.y - HEART_H - 2),
      width: HEART_W,
      height: HEART_H,
      collected: false,
    }
    st.hearts.push(heart)
    return true
  }

  // Update
  const updateGame = useCallback(() => {
    if (!gameStateRef.current || isGameOver) return

    const st = gameStateRef.current
    const { player, platforms, clouds, camera } = st

    const now = performance.now()
    const gravityAccel = st.gravityBase * st.gravityCurrentDir

    // Elapsed time (seconds)
    const elapsedSec = (now - st.startTimeMs) / 1000

    // Level-based speed progression
    const currentLevel = Math.floor(st.platformsPassed / 20) + 1
    const platformsInCurrentLevel = st.platformsPassed % 20
    const levelProgress = platformsInCurrentLevel / 20 // 0 to 1 within current level

    // Speed increases more gradually from 1.5 to 3.0 over 20 platforms, then resets
    const targetSpeedBase = 1.5 + levelProgress * 1.5 // 1.5 at start, 3.0 at platform 20

    // Level-based speed progression - consistent speed per level, 20% increase each level
    const baseSpeed = 1.8
    const speedMultiplier = Math.pow(1.2, currentLevel - 1) // 20% increase per level
    const targetSpeed = baseSpeed * speedMultiplier
    st.gameSpeed = targetSpeed

    // Update level when crossing platform 20 boundaries
    if (currentLevel !== st.level) {
      st.level = currentLevel
      setLevel(currentLevel)
    }

    // Add level boundary markers when platforms are generated
    // Check if we need to add a boundary marker for upcoming level transitions
    const nextLevelPlatform = Math.floor((st.platformsPassed + 1) / 20) * 20 // Next multiple of 20
    const platformsAhead = nextLevelPlatform - st.platformsPassed

    // If we're close to a level transition and haven't marked it yet
    if (platformsAhead <= 15 && platformsAhead > 0) {
      const nextLevel = Math.floor(nextLevelPlatform / 20) + 1
      const boundaryX = player.x + platformsAhead * 150 // Approximate distance ahead

      // Check if we already have a boundary for this level
      const existingBoundary = st.levelBoundaries.find((b) => b.level === nextLevel)
      if (!existingBoundary) {
        st.levelBoundaries.push({ x: boundaryX, level: nextLevel })
      }
    }

    // Invulnerability timeout
    if (st.invulnerable && Date.now() > st.invulnerableTime) {
      st.invulnerable = false
    }

    // Generate more platforms
    if (player.x > st.lastPlatformX - 800) {
      const newPlatforms = generatePlatforms(st.lastPlatformX, 12)
      platforms.push(...newPlatforms)
      const tail = newPlatforms[newPlatforms.length - 1]
      st.lastPlatformX = tail.x + tail.width + 200

      // Generate coins for new platforms
      const newCoins = generateCoinsForPlatforms(newPlatforms)
      st.coins.push(...newCoins)
    }

    // Generate more clouds
    if (player.x > st.lastCloudX - 800) {
      const newClouds = generateClouds(st.lastCloudX, 12)
      clouds.push(...newClouds)
      st.lastCloudX += 12 * 130
    }

    // Remove old items
    st.platforms = platforms.filter((p) => p.x > camera.x - 400)
    st.clouds = clouds.filter((c) => c.x > camera.x - 400)
    // Remove hearts far behind or collected
    st.hearts = st.hearts.filter((h) => !h.collected && h.x > camera.x - 100)
    // Remove coins far behind or collected
    st.coins = st.coins.filter((c) => !c.collected && c.x > camera.x - 100)
    // Remove old level boundaries
    st.levelBoundaries = st.levelBoundaries.filter((b) => b.x > camera.x - 200)

    // Move clouds
    st.clouds.forEach((cloud) => {
      cloud.x += st.gameSpeed * 0.5
    })

    // Horizontal input
    if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) {
      player.velocityX = Math.max(player.velocityX - 0.2, -2.4)
    } else if (keysRef.current.has("d") || keysRef.current.has("arrowright")) {
      player.velocityX = Math.min(player.velocityX + 0.2, 3.2)
    } else {
      player.velocityX *= 0.82
    }

    // Jump (opposite of gravity direction)
    if ((keysRef.current.has("w") || keysRef.current.has("arrowup")) && player.onGround) {
      player.velocityY = st.gravityCurrentDir > 0 ? -5 : 5
      player.onGround = false
    }

    // Gravity integration
    player.velocityY += gravityAccel

    // Position
    player.x += player.velocityX
    player.y += player.velocityY

    // Platform collisions and scoring
    player.onGround = false
    for (const platform of st.platforms) {
      // Fire collision on platform
      if (!st.invulnerable && checkFireCollision(player, platform)) {
        playOuchSound()
        const newLives = lives - 1
        setLives(newLives)
        if (newLives <= 0) {
          // Save score and check if it's a new best
          saveScoreToHistory(score)
          setIsGameOver(true)
          setIsPlaying(false)
          playGameOverMusic()
          return
        } else {
          st.invulnerable = true
          st.invulnerableTime = Date.now() + 2000
          st.fireStateStartTime = Date.now()
        }
      }

      // Platform rect with tiny pavements
      const platformTop = platform.y - 1
      const platformBottom = platform.y + platform.height + 1

      if (
        checkCollision(player, {
          x: platform.x,
          y: platformTop,
          width: platform.width,
          height: platformBottom - platformTop,
        })
      ) {
        const overlapLeft = player.x + player.width - platform.x
        const overlapRight = platform.x + platform.width - player.x
        const overlapTop = player.y + player.height - platformTop
        const overlapBottom = platformBottom - player.y
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

        const gravityPositive = st.gravityCurrentDir > 0

        if (gravityPositive) {
          if (minOverlap === overlapTop && player.velocityY > 0) {
            player.y = platformTop - player.height
            player.velocityY = 0
            player.onGround = true
          } else if (minOverlap === overlapBottom && player.velocityY < 0) {
            player.y = platformBottom
            player.velocityY = 0
          } else if (minOverlap === overlapLeft && player.velocityX > 0) {
            player.x = platform.x - player.width
            player.velocityX = Math.max(player.velocityX * 0.5, 0)
          } else if (minOverlap === overlapRight && player.velocityX < 0) {
            player.x = platform.x + platform.width
            player.velocityX = Math.min(player.velocityX * 0.5, 0)
          }
        } else {
          if (minOverlap === overlapBottom && player.velocityY < 0) {
            player.y = platformBottom
            player.velocityY = 0
            player.onGround = true
          } else if (minOverlap === overlapTop && player.velocityY > 0) {
            player.y = platformTop - player.height
            player.velocityY = 0
          } else if (minOverlap === overlapLeft && player.velocityX > 0) {
            player.x = platform.x - player.width
            player.velocityX = Math.max(player.velocityX * 0.5, 0)
          } else if (minOverlap === overlapRight && player.velocityX < 0) {
            player.x = platform.x + platform.width
            player.velocityX = Math.min(player.velocityX * 0.5, 0)
          }
        }
      }

      // Score when passing platform
      if (!platform.passed && player.x > platform.x + platform.width) {
        platform.passed = true
        st.platformsPassed++
        setScore((prev) => prev + 1)
      }
    }

    // Spawn a heart each time we cross the threshold (25, 50, 75, ...)
    if (st.platformsPassed >= st.nextHeartScore) {
      const spawned = trySpawnHeart(st)
      if (spawned) {
        st.nextHeartScore += 25 // every 25 score
      }
      // If not spawned, we'll retry next frame until a candidate appears
    }

    // Heart pickups
    for (const heart of st.hearts) {
      if (heart.collected) continue
      if (
        checkCollision(player, {
          x: heart.x,
          y: heart.y,
          width: heart.width,
          height: heart.height,
        })
      ) {
        heart.collected = true
        setLives((prev) => Math.min(MAX_LIVES, prev + 1))
        playHeartCollectSound()
      }
    }

    // Coin pickups
    for (const coin of st.coins) {
      if (coin.collected) continue
      if (
        checkCollision(player, {
          x: coin.x,
          y: coin.y,
          width: coin.width,
          height: coin.height,
        })
      ) {
        coin.collected = true
        setScore((prev) => prev + 1)
        playCoinCollectSound()

        // Add coin effect animation
        st.coinEffects.push({
          x: coin.x + coin.width / 2,
          y: coin.y + coin.height / 2,
          startX: coin.x + coin.width / 2,
          startY: coin.y + coin.height / 2,
          startTime: performance.now(),
          duration: 800, // 800ms animation
        })
      }
    }

    // Update coin effects
    st.coinEffects = st.coinEffects.filter((effect) => {
      const elapsed = performance.now() - effect.startTime
      if (elapsed >= effect.duration) return false

      const progress = elapsed / effect.duration
      const easeOut = 1 - Math.pow(1 - progress, 3) // cubic ease-out

      // Move towards top-right corner of the score area (approximate screen position)
      const targetX = camera.x + CANVAS_W - 50 // near score area
      const targetY = camera.y - 30 // above the game area

      effect.x = effect.startX + (targetX - effect.startX) * easeOut
      effect.y = effect.startY + (targetY - effect.startY) * easeOut

      return true
    })

    // Checkpoint
    if (st.checkpointFlag && !st.checkpointFlag.passed) {
      const flag = st.checkpointFlag
      if (player.x > flag.x + flag.width) {
        flag.passed = true
        st.level = 2
        setLevel(2)
        st.gameSpeed += 0.3
      }
    }

    // World bounds: game over once 60% is outside
    {
      const overTop = Math.max(0, TOP_BOUND - player.y)
      const overBottom = Math.max(0, player.y + player.height - BOTTOM_BOUND)
      const outside = Math.max(overTop, overBottom)
      const outsideFraction = outside / player.height

      if (outsideFraction >= 0.6) {
        // Save score and check if it's a new best
        saveScoreToHistory(score)
        setIsGameOver(true)
        setIsPlaying(false)
        playGameOverMusic()
        return
      }
    }

    // Camera and auto-scroll
    st.camera.x = player.x - CANVAS_W / 2
    st.camera.y = 0
    player.x += st.gameSpeed
  }, [
    isGameOver,
    lives,
    playOuchSound,
    playGameOverMusic,
    playHeartCollectSound,
    playCoinCollectSound,
    score,
    saveScoreToHistory,
  ])

  // Draw a simple heart shape
  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = "#ef4444"
    ctx.strokeStyle = "#b91c1c"
    ctx.lineWidth = 1

    // Parametric heart using two arcs and a triangle
    const topCurveHeight = h * 0.3
    ctx.beginPath()
    ctx.moveTo(w / 2, h)
    ctx.bezierCurveTo(w / 2, h - topCurveHeight, 0, h - topCurveHeight, 0, h / 2)
    ctx.bezierCurveTo(0, 0, w / 2, 0, w / 2, h * 0.35)
    ctx.bezierCurveTo(w / 2, 0, w, 0, w, h / 2)
    ctx.bezierCurveTo(w, h - topCurveHeight, w / 2, h - topCurveHeight, w / 2, h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // Draw a coin with 4-frame horizontal flip animation (mimics Figma variants)
  const drawCoin = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    frame: number,
  ) => {
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)

    // 4 frames: 0(front) -> 1(tilt) -> 2(edge) -> 3(tilt)
    const frameToScaleX = [1, 0.5, 0.1, 0.5]
    const sx = frameToScaleX[(frame % 4 + 4) % 4]
    ctx.scale(sx, 1)

    // Outer coin
    ctx.fillStyle = "#ffd700"
    ctx.strokeStyle = "#b8860b"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // Inner disc only if visible enough
    if (sx > 0.15) {
      ctx.fillStyle = "#daa520"
      ctx.beginPath()
      ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Dollar sign only when mostly facing front
    if (sx > 0.4) {
      ctx.fillStyle = "#8b4513"
      ctx.font = `${Math.floor(w * 0.6)}px Rethink Sans, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("$", 0, 0)
    }

    ctx.restore()
  }

  function drawStyledPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, collisionHeight: number) {
    // Visual style heights (do not affect collisions)
    const grassH = 8
    const fringeH = 4
    const dirtH = 14

    // Grass cap (light green gradient)
    const grassTopY = y - grassH
    const grassGrad = ctx.createLinearGradient(0, grassTopY, 0, y)
    grassGrad.addColorStop(0, "#d7ff6a")
    grassGrad.addColorStop(1, "#b6ef53")
    ctx.fillStyle = grassGrad
    ctx.fillRect(x, grassTopY, w, grassH)

    // Subtle grass patches
    ctx.save()
    ctx.globalAlpha = 0.15
    ctx.fillStyle = "#9edb3f"
    const patchCount = Math.max(3, Math.floor(w / 90))
    for (let i = 0; i < patchCount; i++) {
      const px = x + (i + 0.5) * (w / patchCount)
      const py = grassTopY + 3 + (i % 2 === 0 ? 1 : 0)
      const pw = w / (patchCount + 1)
      const ph = 6
      ctx.beginPath()
      ctx.ellipse(px, py, Math.max(12, pw * 0.25), ph, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Grass fringe (ragged edge)
    ctx.save()
    ctx.fillStyle = "#3c6b1a"
    const spikes = Math.max(12, Math.floor(w / 16))
    const step = w / spikes
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let i = 0; i <= spikes; i++) {
      const px = x + i * step
      const py = y + (i % 2 === 0 ? 0 : fringeH) // alternating spikes
      ctx.lineTo(px, py)
    }
    ctx.lineTo(x + w, y + 1)
    ctx.lineTo(x, y + 1)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Dirt body (layered brown gradient)
    const dirtTopY = y
    const dirtGrad = ctx.createLinearGradient(0, dirtTopY, 0, dirtTopY + dirtH)
    dirtGrad.addColorStop(0, "#bf6b32")
    dirtGrad.addColorStop(1, "#8a421f")
    ctx.fillStyle = dirtGrad
    ctx.fillRect(x, dirtTopY, w, dirtH)

    // Sediment waves (light layers)
    const layers = 3
    for (let i = 0; i < layers; i++) {
      const ly = dirtTopY + 4 + i * 4
      ctx.save()
      ctx.globalAlpha = 0.25 - i * 0.05
      ctx.fillStyle = i % 2 === 0 ? "#e7a96a" : "#d7894a"
      ctx.beginPath()
      ctx.moveTo(x, ly)
      const hump = 8
      const segs = Math.max(4, Math.floor(w / 60))
      const segW = w / segs
      for (let s = 0; s <= segs; s++) {
        const px = x + s * segW
        const py = ly + Math.sin((s + i) * 0.8) * (hump - i * 2)
        ctx.lineTo(px, py)
      }
      ctx.lineTo(x + w, ly + 5)
      ctx.lineTo(x, ly + 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // Pebbles
    const pebbleCount = Math.max(2, Math.floor(w / 140))
    for (let i = 0; i < pebbleCount; i++) {
      // deterministic pseudo-random per segment
      const r = Math.abs(Math.sin((x + i * 13.37) * 0.01))
      const px = x + (i + 0.3) * (w / pebbleCount)
      const py = dirtTopY + 6 + r * (dirtH - 8)
      const pr = 1.5 + r * 1.2
      ctx.save()
      ctx.fillStyle = "#e8d7c8"
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(px, py, pr * 1.2, pr, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Thin highlight line at the very top of grass
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = "#f0ffb0"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 0.5, grassTopY + 0.5)
    ctx.lineTo(x + w - 0.5, grassTopY + 0.5)
    ctx.stroke()
    ctx.restore()
  }

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !gameStateRef.current) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const st = gameStateRef.current
    const { player, platforms, clouds, camera } = st
    const effectiveDir = st.gravityCurrentDir

    // Determine current level based on player position
    const currentPlayerLevel = Math.floor(st.platformsPassed / 20) + 1

    // Background with level-based color
    const backgroundColor = getLevelBackgroundColor(currentPlayerLevel)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false

    // Camera
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // Draw level boundary lines
    st.levelBoundaries.forEach((boundary) => {
      if (boundary.x > camera.x - 50 && boundary.x < camera.x + canvas.width + 50) {
        ctx.save()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.8
        ctx.setLineDash([10, 5])
        ctx.beginPath()
        ctx.moveTo(boundary.x, camera.y)
        ctx.lineTo(boundary.x, camera.y + canvas.height)
        ctx.stroke()

        // Level indicator text
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 16px Rethink Sans, sans-serif"
        ctx.textAlign = "center"
        ctx.globalAlpha = 0.9
        ctx.setLineDash([])
        ctx.fillText(`LEVEL ${boundary.level}`, boundary.x, camera.y + 30)
        ctx.restore()
      }
    })

    // Clouds
    clouds.forEach((cloud) => {
      if (cloud.x + cloud.width > camera.x && cloud.x < camera.x + canvas.width) {
        if (cloudImageRef.current) {
          ctx.save()
          ctx.globalAlpha = cloud.opacity
          ctx.drawImage(cloudImageRef.current, cloud.x, cloud.y, cloud.width, cloud.height)
          ctx.restore()
        }
      }
    })

    // Platforms and platform fires
    platforms.forEach((platform) => {
      if (platform.x + platform.width > camera.x && platform.x < camera.x + canvas.width) {
        // Stylized platform (grass + fringe + dirt)
        drawStyledPlatform(ctx, platform.x, platform.y, platform.width, platform.height)

        // Platform fire drawing
        if (platform.hasFire && fireImageRef.current && Array.isArray(fireImageRef.current)) {
          const currentTime = Date.now()
          if (currentTime - lastFireFrameTimeRef.current > 300) {
            setCurrentFireFrame((prev) => (prev === 0 ? 1 : 0))
            lastFireFrameTimeRef.current = currentTime
          }
          const fireWidth = 27
          const fireHeight = 32
          const y = platform.y - fireHeight - 1

          // Render single centered fire for all platforms
          const centerX = platform.x + (platform.width - fireWidth) / 2
          ctx.drawImage(fireImageRef.current[currentFireFrame], centerX, y, fireWidth, fireHeight)
        }
      }
    })

    // Advance coin frame every 200ms
    const tnow = performance.now()
    if (tnow - lastCoinFrameTimeRef.current > 200) {
      setCurrentCoinFrame((prev) => (prev + 1) % 4)
      lastCoinFrameTimeRef.current = tnow
    }

    // Coins (collectibles)
    st.coins.forEach((coin) => {
      if (coin.collected) return
      if (coin.x + coin.width > camera.x && coin.x < camera.x + canvas.width) {
        drawCoin(ctx, coin.x, coin.y, coin.width, coin.height, currentCoinFrame)
      }
    })

    // Coin effects
    st.coinEffects.forEach((effect) => {
      const elapsed = performance.now() - effect.startTime
      const progress = elapsed / effect.duration
      const alpha = 1 - progress // fade out
      const scale = 0.5 + (1 - progress) * 0.5 // shrink as it moves

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(effect.x, effect.y)
      ctx.scale(scale, scale)

      // Draw a small golden coin
      ctx.fillStyle = "#ffd700"
      ctx.strokeStyle = "#b8860b"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw +1 text
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 10px Rethink Sans, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.strokeText("+1", 0, -12)
      ctx.fillText("+1", 0, -12)

      ctx.restore()
    })

    // Hearts (collectibles)
    st.hearts.forEach((heart) => {
      if (heart.collected) return
      if (heart.x + heart.width > camera.x && heart.x < camera.x + canvas.width) {
        drawHeart(ctx, heart.x, heart.y, heart.width, heart.height)
      }
    })

    // Player (with fire-state hurt animation)
    const now = Date.now()
    const showFireState = st.invulnerable && now - st.fireStateStartTime < 1800

    if (showFireState && fireStateImageRef.current) {
      const idx = Math.floor(((now - st.fireStateStartTime) / 300) % 3)
      ctx.save()
      if (st.gravityCurrentDir < 0) {
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2)
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(player.x, player.y)
      }
      ctx.drawImage(fireStateImageRef.current[idx], 0, 0, player.width, player.height)
      ctx.restore()
    } else if (characterImageRef.current) {
      if (Date.now() - lastFrameTimeRef.current > 100) {
        setCurrentFrame((prev) => (prev + 1) % 3)
        lastFrameTimeRef.current = Date.now()
      }
      ctx.save()
      if (st.gravityCurrentDir < 0) {
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2)
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(player.x, player.y)
      }
      ctx.drawImage(characterImageRef.current[currentFrame], 0, 0, player.width, player.height)
      ctx.restore()
    } else {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x, player.y, player.width, player.height)
    }

    ctx.restore()
  }, [currentFrame, currentFireFrame, score, getLevelBackgroundColor])

  // Loop
  const gameLoop = useCallback(() => {
    if (isPlaying && !isGameOver) {
      updateGame()
      render()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isPlaying, isGameOver, updateGame, render])

  // Start game loop when playing
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      gameLoop()
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying, isGameOver, gameLoop])

  // Auto-start on mount
  useEffect(() => {
    initializeGame()
    setIsPlaying(true)
  }, [initializeGame])

  // Load score history on mount
  useEffect(() => {
    loadScoreHistory()
  }, [loadScoreHistory])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2">
      <BrandHeader />

      {/* Top panel outside the game frame */}
      <div className="w-[390px]">
        <div
          className="px-4 py-[13px] rounded-t-lg rounded-b-none shadow-lg select-none"
          style={{
            background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
            fontFamily: "Rethink Sans, sans-serif",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div
              className="text-white font-medium text-lg drop-shadow-lg leading-none"
              style={{ fontFamily: "Rethink Sans, sans-serif" }}
            >
              Level {level}
            </div>

            <div className="flex items-center justify-center gap-1 leading-none select-none">
              {[1, 2, 3].map((heartIndex) => (
                <svg
                  key={heartIndex}
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  className="drop-shadow-lg"
                >
                  <defs>
                    <linearGradient id={`heartGradient${heartIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={heartIndex <= lives ? "#ff6b6b" : "#d1d5db"} />
                      <stop offset="100%" stopColor={heartIndex <= lives ? "#c92a2a" : "#9ca3af"} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill={heartIndex <= lives ? `url(#heartGradient${heartIndex})` : "rgba(255, 255, 255, 0.4)"}
                    stroke={heartIndex <= lives ? "none" : "white"}
                    strokeWidth={heartIndex <= lives ? "0" : "1.5"}
                  />
                </svg>
              ))}
            </div>

            <div
              className="text-white font-medium text-lg drop-shadow-lg leading-none"
              style={{ fontFamily: "Rethink Sans, sans-serif" }}
            >
              Score: {score}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleCanvasClick}
          className="border-b-2 border-gray-300 border-x-0 border-t-0 cursor-pointer bg-white rounded-b-lg rounded-t-none"
        />

        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="relative">
              {/* Main overlay panel */}
              <div
                className="bg-white rounded-2xl p-6 text-center shadow-2xl mx-3 pt-6"
                style={{ fontFamily: "Rethink Sans, sans-serif" }}
              >
                {/* Branding logo */}
                <div className="flex justify-center mb-6">
                  <img src="/branding.svg" alt="Baron Crust" className="w-24 h-auto" />
                </div>

                {/* Game Over text */}
                <h2
                  className="text-3xl font-bold text-red-600 mb-2 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  GAME OVER
                </h2>

                {/* Score */}
                <p
                  className="text-xl text-gray-600 mb-6 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  Score: {score}
                </p>

                {/* New Best Score notification */}
                {isNewBestScore && (
                  <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p
                      className="text-lg font-bold text-yellow-800 select-none"
                      style={{ fontFamily: "Rethink Sans, sans-serif" }}
                    >
                      🎉 NEW BEST SCORE! 🎉
                    </p>
                  </div>
                )}

                {/* Start Again Button */}
                <button
                  onClick={startAgain}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-2xl text-lg mb-4 transition-all duration-200 hover:scale-105 active:scale-95 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  START AGAIN
                </button>

                {/* Best Score */}
                {getBestScore() > 0 && (
                  <p className="text-base text-gray-500 select-none" style={{ fontFamily: "Rethink Sans, sans-serif" }}>
                    Best Score: {getBestScore()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 justify-center">
        <Button
          onClick={() => {
            if (gameStateRef.current && isPlaying && !isGameOver) doFlip()
          }}
          disabled={!isPlaying || isGameOver}
          className="select-none w-[390px] h-14 text-lg font-medium tracking-widest rounded-xl shadow-lg bg-[#4338ca] hover:bg-[#4338ca] active:bg-[#4338ca] text-white border-0"
          style={{ fontFamily: "Rethink Sans, sans-serif" }}
        >
          flip
        </Button>
      </div>
    </div>
  )
}
