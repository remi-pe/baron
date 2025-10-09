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
const CANVAS_H = 640
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
  wasOnGround: boolean
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
  hasDrop?: boolean
  dropDirection?: 'up' | 'down'
  id?: number // Platform number for debugging
}

interface Cloud {
  x: number
  y: number
  width: number
  height: number
  opacity: number
  type: 1 | 2 | 3 // 1 = cloud.svg, 2 = CLOUD_2.svg, 3 = CLOUD_3.svg
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

  // Linear Pull Gravity (constant velocity)
  pullSpeed: number // Constant velocity toward gravity direction
  pullDirection: number // ±1 (1 for down, -1 for up)

  // Runtime
  startTimeMs: number

  gameSpeed: number
  platformsPassed: number
  lastPlatformX: number
  lastCloudX: number
  invulnerable: boolean
  invulnerableTime: number
  fireStateStartTime: number
  dropHitCount: number
  isDead: boolean
  deadStartTime: number
  level: number
  lastLandTime: number // Track last landing sound time for cooldown
  checkpointFlag?: { x: number; y: number; width: number; height: number; passed: boolean }

  // Collectibles
  coins: Coin[]
  coinEffects: CoinEffect[]

  // Level boundaries
  levelBoundaries: LevelBoundary[]
}

function BrandHeader({ 
  showPlatformNumbers, 
  setShowPlatformNumbers,
  soundEnabled,
  setSoundEnabled
}: { 
  showPlatformNumbers: boolean
  setShowPlatformNumbers: (show: boolean) => void
  soundEnabled: {
    vortex: boolean
    ouch: boolean
    coinCollect: boolean
    success: boolean
    land: boolean
    bgMusic: boolean
    gameOver: boolean
  }
  setSoundEnabled: (enabled: any) => void
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSound = (key: keyof typeof soundEnabled) => {
    setSoundEnabled({ ...soundEnabled, [key]: !soundEnabled[key] })
  }

  return (
    <div className="w-full max-w-[800px] mb-3 relative z-[100]">
      {/* Dev Tools Dropdown Button - Desktop Only */}
      {!isMobile && (
        <div className="flex justify-center">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 relative z-[100]"
          >
            🛠️ Dev Tools
          <svg 
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          </button>
        </div>
      )}

      {/* Dropdown Content */}
      {isDropdownOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 z-[100] w-[400px]">
          {/* Platform Numbers Toggle */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Platform Numbers</h3>
            <button
              onClick={() => setShowPlatformNumbers(!showPlatformNumbers)}
              className={`w-full px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                showPlatformNumbers 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-blue-500 border-blue-500 hover:bg-blue-50'
              }`}
              title="Toggle platform numbers"
            >
              # {showPlatformNumbers ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Sound Toggles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Sound Controls</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => toggleSound('vortex')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.vortex ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Gravity flip sound"
              >
                🌀 Flip
              </button>
              <button
                onClick={() => toggleSound('land')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.land ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Landing sound"
              >
                📍 Land
              </button>
              <button
                onClick={() => toggleSound('success')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.success ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Flame collect sound"
              >
                🔥 Flame
              </button>
              <button
                onClick={() => toggleSound('ouch')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.ouch ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Drop hit sound"
              >
                💧 Drop
              </button>
              <button
                onClick={() => toggleSound('coinCollect')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.coinCollect ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Coin collect sound"
              >
                🪙 Coin
              </button>

              <button
                onClick={() => toggleSound('bgMusic')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.bgMusic ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Background music"
              >
                🎵 Music
              </button>
              <button
                onClick={() => toggleSound('gameOver')}
                className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                  soundEnabled.gameOver ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Game over sound"
              >
                💀 Over
              </button>
            </div>
          </div>
        </div>
      )}
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
  const deadImageRef = useRef<HTMLImageElement | null>(null)
  const cloudImageRef = useRef<HTMLImageElement[]>()
  const fireImageRef = useRef<HTMLImageElement[]>()
  const dropImageRef = useRef<HTMLImageElement>()
  const coinImageRef = useRef<HTMLImageElement[] | null>(null)
  const lastFrameTimeRef = useRef(0)
  const dropHitAudioRef = useRef<HTMLAudioElement | null>(null)
  const coinCollectAudioRef = useRef<HTMLAudioElement | null>(null)
  const flameTouchAudioRef = useRef<HTMLAudioElement | null>(null)
  const landAudioRef = useRef<HTMLAudioElement | null>(null)
  const levelUpAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastFireFrameTimeRef = useRef(0)
  const lastCoinFrameTimeRef = useRef(0)
  const gameOverAudioRef = useRef<HTMLAudioElement | null>(null)
  const yeahBoyAudioRef = useRef<HTMLAudioElement | null>(null)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)
  const lastGameTimeRef = useRef(performance.now())
  const TARGET_FPS = 60
  const FRAME_TIME = 1000 / TARGET_FPS // 16.67ms for 60fps

  const [score, setScore] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [isAIMode, setIsAIMode] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [currentFireFrame, setCurrentFireFrame] = useState(0)
  const [currentCoinFrame, setCurrentCoinFrame] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [showPlatformNumbers, setShowPlatformNumbers] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState({
    vortex: true,      // Gravity flip
    ouch: true,        // Hit by drop
    coinCollect: true,  // Collect coin
    success: true,      // Touch flame
    land: true,         // Land on platform
    bgMusic: true,      // Background music
    gameOver: true      // Game over music
  })
  const [scoreHistory, setScoreHistory] = useState<number[]>([])
  const [isNewBestScore, setIsNewBestScore] = useState(false)
  const [nextPlatformId, setNextPlatformId] = useState(1)
  const [countdown, setCountdown] = useState<'READY' | 'GO' | null>(null)
  const [frameCounter, setFrameCounter] = useState(0)

  // HiDPI canvas: increase backing store and scale context to avoid blur
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Cap DPR at 1.0 for mobile performance (disable high DPI on mobile)
    const rawDpr = window.devicePixelRatio || 1
    const isMobileDevice = window.innerWidth < 768
    const dpr = isMobileDevice ? 1.0 : Math.min(1.5, Math.max(1, rawDpr))
    // Set backing resolution
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    // Keep CSS size constant
    ;(canvas as HTMLCanvasElement).style.width = `${CANVAS_W}px`
    ;(canvas as HTMLCanvasElement).style.height = `${CANVAS_H}px`
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      // Disable anti-aliasing for better mobile performance
      ctx.imageSmoothingQuality = 'low'
    }
  }, [])

  // Load Rethink Sans and Instrument Sans fonts
  useEffect(() => {
    const rethinkLink = document.createElement("link")
    rethinkLink.href =
      "https://fonts.googleapis.com/css2?family=Rethink+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap"
    rethinkLink.rel = "stylesheet"
    document.head.appendChild(rethinkLink)

    const instrumentLink = document.createElement("link")
    instrumentLink.href =
      "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
    instrumentLink.rel = "stylesheet"
    document.head.appendChild(instrumentLink)

    return () => {
      if (document.head.contains(rethinkLink)) {
        document.head.removeChild(rethinkLink)
      }
      if (document.head.contains(instrumentLink)) {
        document.head.removeChild(instrumentLink)
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
    if (!soundEnabled.vortex) return
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
  }, [soundEnabled])

  const playOuchSound = useCallback(() => {
    if (!soundEnabled.ouch || !dropHitAudioRef.current) return
    try {
      // Reset to start and play instantly (no loading delay)
      dropHitAudioRef.current.currentTime = 0
      dropHitAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playHeartCollectSound = useCallback(() => {
    if (!soundEnabled.coinCollect) return
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
  }, [soundEnabled])

  const playCoinCollectSound = useCallback(() => {
    if (!soundEnabled.coinCollect || !coinCollectAudioRef.current) return
    try {
      coinCollectAudioRef.current.currentTime = 0
      coinCollectAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playSuccessSound = useCallback(() => {
    if (!soundEnabled.success || !flameTouchAudioRef.current) return
    try {
      flameTouchAudioRef.current.currentTime = 0
      flameTouchAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playYeahBoySound = useCallback(() => {
    if (!soundEnabled.success || !yeahBoyAudioRef.current) return
    try {
      yeahBoyAudioRef.current.currentTime = 0
      yeahBoyAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playLandSound = useCallback(() => {
    if (!soundEnabled.land || !landAudioRef.current) return
    try {
      landAudioRef.current.currentTime = 0
      landAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playGameOverMusic = useCallback(() => {
    if (!soundEnabled.gameOver) return
    try {
      // Stop background music when game ends
      stopBackgroundMusic()
      
      // Stop any existing game over audio
      if (gameOverAudioRef.current) {
        gameOverAudioRef.current.pause()
        gameOverAudioRef.current.currentTime = 0
      }
      
      const audio = new Audio('/game-over-sound.wav')
      audio.volume = 0.5 // Adjust volume as needed
      gameOverAudioRef.current = audio
      audio.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const playBackgroundMusic = useCallback(() => {
    if (!soundEnabled.bgMusic || !backgroundMusicRef.current) return
    try {
      backgroundMusicRef.current.currentTime = 0
      backgroundMusicRef.current.loop = true
      backgroundMusicRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause()
      backgroundMusicRef.current.currentTime = 0
    }
  }, [])

  const playLevelUpSound = useCallback(() => {
    if (!soundEnabled.bgMusic || !levelUpAudioRef.current) return
    try {
      levelUpAudioRef.current.currentTime = 0
      levelUpAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])

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

  // Load fire state images (hurt animation when touching flame)
  useEffect(() => {
    const cacheBuster = Date.now()
    const onFire1 = new Image()
    const onFire2 = new Image()
    const onFire3 = new Image()
    onFire1.crossOrigin = "anonymous"
    onFire2.crossOrigin = "anonymous"
    onFire3.crossOrigin = "anonymous"
    onFire1.src = `/ON_FIRE_1.svg?v=${cacheBuster}`
    onFire2.src = `/ON_FIRE_2.svg?v=${cacheBuster}`
    onFire3.src = `/ON_FIRE_3.svg?v=${cacheBuster}`
    let loaded = 0
    const onLoad = () => {
      loaded++
      console.log(`✅ Loaded fire state image ${loaded}/3`)
      if (loaded === 3) {
        fireStateImageRef.current = [onFire1, onFire2, onFire3]
        console.log("✅ ALL FIRE STATE IMAGES LOADED!", {
          width1: onFire1.width,
          width2: onFire2.width,
          width3: onFire3.width
        })
      }
    }
    onFire1.onload = onLoad
    onFire2.onload = onLoad
    onFire3.onload = onLoad
    onFire1.onerror = (e) => console.error("❌ FAILED to load ON_FIRE_1.svg", e)
    onFire2.onerror = (e) => console.error("❌ FAILED to load ON_FIRE_2.svg", e)
    onFire3.onerror = (e) => console.error("❌ FAILED to load ON_FIRE_3.svg", e)
  }, [])

  // Load cloud images
  useEffect(() => {
    const cloud1 = new Image()
    const cloud2 = new Image()
    const cloud3 = new Image()
    cloud1.crossOrigin = "anonymous"
    cloud2.crossOrigin = "anonymous"
    cloud3.crossOrigin = "anonymous"
    cloud1.src = "/cloud.svg"
    cloud2.src = "/CLOUD_2.svg"
    cloud3.src = "/CLOUD_3.svg"
    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded === 3) {
        cloudImageRef.current = [cloud1, cloud2, cloud3]
      }
    }
    cloud1.onload = onLoad
    cloud2.onload = onLoad
    cloud3.onload = onLoad
    cloud1.onerror = (e) => console.error("Failed to load cloud.svg", e)
    cloud2.onerror = (e) => console.error("Failed to load CLOUD_2.svg", e)
    cloud3.onerror = (e) => console.error("Failed to load CLOUD_3.svg", e)
  }, [])

  // Load dead image
  useEffect(() => {
    const deadImg = new Image()
    deadImg.crossOrigin = "anonymous"
    deadImg.src = "/DEAD.svg"
    deadImg.onload = () => {
      deadImageRef.current = deadImg
    }
    deadImg.onerror = (error) => {
      console.error("FAILED TO LOAD DEAD IMAGE:", error)
    }
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
      if (loaded === 2) {
        fireImageRef.current = [fire1, fire2]
      }
    }
    fire1.onload = onLoad
    fire2.onload = onLoad
    fire1.onerror = (e) => console.error("Failed to load fire_1.svg", e)
    fire2.onerror = (e) => console.error("Failed to load fire_2.svg", e)
  }, [])

  // Load drop image
  useEffect(() => {
    const drop = new Image()
    drop.src = "/Drop.svg"
    drop.onload = () => {
      dropImageRef.current = drop
    }
  }, [])

  // Preload ALL audio files for instant playback (0ms delay)
  // Preload and initialize all audio on mount
  useEffect(() => {
    // Drop hit sound
    const dropHitAudio = new Audio('/drop-hit-sound.mp3')
    dropHitAudio.volume = 0.6
    dropHitAudio.preload = 'auto'
    dropHitAudio.load()
    dropHitAudioRef.current = dropHitAudio

    // Coin collect sound
    const coinAudio = new Audio('/coin-collect-sound.wav')
    coinAudio.volume = 0.4
    coinAudio.preload = 'auto'
    coinAudio.load()
    coinCollectAudioRef.current = coinAudio

    // Flame touch sound
    const flameAudio = new Audio('/flame-touch-sound.mp3')
    flameAudio.volume = 0.5
    flameAudio.preload = 'auto'
    flameAudio.load()
    flameTouchAudioRef.current = flameAudio

    // Land sound
    const landAudio = new Audio('/land-sound.wav')
    landAudio.volume = 0.03 // 20% of current volume (0.15 * 0.2 = 0.03)
    landAudio.preload = 'auto'
    landAudio.load()
    landAudioRef.current = landAudio

    // Level up sound
    const levelUpAudio = new Audio('/level-up-sound.wav')
    levelUpAudio.volume = 0.6
    levelUpAudio.preload = 'auto'
    levelUpAudio.load()
    levelUpAudioRef.current = levelUpAudio

    // Game over sound (already has ref, just preload it)
    const gameOverAudio = new Audio('/game-over-sound.wav')
    gameOverAudio.volume = 0.5
    gameOverAudio.preload = 'auto'
    gameOverAudio.load()
    gameOverAudioRef.current = gameOverAudio

    // Yeah boy sound for flame touch
    const yeahBoyAudio = new Audio('/yeah-boy-02.mp3')
    yeahBoyAudio.volume = 0.6
    yeahBoyAudio.preload = 'auto'
    yeahBoyAudio.load()
    yeahBoyAudioRef.current = yeahBoyAudio

    // Background music
    const backgroundMusic = new Audio('/background-music.mp3')
    backgroundMusic.volume = 0.18 // 60% of typical sound effect volume (0.3)
    backgroundMusic.preload = 'auto'
    backgroundMusic.load()
    backgroundMusicRef.current = backgroundMusic

    // Unlock audio on first user interaction (browser autoplay policy)
    const unlockAudio = () => {
      // Unlocking audio
      // Play and immediately pause each audio to unlock them
      const audios = [dropHitAudio, coinAudio, flameAudio, landAudio, levelUpAudio, gameOverAudio, yeahBoyAudio, backgroundMusic]
      audios.forEach(audio => {
        audio.play().then(() => {
          audio.pause()
          audio.currentTime = 0
        }).catch(() => { /* ignore */ })
      })
      // Remove listeners after first unlock
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }

    // Add event listeners for first interaction
    document.addEventListener('click', unlockAudio, { once: true })
    document.addEventListener('keydown', unlockAudio, { once: true })
    document.addEventListener('touchstart', unlockAudio, { once: true })

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('keydown', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [])

  // Load coin images
  useEffect(() => {
    const coin1 = new Image()
    const coin2 = new Image()
    const coin3 = new Image()
    const coin4 = new Image()
    coin1.crossOrigin = "anonymous"
    coin2.crossOrigin = "anonymous"
    coin3.crossOrigin = "anonymous"
    coin4.crossOrigin = "anonymous"
    coin1.src = "/COIN-1.svg"
    coin2.src = "/COIN-2.svg"
    coin3.src = "/COIN-3.svg"
    coin4.src = "/COIN-4.svg"
    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded === 4) coinImageRef.current = [coin1, coin2, coin3, coin4]
    }
    coin1.onload = onLoad
    coin2.onload = onLoad
    coin3.onload = onLoad
    coin4.onload = onLoad
  }, [])

  // Generate clouds
  const generateClouds = (startX: number, count = 12) => {
    const newClouds: Cloud[] = []
    for (let i = 0; i < count; i++) {
      // First cloud in each batch is type 3 (one per level), rest are 50/50 type 1 and 2
      let cloudType: 1 | 2 | 3
      if (i === 0) {
        cloudType = 3 // First cloud is always CLOUD_3 (one per level)
      } else {
        cloudType = gameRandom.next() < 0.5 ? 1 : 2 // 50/50 split for the rest
      }

      let finalSize: number
      
      if (cloudType === 3) {
        // CLOUD_3 always has the same fixed size (10% bigger than base)
        finalSize = 132
      } else {
        // Other clouds get random sizes
        const baseScale = 1.6 + gameRandom.next() * 0.4
        const bump = 1.2 + gameRandom.next() * 0.2 // +20% to +40%
        let sizeMultiplier = baseScale * bump

        // For CLOUD_2 only, randomly apply size variation: same (1.0), larger (1.3), or smaller (0.7)
        if (cloudType === 2) {
          const sizeVariations = [1.0, 1.3, 0.7]
          const randomVariation = sizeVariations[Math.floor(gameRandom.next() * 3)]
          sizeMultiplier *= randomVariation
        }

        // Use one base size and maintain aspect ratio (width:height = 1:1)
        const baseSize = 60 + gameRandom.next() * 40 // Random base size 60-100
        finalSize = baseSize * sizeMultiplier
      }

      newClouds.push({
        x: startX + i * (50 + gameRandom.next() * 80),
        y: 20 + gameRandom.next() * 140,
        width: finalSize,
        height: finalSize, // Maintain 1:1 aspect ratio (square)
        opacity: 0.25 + gameRandom.next() * 0.4,
        type: cloudType,
      })
    }
    return newClouds
  }

  // Fixed item placement pattern for platforms (repeating cycle of 25)
  // Pattern maintains: 20% flames, 44% drops, 36% nothing
  const getPlatformItems = (platformId: number) => {
    const basePattern: { hasFire: boolean; hasDrop: boolean; dropDirection: 'up' | 'down' }[] = [
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 1: nothing
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 2: nothing
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 3: nothing
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 4: drop (down)
      { hasFire: false, hasDrop: true, dropDirection: 'up' },         // 5: drop (up)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 6: nothing
      { hasFire: true, hasDrop: false, dropDirection: 'down' },       // 7: flame (down)
      { hasFire: false, hasDrop: true, dropDirection: 'up' },         // 8: drop (up)
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 9: drop (down)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 10: nothing
      { hasFire: false, hasDrop: true, dropDirection: 'up' },         // 11: drop (up)
      { hasFire: true, hasDrop: false, dropDirection: 'down' },       // 12: flame (down)
      { hasFire: true, hasDrop: false, dropDirection: 'down' },       // 13: flame (down)
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 14: drop (down)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 15: nothing
      { hasFire: true, hasDrop: false, dropDirection: 'up' },         // 16: flame (up)
      { hasFire: false, hasDrop: true, dropDirection: 'up' },         // 17: drop (up)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 18: nothing
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 19: drop (down)
      { hasFire: false, hasDrop: true, dropDirection: 'up' },         // 20: drop (up)
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 21: drop (down)
      { hasFire: true, hasDrop: false, dropDirection: 'up' },         // 22: flame (up)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 23: nothing
      { hasFire: false, hasDrop: true, dropDirection: 'down' },       // 24: drop (down)
      { hasFire: false, hasDrop: false, dropDirection: 'down' },      // 25: nothing
    ]
    
    // Cycle through pattern for all platforms (1-based indexing)
    const index = ((platformId - 1) % 25)
    return basePattern[index]
  }

  // Generate platforms (dynamic difficulty)
  const generatePlatforms = (startX: number, count = 10, startId = 1) => {
    const newPlatforms: Platform[] = []
    const runnerHeight = 33 // Character height (named "runner")
    const minSpacing = runnerHeight * 2 // 66px
    const platformHeight = 6

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
      // Make level 2 easier by reducing horizontal spacing
      const currentLevel = Math.floor((gameStateRef.current?.platformsPassed || 0) / 20) + 1
      const level2Bonus = currentLevel === 2 ? 20 : 0 // Reduce spacing by 20px in level 2
      
      // Special case: make platforms 25 and 26 closer together
      const platformId = startId + i
      const platform25_26Bonus = (platformId === 25 || platformId === 26) ? 30 : 0 // Reduce spacing by 30px for platforms 25 and 26
      
      const overlapMin = 25 - 10 * p
      const jitter = -5 + gameRandom.next() * 10
      const step = Math.max(40, width - overlapMin + jitter - level2Bonus - platform25_26Bonus)

      // Get fixed item placement for this platform
      const platformItems = getPlatformItems(platformId)

      newPlatforms.push({
        x: currentX,
        y: Math.max(TOP_BOUND + 64, Math.min(platformY, BOTTOM_BOUND - platformHeight - 64)),
        width,
        height: platformHeight,
        color: "#8B4513",
        passed: false,
        hasFire: platformItems.hasFire,
        hasDrop: platformItems.hasDrop,
        dropDirection: platformItems.dropDirection,
        id: platformId, // Assign unique platform ID
      })

      currentX += step
    }

    // ensure min vertical spacing across overlaps
    newPlatforms.sort((a, b) => a.x - b.x)
    for (let i = 1; i < newPlatforms.length; i++) {
      const current = newPlatforms[i]
      const previous = newPlatforms[i - 1]
      const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (66px) - NEVER OVERRIDE
      const pHeight = 8
      const horizontalOverlap = !(current.x > previous.x + previous.width || previous.x > current.x + current.width)
      if (horizontalOverlap) {
        const verticalDistance = Math.abs(current.y - previous.y)
        if (verticalDistance < minVSpace) {
          if (current.y > previous.y) {
            current.y = Math.min(previous.y + minVSpace, BOTTOM_BOUND - pHeight - 64)
          } else {
            current.y = Math.max(previous.y - minVSpace, TOP_BOUND + 64)
          }
        }
      }
    }

    return newPlatforms
  }

  // Check if coin overlaps with existing coins, flames, or drops
  const checkCoinCollision = (newCoin: Coin, existingCoins: Coin[], platform: Platform) => {
    // Check collision with existing coins
    for (const existingCoin of existingCoins) {
      if (newCoin.x < existingCoin.x + existingCoin.width &&
          newCoin.x + newCoin.width > existingCoin.x &&
          newCoin.y < existingCoin.y + existingCoin.height &&
          newCoin.y + newCoin.height > existingCoin.y) {
        return true // Collision detected
      }
    }

    // Check collision with flame (if platform has fire)
    if (platform.hasFire) {
      const fireWidth = 35
      const fireHeight = 42
      const centerX = platform.x + (platform.width - fireWidth) / 2
      let fireY
      if (platform.dropDirection === 'up') {
        fireY = platform.y - fireHeight - 1
      } else {
        fireY = platform.y + platform.height + 1
      }

      if (newCoin.x < centerX + fireWidth &&
          newCoin.x + newCoin.width > centerX &&
          newCoin.y < fireY + fireHeight &&
          newCoin.y + newCoin.height > fireY) {
        return true // Collision with flame
      }
    }

    // Check collision with drop (if platform has drop)
    if (platform.hasDrop) {
      const dropWidth = 42
      const dropHeight = 42
      let dropX, dropY
      if (platform.dropDirection === 'up') {
        dropY = platform.y - dropHeight - 1
        dropX = platform.x + platform.width - dropWidth - 5
      } else {
        dropY = platform.y + platform.height + 1
        dropX = platform.x + platform.width - dropWidth - 5
      }

      if (newCoin.x < dropX + dropWidth &&
          newCoin.x + newCoin.width > dropX &&
          newCoin.y < dropY + dropHeight &&
          newCoin.y + newCoin.height > dropY) {
        return true // Collision with drop
      }
    }

    return false // No collision
  }

  // Generate coins on platforms with collision avoidance
  const generateCoinsForPlatforms = (platforms: Platform[]) => {
    const coins: Coin[] = []
    const COIN_W = 26
    const COIN_H = 26
    const DROP_W = 42
    const DROP_H = 42

    platforms.forEach((platform) => {
      // If platform has a drop, place 3 coins near the drop (more challenging)
      if (platform.hasDrop && gameRandom.next() < 0.85) {
        // Calculate drop position
        const dropX = platform.x + platform.width - DROP_W - 5
        const dropCenterX = dropX + DROP_W / 2
        
        // Place 3 coins near the drop at half the distance (25-40px instead of 50-80px)
        // Use specific horizontal positions, all aligned at same vertical position
        const coinOffsets = [-40, -25, 30]  // Left, center-left, right from drop center
        
        // Calculate Y position - consistent 8px gap from platform
        let coinY
        if (platform.dropDirection === 'up') {
          // Drop is above, place coins above platform with 8px gap
          coinY = platform.y - COIN_H - 8
        } else {
          // Drop is below, place coins below platform with 8px gap
          coinY = platform.y + platform.height + 8
        }
        
        for (let coinIndex = 0; coinIndex < 3; coinIndex++) {
          const offset = coinOffsets[coinIndex]
          const coinX = dropCenterX + offset - COIN_W / 2
          
          // Ensure coin stays within reasonable bounds
          const finalX = Math.max(platform.x + 5, Math.min(coinX, platform.x + platform.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          // Skip collision check with other coins in this group, only check fire/drop
          coins.push(newCoin)
        }
      }
      // 78% chance to spawn a coin on each platform without fire/drop (60% * 1.3 = 78%)
      else if (!platform.hasFire && !platform.hasDrop && gameRandom.next() < 0.78) {
        let attempts = 0
        let coinPlaced = false
        
        // Try multiple positions to avoid collisions
        while (attempts < 10 && !coinPlaced) {
          const coinX = platform.x + platform.width / 2 - COIN_W / 2 + (gameRandom.next() - 0.5) * (platform.width * 0.6)
          const coinY = platform.y - COIN_H - 8

          // Ensure coin stays within platform bounds
          const finalX = Math.max(platform.x + 5, Math.min(coinX, platform.x + platform.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          if (!checkCoinCollision(newCoin, coins, platform)) {
            coins.push(newCoin)
            coinPlaced = true
          }
          attempts++
        }
      }

      // 30% chance to spawn a coin under the platform (only for safe platforms)
      if (!platform.hasFire && !platform.hasDrop && gameRandom.next() < 0.3) {
        let attempts = 0
        let coinPlaced = false
        
        // Try multiple positions to avoid collisions
        while (attempts < 10 && !coinPlaced) {
          const coinX = platform.x + platform.width / 2 - COIN_W / 2 + (gameRandom.next() - 0.5) * (platform.width * 0.6)
          const coinY = platform.y + platform.height + 8 // Under the platform

          // Ensure coin stays within platform bounds
          const finalX = Math.max(platform.x + 5, Math.min(coinX, platform.x + platform.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          if (!checkCoinCollision(newCoin, coins, platform)) {
            coins.push(newCoin)
            coinPlaced = true
          }
          attempts++
        }
      }
    })

    return coins
  }

  // Flip helper (instant snap with natural curves)
  const doFlip = useCallback(() => {
    if (!gameStateRef.current || isGameOver || !isPlaying || isAIMode) return // Disable manual flip in AI mode
    const st = gameStateRef.current

    // Instant gravity direction flip (disabled when dead)
    if (!st.isDead) {
      st.pullDirection = -st.pullDirection // ±1 to ∓1
      // Instantly set velocity to strong pull in new direction
      st.player.velocityY = st.pullSpeed * st.pullDirection
      playVortexSound()
    }
  }, [isGameOver, isPlaying, isAIMode, playVortexSound])

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

    // Get fixed item placement for initial platforms
    const platform1Items = getPlatformItems(1)
    const platform2Items = getPlatformItems(2)
    const platform3Items = getPlatformItems(3)
    const platform4Items = getPlatformItems(4)
    const platform5Items = getPlatformItems(5)

    const platforms: Platform[] = [
      { x: 0, y: 317, width: pickRatioWidth() * 2, height: 6, color: "#8B4513", passed: false, hasFire: platform1Items.hasFire, hasDrop: platform1Items.hasDrop, dropDirection: platform1Items.dropDirection, id: 1 },
      {
        x: 170,
        y: 100,
        width: pickRatioWidth(),
        height: 6,
        color: "#8B4513",
        passed: false,
        hasFire: platform2Items.hasFire,
        hasDrop: platform2Items.hasDrop,
        dropDirection: platform2Items.dropDirection,
        id: 2,
      },
      {
        x: 330,
        y: 240,
        width: pickRatioWidth() * 1.4, // Make platform 3 40% longer
        height: 6,
        color: "#8B4513",
        passed: false,
        hasFire: platform3Items.hasFire,
        hasDrop: platform3Items.hasDrop,
        dropDirection: platform3Items.dropDirection,
        id: 3,
      },
      {
        x: 480,
        y: 110,
        width: pickRatioWidth(),
        height: 6,
        color: "#8B4513",
        passed: false,
        hasFire: platform4Items.hasFire,
        hasDrop: platform4Items.hasDrop,
        dropDirection: platform4Items.dropDirection,
        id: 4,
      },
      {
        x: 640,
        y: 200,
        width: pickRatioWidth(),
        height: 6,
        color: "#8B4513",
        passed: false,
        hasFire: platform5Items.hasFire,
        hasDrop: platform5Items.hasDrop,
        dropDirection: platform5Items.dropDirection,
        id: 5,
      },
    ]

    const coins = generateCoinsForPlatforms(platforms)

    // Add extra coins to platform 4 (index 3)
    if (platforms.length >= 4) {
      const platform4 = platforms[3]
      const COIN_W = 26
      const COIN_H = 26

      // Add 3 coins on platform 4 with collision avoidance
      for (let i = 0; i < 3; i++) {
        let attempts = 0
        let coinPlaced = false
        
        while (attempts < 10 && !coinPlaced) {
          // Try different positions around the planned location
          const baseX = platform4.x + (i + 1) * (platform4.width / 4)
          const coinX = baseX + (gameRandom.next() - 0.5) * 30 - COIN_W / 2 // Add some randomness
          const coinY = platform4.y - COIN_H - 8

          // Ensure coin stays within platform bounds
          const finalX = Math.max(platform4.x + 5, Math.min(coinX, platform4.x + platform4.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          if (!checkCoinCollision(newCoin, coins, platform4)) {
            coins.push(newCoin)
            coinPlaced = true
          }
          attempts++
        }
      }
    }

    // Add extra coins to platform 2 (index 1)
    if (platforms.length >= 2) {
      const platform2 = platforms[1]
      const COIN_W = 26
      const COIN_H = 26

      // Add 5 coins on platform 2 with collision avoidance
      for (let i = 0; i < 5; i++) {
        let attempts = 0
        let coinPlaced = false
        
        while (attempts < 10 && !coinPlaced) {
          // Try different positions around the planned location
          const baseX = platform2.x + (i + 1) * (platform2.width / 6)
          const coinX = baseX + (gameRandom.next() - 0.5) * 30 - COIN_W / 2 // Add some randomness
          const coinY = platform2.y - COIN_H - 8

          // Ensure coin stays within platform bounds
          const finalX = Math.max(platform2.x + 5, Math.min(coinX, platform2.x + platform2.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          if (!checkCoinCollision(newCoin, coins, platform2)) {
            coins.push(newCoin)
            coinPlaced = true
          }
          attempts++
        }
      }
    }

    // Platform 5 only has drop (no fire)

    // Add extra coins to platform 7 (index 6)
    if (platforms.length >= 7) {
      const platform7 = platforms[6]
      const COIN_W = 26
      const COIN_H = 26

      // Add 6 coins on platform 7 with collision avoidance
      for (let i = 0; i < 6; i++) {
        let attempts = 0
        let coinPlaced = false
        
        while (attempts < 10 && !coinPlaced) {
          // Try different positions around the planned location
          const baseX = platform7.x + (i + 1) * (platform7.width / 7)
          const coinX = baseX + (gameRandom.next() - 0.5) * 30 - COIN_W / 2 // Add some randomness
          const coinY = platform7.y - COIN_H - 8

          // Ensure coin stays within platform bounds
          const finalX = Math.max(platform7.x + 5, Math.min(coinX, platform7.x + platform7.width - COIN_W - 5))
          
          const newCoin = {
            x: Math.round(finalX),
            y: Math.round(coinY),
            width: COIN_W,
            height: COIN_H,
            collected: false,
          }

          if (!checkCoinCollision(newCoin, coins, platform7)) {
            coins.push(newCoin)
            coinPlaced = true
          }
          attempts++
        }
      }
    }

    const generatedPlatforms = generatePlatforms(800, 20, 6) // Start from ID 6
    platforms.push(...generatedPlatforms)
    
    // Generate coins for platforms 6-25
    const additionalCoins = generateCoinsForPlatforms(generatedPlatforms)
    coins.push(...additionalCoins)
    
    // Update next platform ID after generating platforms
    setNextPlatformId(26) // Next platforms will start from 26

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
      const platformHeight = 6
      const minY = TOP_BOUND + 64
      const maxY = BOTTOM_BOUND - 64
      const minMargin = 32 // keep some clearance from top/bottom
      const targetY = p12.y < (TOP_BOUND + BOTTOM_BOUND) / 2 ? p12.y + extraGapY : p12.y - extraGapY
      p13.y = Math.max(minY, Math.min(maxY, targetY))
    }

    const clouds = generateClouds(0, 20)

    gameStateRef.current = {
      player: {
        x: 20,
        y: 273,
        width: 44,
        height: 44,
        velocityX: 0,
        velocityY: 0,
        onGround: true,
        wasOnGround: true, // Start as true to prevent landing sound on first frame
        color: "#FF0000",
      },
      platforms,
      clouds,
      camera: { x: 0, y: 0 },

      pullSpeed: 9, // Instant pull speed when flipping gravity
      pullDirection: 1, // Start pulling down

      // runtime
      startTimeMs,

      gameSpeed: 2.5, // Start at 2.5 speed
      platformsPassed: 0,
      lastPlatformX: platforms[platforms.length - 1].x + platforms[platforms.length - 1].width + 200,
      lastCloudX: 20 * 130,
      invulnerable: false,
      invulnerableTime: 0,
      fireStateStartTime: 0,
      dropHitCount: 0,
      isDead: false,
      deadStartTime: 0,
      level: 1,
      lastLandTime: 0,
      checkpointFlag: undefined,

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
    // Stop game over sound if it's playing
    if (gameOverAudioRef.current) {
      gameOverAudioRef.current.pause()
      gameOverAudioRef.current.currentTime = 0
      gameOverAudioRef.current = null
    }
    
    setIsNewBestScore(false)
    setIsGameOver(false)
    setIsAIMode(false) // Turn off AI mode for manual play
    setCountdown('READY') // Start countdown: READY → GO
  }, [])

  const startAIPlay = useCallback(() => {
    // Stop game over sound if it's playing
    if (gameOverAudioRef.current) {
      gameOverAudioRef.current.pause()
      gameOverAudioRef.current.currentTime = 0
      gameOverAudioRef.current = null
    }
    
    setIsNewBestScore(false)
    setIsGameOver(false)
    setIsAIMode(true) // Turn on AI mode
    setCountdown('READY') // Start countdown: READY → GO
  }, [])

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

  // Platform fire collision (30% overlap) - NOW GIVES LIFE
  const checkFireCollision = (player: Player, platform: Platform) => {
    if (!platform.hasFire) return false
    const fireWidth = 35 // 30% bigger (27 * 1.3)
    const fireHeight = 42 // 30% bigger (32 * 1.3)
    const fires: { x: number; y: number; width: number; height: number }[] = []

    // Position fire based on direction
    const centerX = platform.x + (platform.width - fireWidth) / 2
    let fireY
    if (platform.dropDirection === 'up') {
      fireY = platform.y - fireHeight - 1
    } else {
      fireY = platform.y + platform.height + 1
    }
    fires.push({ x: centerX, y: fireY, width: fireWidth, height: fireHeight })

    // After score 150 and wide platform, add two side fires to increase difficulty
    const currentScore = gameStateRef.current?.platformsPassed || 0
    if (currentScore > 150 && platform.width > 150) {
      const leftX = platform.x + 10
      const rightX = platform.x + platform.width - fireWidth - 10
      fires.push({ x: leftX, y: fireY, width: fireWidth, height: fireHeight })
      fires.push({ x: rightX, y: fireY, width: fireWidth, height: fireHeight })
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

  // Platform drop collision (30% overlap) - TAKES LIFE
  const checkDropCollision = (player: Player, platform: Platform) => {
    if (!platform.hasDrop) return false
    const dropWidth = 42
    const dropHeight = 42

    // Position drop based on direction
    let dropX, dropY
    if (platform.dropDirection === 'up') {
      dropY = platform.y - dropHeight - 1
      dropX = platform.x + platform.width - dropWidth - 5
    } else {
      dropY = platform.y + platform.height + 1
      dropX = platform.x + platform.width - dropWidth - 5
    }

    const overlapLeft = Math.max(player.x, dropX)
    const overlapRight = Math.min(player.x + player.width, dropX + dropWidth)
    const overlapTop = Math.max(player.y, dropY)
    const overlapBottom = Math.min(player.y + player.height, dropY + dropHeight)
    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) return false
    const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
    const playerArea = player.width * player.height
    return overlapArea / playerArea >= 0.3
  }



  // Update
  const updateGame = useCallback((deltaMultiplier: number = 1) => {
    if (!gameStateRef.current || isGameOver) return

    const st = gameStateRef.current
    const { player, platforms, clouds, camera } = st

    const now = performance.now()
    // Linear pull system - no acceleration, just constant velocity

    // Elapsed time (seconds)
    const elapsedSec = (now - st.startTimeMs) / 1000

    // Level-based speed progression
    const currentLevel = Math.floor(st.platformsPassed / 20) + 1
    const platformsInCurrentLevel = st.platformsPassed % 20
    const levelProgress = platformsInCurrentLevel / 20 // 0 to 1 within current level

    // Speed increases more gradually from 1.5 to 3.0 over 20 platforms, then resets
    const targetSpeedBase = 1.5 + levelProgress * 1.5 // 1.5 at start, 3.0 at platform 20

    // Level-based speed progression - consistent speed per level, 30% increase each level
    const baseSpeed = 2.5
    const speedMultiplier = Math.pow(1.3, currentLevel - 1) // 30% increase per level
    const targetSpeed = baseSpeed * speedMultiplier
    st.gameSpeed = targetSpeed

    // Update level when crossing platform 20 boundaries
    if (currentLevel !== st.level) {
      st.level = currentLevel
      setLevel(currentLevel)
      playLevelUpSound() // Play level up sound
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
      const newPlatforms = generatePlatforms(st.lastPlatformX, 12, nextPlatformId)
      platforms.push(...newPlatforms)
      const tail = newPlatforms[newPlatforms.length - 1]
      st.lastPlatformX = tail.x + tail.width + 200
      
      // Update next platform ID
      setNextPlatformId(prev => prev + newPlatforms.length)

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

    // Remove coins far behind or collected
    st.coins = st.coins.filter((c) => !c.collected && c.x > camera.x - 100)
    // Remove old level boundaries
    st.levelBoundaries = st.levelBoundaries.filter((b) => b.x > camera.x - 200)

    // Move clouds
    st.clouds.forEach((cloud) => {
      cloud.x += st.gameSpeed * 0.5 * deltaMultiplier
    })

    // AI Mode: Simple and effective gameplay logic
    if (isAIMode && !st.isDead && player.onGround) {
      // Find the closest platform ahead
      const nextPlatform = platforms.find(p => p.x > player.x + 20 && p.x < player.x + 400)
      
      if (nextPlatform) {
        const playerCenterY = player.y + player.height / 2
        const platformCenterY = nextPlatform.y + nextPlatform.height / 2
        
        // Simple rule: if platform is far from current position, flip
        const verticalDistance = Math.abs(playerCenterY - platformCenterY)
        const needsFlip = verticalDistance > 80 // Platform is significantly off
        
        if (needsFlip) {
          // Check direction: should we flip?
          if (st.pullDirection > 0) {
            // Gravity down: flip if platform is above us
            if (platformCenterY < playerCenterY - 40) {
              st.pullDirection = -st.pullDirection
              // Instantly set velocity to strong pull in new direction
              player.velocityY = st.pullSpeed * st.pullDirection
              playVortexSound()
            }
          } else {
            // Gravity up: flip if platform is below us
            if (platformCenterY > playerCenterY + 40) {
              st.pullDirection = -st.pullDirection
              // Instantly set velocity to strong pull in new direction
              player.velocityY = st.pullSpeed * st.pullDirection
              playVortexSound()
            }
          }
        }
      }
    }

    // Horizontal input (disabled in AI mode)
    if (!isAIMode) {
      if (keysRef.current.has("a") || keysRef.current.has("arrowleft")) {
        player.velocityX = Math.max(player.velocityX - 0.2 * deltaMultiplier, -2.4)
      } else if (keysRef.current.has("d") || keysRef.current.has("arrowright")) {
        player.velocityX = Math.min(player.velocityX + 0.2 * deltaMultiplier, 3.2)
      } else {
        player.velocityX *= Math.pow(0.82, deltaMultiplier)
      }
    } else {
      // AI mode: minimal horizontal movement
      player.velocityX *= Math.pow(0.82, deltaMultiplier)
    }

    // Jump (opposite of gravity direction)
    if ((keysRef.current.has("w") || keysRef.current.has("arrowup")) && player.onGround) {
      player.velocityY = st.pullDirection > 0 ? -5 : 5
      player.onGround = false
    }

    // Dead state: fall through platforms off-screen
    if (st.isDead) {
      // Keep horizontal position fixed (no auto-scroll)
      player.velocityX = 0
      
      // Fast fall: constant downward movement to fall off-screen
      player.velocityY = 7 // Fast constant fall downward
    } else {
      // Hybrid pull gravity: strong base pull + accumulating acceleration
      if (!player.onGround) {
        // If just left ground, start with strong pull velocity
        if (player.wasOnGround) {
          player.velocityY = st.pullSpeed * st.pullDirection
        }
        // Add acceleration each frame (Reduced gravity: 0.60)
        player.velocityY += 0.60 * st.pullDirection * deltaMultiplier
      } else {
        player.velocityY = 0 // Locked to platform when grounded
      }
    }

    // Position
    player.x += player.velocityX * deltaMultiplier
    player.y += player.velocityY * deltaMultiplier

    // Platform collisions and scoring (skip when dead)
    if (!st.isDead) {
      player.wasOnGround = player.onGround
      player.onGround = false
    }
    
    for (const platform of st.platforms) {
      // Skip all platform interactions when dead
      if (st.isDead) {
        continue
      }
      // ============================================================================
      // FLAME COLLISION - Heals 1 damage state + gives 1 life
      // ============================================================================
      // State progression (reverse): Dead → State 3 → State 2 → State 1 (Idle)
      // Each flame touch moves back ONE state and adds 1 life (max 3)
      // ============================================================================
      if (!st.isDead && checkFireCollision(player, platform)) {
        const newLives = Math.min(lives + 1, 3) // Add 1 life (max 3)
        setLives(newLives)
        playSuccessSound() // Original flame sound
        playYeahBoySound() // New "yeah boy" sound
        st.fireStateStartTime = Date.now() // Fire visual effect for 1.8s
        console.log('🔥 FLAME TOUCHED! Fire state started at:', st.fireStateStartTime, {
          hasFireImages: !!fireStateImageRef.current,
          imageCount: fireStateImageRef.current?.length,
          images: fireStateImageRef.current
        })
        
        // Cancel invulnerability when touching flame
        st.invulnerable = false
        st.invulnerableTime = 0
        
        // FLAME HEALS: Reduce drop damage by 1 state
        st.dropHitCount = Math.max(0, st.dropHitCount - 1)
        
        // Mark flame as collected
        platform.hasFire = false
      }

      // ============================================================================
      // DROP COLLISION - Damages 1 state + removes 1 life
      // ============================================================================
      // State progression: Idle → State 2 → State 3 → Dead
      // Each drop increments damage state (no time window)
      // States persist until changed by flame healing
      // ============================================================================
      if (!st.invulnerable && !st.isDead && checkDropCollision(player, platform)) {
        playOuchSound()
        const newLives = lives - 1
        setLives(newLives)
        st.fireStateStartTime = 0 // Cancel fire visual effect
        
        const now = Date.now()
        
        // Simple increment: each drop = +1 damage state (no time window)
        st.dropHitCount++
        
        // Mark drop as collected IMMEDIATELY (before any early returns)
        platform.hasDrop = false
        
        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          // 3rd drop detected
          // 3rd drop: GAME OVER after 2-second delay
          st.isDead = true
          st.deadStartTime = now
          
          // Wait 2 seconds to show DEAD state before game over modal
          setTimeout(() => {
            saveScoreToHistory(score)
            setIsGameOver(true)
            setIsPlaying(false)
            playGameOverMusic()
          }, 2000)
          return
        }
        
        // Check if out of lives
        if (newLives <= 0) {
          // Out of lives: trigger death
          st.isDead = true
          st.deadStartTime = now
          
          // Wait 2 seconds to show DEAD state before game over modal
          setTimeout(() => {
            saveScoreToHistory(score)
            setIsGameOver(true)
            setIsPlaying(false)
            playGameOverMusic()
          }, 2000)
          return
        }
        
        // Normal drop hit: 1 second invulnerability
        st.invulnerable = true
        st.invulnerableTime = Date.now() + 1000
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

        const gravityPositive = st.pullDirection > 0

        if (gravityPositive) {
          if (minOverlap === overlapTop && player.velocityY > 0) {
            player.y = platformTop - player.height
            const wasFalling = player.velocityY > 0 // Check velocity before resetting
            player.velocityY = 0
            if (!player.wasOnGround && wasFalling) {
              // Only play landing sound when falling onto platform (not walking)
              // Only play landing sound if enough time has passed (200ms cooldown)
              const now = performance.now()
              if (now - st.lastLandTime > 200) {
                playLandSound()
                st.lastLandTime = now
              }
            }
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
            const wasFalling = player.velocityY < 0 // Check velocity before resetting
            player.velocityY = 0
            if (!player.wasOnGround && wasFalling) {
              // Only play landing sound when falling onto platform (not walking)
              // Only play landing sound if enough time has passed (200ms cooldown)
              const now = performance.now()
              if (now - st.lastLandTime > 200) {
                playLandSound()
                st.lastLandTime = now
              }
            }
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



    // Coin pickups
    for (const coin of st.coins) {
      if (coin.collected) continue
      if (
        !st.isDead &&
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

    // World bounds: game over once 60% is outside (skip if in DEAD state)
    if (!st.isDead) {
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

    // Camera and auto-scroll (pause when dead to show DEAD state)
    if (!st.isDead) {
      player.x += st.gameSpeed * deltaMultiplier
    }
    st.camera.x = player.x - CANVAS_W / 3
    st.camera.y = 0
  }, [
    isGameOver,
    isAIMode,
    lives,
    playOuchSound,
    playGameOverMusic,
    playBackgroundMusic,
    stopBackgroundMusic,
    playCoinCollectSound,
    playSuccessSound,
    playYeahBoySound,
    playLandSound,
    playLevelUpSound,
    playVortexSound,
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
    
    // Special rendering for edge state (frame 2) - Figma variant
    if (frame === 2) {
      // Draw edge view with subtle 3D effect (darker right edge)
      const barWidth = Math.max(1, w * 0.05) // Very thin bar
      const rightEdgeWidth = Math.max(0.5, barWidth * 0.3)
      
      // Main bar (golden-brown)
      ctx.fillStyle = "#daa520"
      ctx.fillRect(-barWidth / 2, -h / 2, barWidth, h)
      
      // Right edge (darker for 3D effect)
      ctx.fillStyle = "#b8860b"
      ctx.fillRect(barWidth / 2 - rightEdgeWidth, -h / 2, rightEdgeWidth, h)
      
      // Left highlight (lighter)
      ctx.fillStyle = "#ffd700"
      ctx.fillRect(-barWidth / 2, -h / 2, Math.max(0.5, barWidth * 0.2), h)
    } else {
      // Normal coin rendering for other frames
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
    }

    ctx.restore()
  }

  function drawStyledPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, collisionHeight: number) {
    // Simplified platform design for better performance
    // Visual heights (collision uses collisionHeight parameter)
    const grassH = 8
    const dirtH = 14
    const topRadius = 8 // Border radius for grass (top)
    const bottomRadius = 4 // Border radius for dirt (bottom)

    // Grass cap (simple gradient, no patches or fringe) - 8px rounded corners on top
    const grassTopY = y - grassH
    const grassGrad = ctx.createLinearGradient(0, grassTopY, 0, y)
    grassGrad.addColorStop(0, "#d7ff6a")
    grassGrad.addColorStop(1, "#b6ef53")
    ctx.fillStyle = grassGrad
    ctx.beginPath()
    ctx.moveTo(x + topRadius, grassTopY)
    ctx.lineTo(x + w - topRadius, grassTopY)
    ctx.arcTo(x + w, grassTopY, x + w, grassTopY + topRadius, topRadius)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, grassTopY + topRadius)
    ctx.arcTo(x, grassTopY, x + topRadius, grassTopY, topRadius)
    ctx.closePath()
    ctx.fill()

    // Dirt body (simple gradient, no waves or pebbles) - 4px rounded corners on bottom
    const dirtTopY = y
    const dirtGrad = ctx.createLinearGradient(0, dirtTopY, 0, dirtTopY + dirtH)
    dirtGrad.addColorStop(0, "#bf6b32")
    dirtGrad.addColorStop(1, "#8a421f")
    ctx.fillStyle = dirtGrad
    ctx.beginPath()
    ctx.moveTo(x, dirtTopY)
    ctx.lineTo(x + w, dirtTopY)
    ctx.lineTo(x + w, dirtTopY + dirtH - bottomRadius)
    ctx.arcTo(x + w, dirtTopY + dirtH, x + w - bottomRadius, dirtTopY + dirtH, bottomRadius)
    ctx.lineTo(x + bottomRadius, dirtTopY + dirtH)
    ctx.arcTo(x, dirtTopY + dirtH, x, dirtTopY + dirtH - bottomRadius, bottomRadius)
    ctx.lineTo(x, dirtTopY)
    ctx.closePath()
    ctx.fill()

    // Simple highlight line at top of grass (optional, minimal cost) - follows 8px rounded corner
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = "#f0ffb0"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + topRadius, grassTopY + 0.5)
    ctx.lineTo(x + w - topRadius, grassTopY + 0.5)
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
    const effectiveDir = st.pullDirection

    // Background with level-based colors - draw segments between boundaries
    ctx.imageSmoothingEnabled = false
    
    // Sort boundaries by x position
    const sortedBoundaries = [...st.levelBoundaries].sort((a, b) => a.x - b.x)
    
    // Draw background segments
    let startX = camera.x - 100
    let currentLevel = Math.floor(st.platformsPassed / 20) + 1
    
    // If we have boundaries, draw colored segments
    if (sortedBoundaries.length > 0) {
      // Draw segment before first boundary
      const firstBoundary = sortedBoundaries[0]
      const levelBeforeFirst = firstBoundary.level - 1
      ctx.fillStyle = getLevelBackgroundColor(levelBeforeFirst)
      const firstSegmentWidth = Math.max(0, firstBoundary.x - camera.x)
      ctx.fillRect(0, 0, firstSegmentWidth, canvas.height)
      
      // Draw segments between boundaries
      for (let i = 0; i < sortedBoundaries.length; i++) {
        const boundary = sortedBoundaries[i]
        const nextBoundary = sortedBoundaries[i + 1]
        
        ctx.fillStyle = getLevelBackgroundColor(boundary.level)
        const segmentStartX = boundary.x - camera.x
        const segmentWidth = nextBoundary 
          ? (nextBoundary.x - boundary.x)
          : (canvas.width - segmentStartX + 100)
        
        ctx.fillRect(segmentStartX, 0, segmentWidth, canvas.height)
      }
    } else {
      // No boundaries yet, use current level color
      ctx.fillStyle = getLevelBackgroundColor(currentLevel)
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

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
        if (cloudImageRef.current && cloudImageRef.current.length >= 2) {
          const cloudImage = cloudImageRef.current[cloud.type - 1] // type 1 -> index 0, type 2 -> index 1
          ctx.save()
          ctx.globalAlpha = cloud.opacity
          ctx.drawImage(cloudImage, cloud.x, cloud.y, cloud.width, cloud.height)
          ctx.restore()
        }
      }
    })

    // Advance fire frame every 300ms (outside loop to update once per render)
    const fireTime = Date.now()
    if (fireTime - lastFireFrameTimeRef.current > 300) {
      setCurrentFireFrame((prev) => (prev === 0 ? 1 : 0))
      lastFireFrameTimeRef.current = fireTime
    }

    // Platforms and platform fires
    platforms.forEach((platform, index) => {
      if (platform.x + platform.width > camera.x && platform.x < camera.x + canvas.width) {
        // Stylized platform (grass + fringe + dirt) for all devices
        drawStyledPlatform(ctx, platform.x, platform.y, platform.width, platform.height)


        // Platform fire drawing
        if (platform.hasFire && fireImageRef.current && Array.isArray(fireImageRef.current)) {
          const fireWidth = 35 // 30% bigger (27 * 1.3)
          const fireHeight = 42 // 30% bigger (32 * 1.3)
          
          // Position fire based on direction
          let fireY
          if (platform.dropDirection === 'up') {
            // Fire above platform (upright)
            fireY = platform.y - fireHeight - 1
          } else {
            // Fire below platform (upside down)
            fireY = platform.y + platform.height + 1
          }

          // Render single centered fire for all platforms
          const centerX = platform.x + (platform.width - fireWidth) / 2
          
          // If fire is below platform, flip it vertically
          if (platform.dropDirection === 'down') {
            ctx.save()
            ctx.translate(centerX + fireWidth / 2, fireY + fireHeight / 2)
            ctx.scale(1, -1)
            ctx.drawImage(fireImageRef.current[currentFireFrame], -fireWidth / 2, -fireHeight / 2, fireWidth, fireHeight)
            ctx.restore()
          } else {
            ctx.drawImage(fireImageRef.current[currentFireFrame], centerX, fireY, fireWidth, fireHeight)
          }
        }

        // Platform drop drawing
        if (platform.hasDrop && dropImageRef.current) {
          const dropWidth = 42
          const dropHeight = 42
          
          // Position drop based on direction
          let dropX, dropY
          if (platform.dropDirection === 'up') {
            // Drop above platform (upright)
            dropY = platform.y - dropHeight - 1
            dropX = platform.x + platform.width - dropWidth - 5
          } else {
            // Drop below platform (upside down)
            dropY = platform.y + platform.height + 1
            dropX = platform.x + platform.width - dropWidth - 5
          }
          
          // Render drop normally (not flipped) for both above and below platform
          ctx.drawImage(dropImageRef.current, dropX, dropY, dropWidth, dropHeight)
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
        // Per-coin phase to avoid synchronous flipping (stable from position)
        const phase = (Math.floor(coin.x * 0.07 + coin.y * 0.11) & 3) // 0..3
        const frame = (currentCoinFrame + phase) % 4
        if (coinImageRef.current && coinImageRef.current[frame]) {
          ctx.drawImage(coinImageRef.current[frame], coin.x, coin.y, coin.width, coin.height)
        } else {
          // Fallback to programmatic drawing if images aren't loaded
          drawCoin(ctx, coin.x, coin.y, coin.width, coin.height, frame)
        }
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



    // Player (with dead state, fire-state hurt animation)
    const now = Date.now()
    const timeSinceFireStart = now - st.fireStateStartTime
    const showFireState = timeSinceFireStart < 1800 && st.fireStateStartTime > 0 && !st.isDead
    
    // Debug log (only first 10 frames to avoid spam)
    if (showFireState && timeSinceFireStart < 1000) {
      console.log('🔥 FIRE STATE ACTIVE:', {
        timeSinceStart: timeSinceFireStart,
        hasImages: !!fireStateImageRef.current,
        imageArray: fireStateImageRef.current,
        frameIndex: Math.floor((timeSinceFireStart / 300) % 3)
      })
    }

    // Dead state rendering
    if (st.isDead) {
      
      ctx.save()
      
      if (st.pullDirection < 0) {
        ctx.translate(Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2))
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(Math.round(player.x), Math.round(player.y))
      }
      
      // Use DEAD.svg if loaded, otherwise fallback to normal character
      if (deadImageRef.current) {
        ctx.drawImage(deadImageRef.current, 0, 0, player.width, player.height)
      } else if (characterImageRef.current) {
        // Fallback: use first frame of normal character
        ctx.drawImage(characterImageRef.current[0], 0, 0, player.width, player.height)
      } else {
        // Last resort fallback: draw a dark red rectangle
        ctx.fillStyle = "#8B0000"
        ctx.fillRect(0, 0, player.width, player.height)
      }
      
      
      ctx.restore()
    } else if (showFireState && fireStateImageRef.current) {
      const idx = Math.floor((timeSinceFireStart / 300) % 3)
      console.log('🎨 DRAWING FIRE FRAME:', idx)
      ctx.save()
      
      if (st.pullDirection < 0) {
        ctx.translate(Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2))
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(Math.round(player.x), Math.round(player.y))
      }
      
      // Apply damage state filter
      if (st.dropHitCount === 1) {
        ctx.filter = 'saturate(0.6) brightness(0.8)'
      } else if (st.dropHitCount === 2) {
        ctx.filter = 'saturate(0) brightness(0.5)'
      } else {
        ctx.filter = 'saturate(1.2) brightness(1)'
      }
      
      ctx.drawImage(fireStateImageRef.current[idx], 0, 0, player.width, player.height)
      
      ctx.filter = 'none'
      ctx.restore()
    } else if (characterImageRef.current) {
      if (Date.now() - lastFrameTimeRef.current > 100) {
        setCurrentFrame((prev) => (prev + 1) % 3) // Back to 3 frames to match available images
        lastFrameTimeRef.current = Date.now()
      }
      ctx.save()
      
      if (st.pullDirection < 0) {
        ctx.translate(Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2))
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(Math.round(player.x), Math.round(player.y))
      }
      
      // Apply damage state filter
      if (st.dropHitCount === 1) {
        ctx.filter = 'saturate(0.6) brightness(0.8)'
      } else if (st.dropHitCount === 2) {
        ctx.filter = 'saturate(0) brightness(0.5)'
      } else {
        ctx.filter = 'saturate(1.2) brightness(1)'
      }
      
      ctx.drawImage(characterImageRef.current[currentFrame], 0, 0, player.width, player.height)
      
      ctx.filter = 'none'
      ctx.restore()
    } else {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x, player.y, player.width, player.height)
    }

    ctx.restore()
  }, [currentFrame, currentFireFrame, score, getLevelBackgroundColor])

  // Loop
  const gameLoop = useCallback((currentTime: number) => {
    if (isPlaying && !isGameOver) {
      // Calculate delta time for frame-rate independence
      const deltaTime = currentTime - lastGameTimeRef.current
      const deltaMultiplier = deltaTime / FRAME_TIME // 1.0 at 60fps, 2.0 at 30fps, 0.5 at 120fps
      lastGameTimeRef.current = currentTime
      
      updateGame(deltaMultiplier)
      render()
      // Update frame counter every 2 frames for smooth platform number movement
      setFrameCounter(prev => (prev + 1) % 2)
      animationFrameRef.current = requestAnimationFrame((nextTime) => gameLoop(nextTime))
    }
  }, [isPlaying, isGameOver, updateGame, render])

  // Start game loop when playing
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      lastGameTimeRef.current = performance.now() // Reset time reference
      animationFrameRef.current = requestAnimationFrame((time) => gameLoop(time))
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

  // Countdown logic: READY (500ms) → Start
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 'READY') {
      // Show READY for 500ms, then start game
      const timer = setTimeout(() => {
        setCountdown(null)
        initializeGame()
        setIsPlaying(true)
        playBackgroundMusic() // Start background music when game begins
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [countdown, initializeGame, playBackgroundMusic])

  return (
    <div className="flex flex-row items-start justify-center min-h-screen bg-gray-100 p-2 gap-4">
      {/* Main Game Area */}
      <div className="flex flex-col items-center">
      <BrandHeader 
        showPlatformNumbers={showPlatformNumbers} 
        setShowPlatformNumbers={setShowPlatformNumbers}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      {/* Top panel outside the game frame */}
      <div className="w-[390px]">
        <div
          className="px-4 py-[20px] rounded-t-lg rounded-b-none shadow-lg select-none"
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
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
                  width="26"
                  height="26"
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
      </div>

      {/* Countdown overlay - positioned at root level */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <img 
              src="/ready-1.svg" 
              alt="Ready" 
              className="w-64 h-auto select-none animate-pulse"
            />
          </div>
        </div>
      )}

      {/* Game Over Modal - positioned at root level */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
          {/* Main overlay panel */}
          <div
             className="bg-white rounded-2xl p-8 text-center shadow-2xl flex flex-col"
             style={{ fontFamily: "Rethink Sans, sans-serif", minWidth: "320px", maxWidth: "400px" }}
           >
                 {/* Brand Logo */}
                 <div className="mb-4 flex justify-center">
                   <img 
                     src="/brand.svg" 
                     alt="Brand Logo" 
                     className="w-32 h-auto select-none"
                   />
                 </div>

                 {/* Game Over Image */}
                 <div className="mb-6 flex justify-center">
                   <img 
                     src="/game-over.png" 
                     alt="Game Over" 
                     className="w-44 h-auto select-none"
                   />
                 </div>

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

                 {/* Scores grouped together */}
                 <div className="mb-8 flex-grow flex flex-col justify-center">
                   <p
                     className="text-xl text-black mb-2 select-none uppercase font-semibold"
                     style={{ fontFamily: "Instrument Sans, sans-serif" }}
                   >
                     Score: {score}
                   </p>
                   {getBestScore() > 0 && (
                     <div className="flex items-center justify-center gap-2">
                       <img src="/trophy-02.svg" alt="Trophy" className="w-5 h-5 select-none" style={{ filter: "grayscale(100%) brightness(0.5)" }} />
                       <p className="text-base text-black select-none uppercase font-medium" style={{ fontFamily: "Instrument Sans, sans-serif" }}>
                         Best Score: {getBestScore()}
                       </p>
                     </div>
                   )}
                 </div>

                 {/* Start Again Button - at bottom */}
                 <button
                   onClick={startAgain}
                   className="bg-black hover:bg-gray-900 text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 select-none mx-auto"
                   style={{ 
                     fontFamily: "Instrument Sans, sans-serif",
                     fontSize: "17px",
                     borderRadius: "40px",
                     width: "153px",
                     height: "53px"
                   }}
                 >
                   Start Again
                 </button>
            </div>
          </div>
        )}

      {/* Platform Numbers Display - positioned below each platform */}
      {showPlatformNumbers && gameStateRef.current && (
        <div className="relative w-[390px] h-[40px] mt-5">
          {gameStateRef.current.platforms
            .filter(p => {
              const camera = gameStateRef.current!.camera
              return p.x + p.width > camera.x && p.x < camera.x + CANVAS_W
            })
            .map(platform => {
              const camera = gameStateRef.current!.camera
              const screenX = platform.x + platform.width / 2 - camera.x
              // Only show if reasonably visible on screen
              if (screenX < -50 || screenX > CANVAS_W + 50) return null
              return (
                <span
                  key={platform.id}
                  className="absolute text-black font-bold text-lg px-2 py-1 bg-gray-200 rounded transition-none"
                  style={{ 
                    fontFamily: "Rethink Sans, sans-serif",
                    transform: `translate3d(${screenX}px, 0, 0) translateX(-50%)`,
                    willChange: 'transform',
                    top: '0px'
                  }}
                >
                  {platform.id}
                </span>
              )
            })
            .filter(Boolean)}
        </div>
      )}

      </div>
    </div>
  )
}
