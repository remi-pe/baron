#!/usr/bin/env python3
"""
Implement linear pull gravity system - replace acceleration with constant velocity
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update GameState interface - rename gravity variables
old_interface = """  // Gravity (instant flip)
  gravityBase: number // g0
  gravityCurrentDir: number // ±1 (1 for down, -1 for up)"""

new_interface = """  // Linear Pull Gravity (constant velocity)
  pullSpeed: number // Constant velocity toward gravity direction
  pullDirection: number // ±1 (1 for down, -1 for up)"""

content = content.replace(old_interface, new_interface)

# 2. Update initialization values
old_init = """      gravityBase: 0.357, // Reduced by 15% from 0.42
      gravityCurrentDir: 1,"""

new_init = """      pullSpeed: 4.0, // Constant pull speed (linear, not acceleration)
      pullDirection: 1, // Start pulling down"""

content = content.replace(old_init, new_init)

# 3. Update physics logic - replace acceleration with constant velocity
old_physics = """    // Apply gravity
    if (!player.onGround) {
      player.velocityY += st.gravityBase * st.gravityCurrentDir
    }"""

new_physics = """    // Apply linear pull (constant velocity, no acceleration)
    if (!player.onGround) {
      player.velocityY = st.pullSpeed * st.pullDirection
    } else {
      player.velocityY = 0 // Locked to platform when grounded
    }"""

content = content.replace(old_physics, new_physics)

# 4. Update gravity flip logic
old_flip = """      st.gravityCurrentDir *= -1"""

new_flip = """      st.pullDirection *= -1"""

content = content.replace(old_flip, new_flip)

# 5. Update any other references to gravityCurrentDir
content = content.replace("st.gravityCurrentDir", "st.pullDirection")

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Linear pull gravity system implemented!")
print("")
print("Changes made:")
print("  1. Renamed gravityBase → pullSpeed (4.0)")
print("  2. Renamed gravityCurrentDir → pullDirection")
print("  3. Replaced acceleration physics with constant velocity")
print("  4. Added velocity locking when on ground")
print("  5. Updated gravity flip logic")
print("")
print("New behavior:")
print("  - Runner falls/rises at constant speed (no acceleration)")
print("  - pullSpeed: 4.0 pixels/frame (240 px/sec at 60 FPS)")
print("  - Predictable, consistent motion")
print("  - Classic platformer feel")

