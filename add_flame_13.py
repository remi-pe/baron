#!/usr/bin/env python3
"""
Add flame to platform 13 and update countdown to READY → GO
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Add flame to platform 13
content = content.replace(
    "13: { hasFire: false, hasDrop: false, dropDirection: 'down' },     // nothing",
    "13: { hasFire: true, hasDrop: false, dropDirection: 'down' },      // flame (down)"
)

# 2. Update countdown state type
content = content.replace(
    'const [countdown, setCountdown] = useState<number | null>(null)',
    "const [countdown, setCountdown] = useState<'READY' | 'GO' | null>(null)"
)

# 3. Update startAgain to use 'READY'
content = content.replace(
    "setCountdown(3) // Start countdown from 3",
    "setCountdown('READY') // Start countdown: READY → GO"
)

# 4. Update countdown logic
old_countdown_logic = """  // Countdown logic
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      // Start the game when countdown reaches 0
      setCountdown(null)
      initializeGame()
      setIsPlaying(true)
      return
    }

    // Countdown timer
    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, initializeGame])"""

new_countdown_logic = """  // Countdown logic: READY (750ms) → GO (750ms) → Start
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 'READY') {
      // Show READY for 750ms, then GO
      const timer = setTimeout(() => {
        setCountdown('GO')
      }, 750)
      return () => clearTimeout(timer)
    }

    if (countdown === 'GO') {
      // Show GO for 750ms, then start game
      const timer = setTimeout(() => {
        setCountdown(null)
        initializeGame()
        setIsPlaying(true)
      }, 750)
      return () => clearTimeout(timer)
    }
  }, [countdown, initializeGame])"""

content = content.replace(old_countdown_logic, new_countdown_logic)

# 5. Update display logic
content = content.replace(
    "{countdown === 0 ? 'GO!' : countdown}",
    "{countdown === 'GO' ? 'GO!' : countdown}"
)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully updated:")
print("  - Platform 13: Added flame (down)")
print("  - Countdown: 3,2,1,GO → READY,GO (1.5s total)")

