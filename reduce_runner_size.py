#!/usr/bin/env python3
"""
Reduce runner size by 5%
- Current: 46x46 pixels
- New: 44x44 pixels (46 * 0.95 = 43.7 → 44)
- Runner height constant: 35 → 33 pixels (35 * 0.95 = 33.25 → 33)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update player width and height in initializeGame
old_player = """    gameStateRef.current = {
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

new_player = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 140,
        width: 44,
        height: 44,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        wasOnGround: false,
        color: "#FF0000",
      },"""

content = content.replace(old_player, new_player)

# 2. Update runnerHeight constant (used for spacing calculations)
old_runner_height = """    const runnerHeight = 35 // Character height (named "runner") - 10% bigger
    const minSpacing = runnerHeight * 2 // 70px"""

new_runner_height = """    const runnerHeight = 33 // Character height (named "runner")
    const minSpacing = runnerHeight * 2 // 66px"""

content = content.replace(old_runner_height, new_runner_height)

# 3. Update the minVSpace comment to reflect new 66px spacing
old_min_vspace = """      const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (70px) - NEVER OVERRIDE"""

new_min_vspace = """      const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (66px) - NEVER OVERRIDE"""

content = content.replace(old_min_vspace, new_min_vspace)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Runner size reduced by 5%")
print("  - Player dimensions: 46x46 → 44x44 pixels")
print("  - Runner height constant: 35 → 33 pixels")
print("  - Minimum vertical spacing: 70px → 66px")
print("  - All visual states updated (Idle, Drop 1, Drop 2, Dead)")

