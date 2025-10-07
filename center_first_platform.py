#!/usr/bin/env python3
"""
Center the first platform vertically and place runner on top of it
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Calculate positions:
# Canvas height: 640px
# Vertical center: 320px
# Platform height: 6px
# Platform top (centered): 320 - 3 = 317px
# Runner height: 44px
# Runner top (on platform): 317 - 44 = 273px

# 1. Update first platform y position to be vertically centered
old_platform_1 = """    const platforms: Platform[] = [
      { x: 0, y: 160, width: pickRatioWidth() * 2, height: 6, color: "#8B4513", passed: false, hasFire: platform1Items.hasFire, hasDrop: platform1Items.hasDrop, dropDirection: platform1Items.dropDirection, id: 1 },"""

new_platform_1 = """    const platforms: Platform[] = [
      { x: 0, y: 317, width: pickRatioWidth() * 2, height: 6, color: "#8B4513", passed: false, hasFire: platform1Items.hasFire, hasDrop: platform1Items.hasDrop, dropDirection: platform1Items.dropDirection, id: 1 },"""

content = content.replace(old_platform_1, new_platform_1)

# 2. Update player starting position to be on top of first platform
old_player = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 114,
        width: 44,
        height: 44,"""

new_player = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 273,
        width: 44,
        height: 44,"""

content = content.replace(old_player, new_player)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ First platform centered and runner positioned on top!")
print("")
print("Canvas dimensions: 390x640px")
print("Vertical center: 320px")
print("")
print("Platform 1:")
print("  - Position: x: 0, y: 317px (vertically centered)")
print("  - Height: 6px")
print("  - Center: 320px")
print("")
print("Runner:")
print("  - Position: x: 20, y: 273px")
print("  - Height: 44px")
print("  - Positioned on top of Platform 1")

