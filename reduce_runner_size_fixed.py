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

# 1. Update player width and height - use just the width/height lines
content = content.replace(
    'width: 46,\n        height: 46,',
    'width: 44,\n        height: 44,'
)

# 2. Update runnerHeight constant
content = content.replace(
    'const runnerHeight = 35',
    'const runnerHeight = 33'
)

# 3. Update spacing comments
content = content.replace(
    'const minSpacing = runnerHeight * 2 // 70px',
    'const minSpacing = runnerHeight * 2 // 66px'
)

content = content.replace(
    'const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (70px) - NEVER OVERRIDE',
    'const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (66px) - NEVER OVERRIDE'
)

# 4. Update the comment on runnerHeight
content = content.replace(
    'const runnerHeight = 33 // Character height (named "runner") - 10% bigger',
    'const runnerHeight = 33 // Character height (named "runner")'
)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Runner size reduced by 5%")
print("  - Player dimensions: 46x46 → 44x44 pixels")
print("  - Runner height constant: 35 → 33 pixels")
print("  - Minimum vertical spacing: 70px → 66px")
print("  - All visual states updated (Idle, Drop 1, Drop 2, Dead)")

