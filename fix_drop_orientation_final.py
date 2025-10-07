#!/usr/bin/env python3
"""
Fix drop orientation - both above and below platforms should be normal (not flipped)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Remove the flip logic entirely - render all drops normally
old_drop_render = """          // If drop is above platform ('up'), flip it vertically
          if (platform.dropDirection === 'up') {
            ctx.save()
            ctx.translate(dropX + dropWidth / 2, dropY + dropHeight / 2)
            ctx.scale(1, -1)
            ctx.drawImage(dropImageRef.current, -dropWidth / 2, -dropHeight / 2, dropWidth, dropHeight)
            ctx.restore()
          } else {
            // Drop below platform - render normally (not flipped)
            ctx.drawImage(dropImageRef.current, dropX, dropY, dropWidth, dropHeight)
          }"""

new_drop_render = """          // Render drop normally (not flipped) for both above and below platform
          ctx.drawImage(dropImageRef.current, dropX, dropY, dropWidth, dropHeight)"""

content = content.replace(old_drop_render, new_drop_render)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed drop orientation")
print("  - Drops under platforms (down): Normal orientation ✓")
print("  - Drops above platforms (up): Normal orientation ✓")
print("  - No flipping for any drops")

