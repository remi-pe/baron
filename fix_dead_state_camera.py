#!/usr:bin/env python3
"""
Fix: Stop auto-scroll when runner is dead so DEAD state stays visible

The problem:
- Game auto-scrolls: player.x += st.gameSpeed
- Camera follows: st.camera.x = player.x - CANVAS_W / 3
- Even when dead, auto-scroll continues
- Camera moves forward, dead runner goes off-screen to the left

The solution:
- Only auto-scroll when NOT dead
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Find and replace the camera/auto-scroll section
old_auto_scroll = """    // Camera and auto-scroll
    st.camera.x = player.x - CANVAS_W / 3
    st.camera.y = 0
    player.x += st.gameSpeed"""

new_auto_scroll = """    // Camera and auto-scroll (pause when dead to show DEAD state)
    if (!st.isDead) {
      player.x += st.gameSpeed
    }
    st.camera.x = player.x - CANVAS_W / 3
    st.camera.y = 0"""

content = content.replace(old_auto_scroll, new_auto_scroll)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed dead state visibility")
print("  - Auto-scroll now stops when runner is dead")
print("  - Camera stays with dead runner")
print("  - DEAD.svg will be visible for full 2 seconds")

