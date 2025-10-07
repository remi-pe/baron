#!/usr/bin/env python3
"""
Increase minimum vertical spacing from 32px to 64px (should never be overwritten)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Update minimum vertical spacing to 64px (2x runner height)
content = content.replace(
    'const minVSpace = runnerHeight // Minimum vertical gap = runner height',
    'const minVSpace = runnerHeight * 2 // Minimum vertical gap = 2x runner height (64px) - NEVER OVERRIDE'
)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully increased minimum vertical spacing")
print("  - Minimum vertical gap: 32px → 64px")
print("  - This spacing will NOT be overwritten in any case")
