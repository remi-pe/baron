#!/usr/bin/env python3
"""
Fix the remaining gravity logic - update gravityAccel usage to linear pull
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Fix the gravityAccel calculation line
old_accel_calc = """    const gravityAccel = st.gravityBase * st.pullDirection"""
new_accel_calc = """    // Linear pull system - no acceleration, just constant velocity"""

content = content.replace(old_accel_calc, new_accel_calc)

# 2. Replace the gravity integration logic
old_integration = """    } else {
      // Normal gravity integration
      player.velocityY += gravityAccel
    }"""

new_integration = """    } else {
      // Linear pull gravity (constant velocity, no acceleration)
      if (!player.onGround) {
        player.velocityY = st.pullSpeed * st.pullDirection
      } else {
        player.velocityY = 0 // Locked to platform when grounded
      }
    }"""

content = content.replace(old_integration, new_integration)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Gravity logic fixed!")
print("")
print("Changes:")
print("  - Removed gravityAccel calculation")
print("  - Updated gravity integration to use linear pull")
print("  - Added velocity locking when on ground")
print("")
print("Physics behavior:")
print("  - On ground: velocityY = 0 (locked)")
print("  - In air: velocityY = pullSpeed * pullDirection (constant)")
print("  - No acceleration, pure linear motion")

