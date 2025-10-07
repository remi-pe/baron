#!/usr/bin/env python3
"""
Make platforms 20% thinner
- Current thickness: 8px
- New thickness: 6px (8 * 0.8 = 6.4 → 6)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update platformHeight constant in generatePlatforms function
content = content.replace(
    'const platformHeight = 8',
    'const platformHeight = 6'
)

# 2. Update all initial platform heights (5 platforms)
content = content.replace(
    'height: 8,',
    'height: 6,'
)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Platforms are now 20% thinner")
print("  - Platform height: 8px → 6px")
print("  - Applied to all platforms (initial + dynamically generated)")

