#!/usr/bin/env python3
"""
Update countdown to only show READY for 0.5 seconds
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Update countdown logic to only show READY for 0.5s
old_countdown_logic = """  // Countdown logic: READY (750ms) → GO (750ms) → Start
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

new_countdown_logic = """  // Countdown logic: READY (500ms) → Start
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 'READY') {
      // Show READY for 500ms, then start game
      const timer = setTimeout(() => {
        setCountdown(null)
        initializeGame()
        setIsPlaying(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [countdown, initializeGame])"""

content = content.replace(old_countdown_logic, new_countdown_logic)

# Update display to remove the GO check
old_display = "{countdown === 'GO' ? 'GO!' : countdown}"
new_display = "{countdown}"

content = content.replace(old_display, new_display)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully updated countdown")
print("  - Shows: READY only")
print("  - Duration: 500ms (0.5 seconds)")
print("  - Then game starts immediately")
