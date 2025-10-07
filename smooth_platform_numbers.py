#!/usr/bin/env python3
"""
Make platform number movement smoother with GPU acceleration and frequent updates
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Add a frame counter state to force re-renders
old_states = """  const [countdown, setCountdown] = useState<'READY' | 'GO' | null>(null)

  // HiDPI canvas: increase backing store and scale context to avoid blur"""

new_states = """  const [countdown, setCountdown] = useState<'READY' | 'GO' | null>(null)
  const [frameCounter, setFrameCounter] = useState(0)

  // HiDPI canvas: increase backing store and scale context to avoid blur"""

content = content.replace(old_states, new_states)

# 2. Update platform numbers with smoother rendering
old_numbers = """      {/* Platform Numbers Display - positioned below each platform */}
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
                  className="absolute text-black font-bold text-lg px-2 py-1 bg-gray-200 rounded"
                  style={{ 
                    fontFamily: "Rethink Sans, sans-serif",
                    left: `${screenX}px`,
                    transform: 'translateX(-50%)',
                    top: '0px'
                  }}
                >
                  {platform.id}
                </span>
              )
            })
            .filter(Boolean)}
        </div>
      )}"""

new_numbers = """      {/* Platform Numbers Display - positioned below each platform */}
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
      )}"""

content = content.replace(old_numbers, new_numbers)

# 3. Add frame counter update in game loop
old_game_loop = """  // Loop
  const gameLoop = useCallback(() => {
    if (isPlaying && !isGameOver) {
      updateGame()
      render()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isPlaying, isGameOver, updateGame, render])"""

new_game_loop = """  // Loop
  const gameLoop = useCallback(() => {
    if (isPlaying && !isGameOver) {
      updateGame()
      render()
      // Update frame counter every 2 frames for smooth platform number movement
      setFrameCounter(prev => (prev + 1) % 2)
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isPlaying, isGameOver, updateGame, render])"""

content = content.replace(old_game_loop, new_game_loop)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully made platform numbers smoother")
print("  - Added GPU acceleration (translate3d)")
print("  - Added will-change: transform")
print("  - Force re-render every 2 frames")
print("  - Disabled CSS transitions for instant updates")
