#!/usr/bin/env python3
"""
Increase runner size by 10% across all states
- Current: 42x42 pixels
- New: 46x46 pixels (42 * 1.1 = 46.2 → 46)
- Also update runnerHeight constant: 32 → 35 (32 * 1.1 = 35.2 → 35)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update player width and height in initializeGame
old_player = """    gameStateRef.current = {
      player: {
        x: 20,
        y: 140,
        width: 42,
        height: 42,
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
        width: 46,
        height: 46,
        velocityX: 0,
        velocityY: 0,
        onGround: false,
        wasOnGround: false,
        color: "#FF0000",
      },"""

content = content.replace(old_player, new_player)

# 2. Update runnerHeight constant (used for spacing calculations)
old_runner_height = """    const runnerHeight = 32 // Character height (named "runner")
    const minSpacing = runnerHeight * 2 // 64px"""

new_runner_height = """    const runnerHeight = 35 // Character height (named "runner") - 10% bigger
    const minSpacing = runnerHeight * 2 // 70px"""

content = content.replace(old_runner_height, new_runner_height)

# 3. Update the minVSpace comment to reflect new 70px spacing
old_min_vspace = """      const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (64px) - NEVER OVERRIDE"""

new_min_vspace = """      const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (70px) - NEVER OVERRIDE"""

content = content.replace(old_min_vspace, new_min_vspace)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Runner size increased by 10%")
print("  - Player dimensions: 42x42 → 46x46 pixels")
print("  - Runner height constant: 32 → 35 pixels")
print("  - Minimum vertical spacing: 64px → 70px")
print("  - All visual states will use the new size (Idle, Drop 1, Drop 2, Dead)")

