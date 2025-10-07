#!/usr/bin/env python3
"""
Fix game starting position:
1. Make first platform twice as long
2. Position runner on top of first platform
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Make platform 1 twice as long
# Platform 1 is at y: 160, current width: pickRatioWidth()
old_platform_1 = "{ x: 0, y: 160, width: pickRatioWidth(), height: 6, color: \"#8B4513\", passed: false, hasFire: platform1Items.hasFire, hasDrop: platform1Items.hasDrop, dropDirection: platform1Items.dropDirection, id: 1 },"

new_platform_1 = "{ x: 0, y: 160, width: pickRatioWidth() * 2, height: 6, color: \"#8B4513\", passed: false, hasFire: platform1Items.hasFire, hasDrop: platform1Items.hasDrop, dropDirection: platform1Items.dropDirection, id: 1 },"

content = content.replace(old_platform_1, new_platform_1)

# 2. Position player on top of platform 1
# Platform is at y: 160, height: 6
# Player height: 46
# Player should be at y: 160 - 46 = 114 (on top of platform)
old_player_position = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 140,
        width: 46,
        height: 46,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        wasOnGround: false,
        color: "#FF0000",
      },"""

new_player_position = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 114,
        width: 46,
        height: 46,
        velocityX: 0,
        velocityY: 0,
        onGround: true,
        wasOnGround: false,
        color: "#FF0000",
      },"""

content = content.replace(old_player_position, new_player_position)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed game starting position")
print("  - Platform 1: width doubled (pickRatioWidth() * 2)")
print("  - Runner: positioned on top of platform 1")
print("  - Runner y: 140 → 114 (on platform at y: 160)")
print("  - Runner onGround: false → true (starts grounded)")

