#!/usr/bin/env python3
"""
Add debug logging to track dead state visibility
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Add debug logging at the start of dead state rendering
old_dead_rendering = """    // Dead state rendering
    if (st.isDead) {
      ctx.save()
      
      // Apply dead state filter (10% saturation, 50% brightness)
      ctx.filter = 'saturate(0.1) brightness(0.5)'"""

new_dead_rendering = """    // Dead state rendering
    if (st.isDead) {
      console.log('🔴 DEAD STATE RENDERING:', {
        isDead: st.isDead,
        playerX: player.x,
        playerY: player.y,
        cameraX: camera.x,
        deadImageLoaded: !!deadImageRef.current,
        characterImageLoaded: !!characterImageRef.current
      })
      
      ctx.save()
      
      // Apply dead state filter (10% saturation, 50% brightness)
      ctx.filter = 'saturate(0.1) brightness(0.5)'"""

content = content.replace(old_dead_rendering, new_dead_rendering)

# Add debug logging when 3rd drop is hit
old_third_drop = """        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          // 3rd drop: GAME OVER after 2-second delay
          st.isDead = true
          st.deadStartTime = now"""

new_third_drop = """        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          console.log('💀 3RD DROP HIT - ENTERING DEAD STATE:', {
            dropHitCount: st.dropHitCount,
            playerX: player.x,
            playerY: player.y,
            lives: newLives
          })
          // 3rd drop: GAME OVER after 2-second delay
          st.isDead = true
          st.deadStartTime = now"""

content = content.replace(old_third_drop, new_third_drop)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Added debug logging for dead state")
print("  - Logs when 3rd drop is hit")
print("  - Logs when dead state is rendering")
print("  - Check browser console to see what's happening")

