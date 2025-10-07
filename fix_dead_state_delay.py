#!/usr/bin/env python3
"""
Fix: Prevent world bounds check from interrupting the 2-second DEAD state delay.

The problem:
- Runner hits 3rd drop → enters DEAD state → starts falling
- Falls out of world bounds → world bounds check triggers immediate game over
- This interrupts the 2-second setTimeout delay

The solution:
- Skip world bounds check when runner is in DEAD state
- Let the setTimeout handle game over after 2 seconds
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Update world bounds check to skip when dead
old_bounds_check = """    // World bounds: game over once 60% is outside
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
    }"""

new_bounds_check = """    // World bounds: game over once 60% is outside (skip if in DEAD state)
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
    }"""

content = content.replace(old_bounds_check, new_bounds_check)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed 2-second delay for 3rd drop death")
print("  - World bounds check now skipped when runner is in DEAD state")
print("  - setTimeout can now complete its 2-second delay uninterrupted")
print("  - Game over modal will appear exactly 2 seconds after 3rd drop hit")

