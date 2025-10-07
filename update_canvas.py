#!/usr/bin/env python3
"""
Update canvas size from 390x468 to 390x540 with equal 64px margins
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update canvas height
content = content.replace('const CANVAS_H = 468', 'const CANVAS_H = 540')

# 2. Update platform generation margins (equal 64px spacing)
content = content.replace('TOP_BOUND + 48', 'TOP_BOUND + 64')
content = content.replace('BOTTOM_BOUND - platformHeight - 56', 'BOTTOM_BOUND - platformHeight - 64')
content = content.replace('BOTTOM_BOUND - pHeight - 56', 'BOTTOM_BOUND - pHeight - 64')

# 3. Update p13 placement bounds  
content = content.replace('TOP_BOUND + 32', 'TOP_BOUND + 64')
content = content.replace('BOTTOM_BOUND - 32', 'BOTTOM_BOUND - 64')

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully updated canvas to 390x540 with equal 64px margins")
print("Changes made:")
print("  - Canvas height: 468 → 540")
print("  - Top margin: 48px → 64px")
print("  - Bottom margin: 56px → 64px")
print("  - Playable area: 356px → 412px")

