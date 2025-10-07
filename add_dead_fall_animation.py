#!/usr/bin/env python3
"""
Add vertical fall animation for dead state:
- Keep horizontal position (no x movement)
- Fall vertically toward bottom of screen
- Fall duration: 1.5 seconds
- After 1.5s, runner should be off-screen (below canvas bottom)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Replace the dead state freeze with a vertical fall animation
old_dead_movement = """    // Dead state: freeze in place to show DEAD state
    if (st.isDead) {
      // Stop all movement - stay visible for 2 seconds
      player.velocityX = 0
      player.velocityY = 0
    } else {
      // Normal gravity integration
      player.velocityY += gravityAccel
    }

    // Position (only update if not dead)
    if (!st.isDead) {
      player.x += player.velocityX
      player.y += player.velocityY
    }"""

new_dead_movement = """    // Dead state: vertical fall animation
    if (st.isDead) {
      const deadElapsed = (now - st.deadStartTime) / 1000 // seconds since death
      
      // Keep horizontal position fixed
      player.velocityX = 0
      
      // Vertical fall: accelerate downward over 1.5 seconds
      // Goal: fall off-screen (640px canvas height) in 1.5 seconds
      if (deadElapsed < 1.5) {
        // Accelerating fall: speed increases from 0 to ~600 px/s over 1.5s
        const fallAcceleration = 400 // pixels per second squared
        player.velocityY = fallAcceleration * deadElapsed // Always fall downward (positive Y)
      } else {
        // After 1.5s, maintain high speed to ensure off-screen
        player.velocityY = 600
      }
    } else {
      // Normal gravity integration
      player.velocityY += gravityAccel
    }

    // Position
    player.x += player.velocityX
    player.y += player.velocityY"""

content = content.replace(old_dead_movement, new_dead_movement)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Added vertical fall animation for dead state")
print("  - Horizontal position: FIXED (no x movement)")
print("  - Vertical fall: Accelerates downward")
print("  - Duration: 1.5 seconds to go off-screen")
print("  - Fall speed: 0 → 600 px/s (accelerating)")

