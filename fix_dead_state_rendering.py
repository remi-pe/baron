#!/usr/bin/env python3
"""
Fix dead state rendering to always show the runner, even if DEAD.svg fails to load.
Add fallback rendering using the normal character image with DEAD state filters.
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Find and replace the dead state rendering to include a fallback
old_dead_rendering = """    // Dead state rendering
    if (st.isDead && deadImageRef.current) {
      ctx.save()
      
      if (st.gravityCurrentDir < 0) {
        ctx.translate(Math.round(player.x + player.width / 2), Math.round(player.y + player.height / 2))
        ctx.scale(1, -1)
        ctx.translate(-player.width / 2, -player.height / 2)
      } else {
        ctx.translate(Math.round(player.x), Math.round(player.y))
      }
      
      ctx.drawImage(deadImageRef.current, 0, 0, player.width, player.height)
      ctx.restore()
    } else if (showFireState && fireStateImageRef.current) {"""

new_dead_rendering = """    // Dead state rendering
    if (st.isDead) {
      ctx.save()
      
      // Apply dead state filter (10% saturation, 50% brightness)
      ctx.filter = 'saturate(0.1) brightness(0.5)'
      
      if (st.gravityCurrentDir < 0) {
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
        // Fallback: use first frame of normal character with dead filter
        ctx.drawImage(characterImageRef.current[0], 0, 0, player.width, player.height)
      } else {
        // Last resort fallback: draw a red rectangle
        ctx.fillStyle = "#8B0000"
        ctx.fillRect(0, 0, player.width, player.height)
      }
      
      ctx.restore()
    } else if (showFireState && fireStateImageRef.current) {"""

content = content.replace(old_dead_rendering, new_dead_rendering)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed dead state rendering with fallback")
print("  - Dead state now always renders, even if DEAD.svg fails to load")
print("  - Priority: DEAD.svg → Character frame 0 with filter → Red rectangle")
print("  - All options use dead state filter (10% sat, 50% bright)")

