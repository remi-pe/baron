#!/usr/bin/env python3
"""
Increase pull speed by 30% (4.0 → 5.2)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Update pullSpeed from 4.0 to 5.2 (30% increase)
old_pull_speed = """      pullSpeed: 4.0, // Constant pull speed (linear, not acceleration)"""
new_pull_speed = """      pullSpeed: 5.2, // Constant pull speed (30% stronger)"""

content = content.replace(old_pull_speed, new_pull_speed)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Pull speed increased by 30%!")
print("")
print("Old value: 4.0 pixels/frame (240 px/sec)")
print("New value: 5.2 pixels/frame (312 px/sec)")
print("")
print("Result: Faster, stronger gravity pull")

