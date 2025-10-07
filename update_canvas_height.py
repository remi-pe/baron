#!/usr/bin/env python3
"""
Update canvas height to 640px
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Update canvas height
content = content.replace('const CANVAS_H = 540', 'const CANVAS_H = 640')

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Canvas height updated to 640px")
print("  - Canvas: 390x640 pixels")
print("  - Platform bounds: 64px margins top/bottom maintained")
