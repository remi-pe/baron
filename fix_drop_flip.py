#!/usr/bin/env python3
"""
Fix drop image flipping - drops under platforms should be normal (not flipped)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Find and replace the drop rendering logic
# Currently: flips when dropDirection === 'down'
# Should: flip when dropDirection === 'up' (or just don't flip at all for 'down')
old_drop_render = """          // If drop is below platform, flip it vertically
          if (platform.dropDirection === 'down') {
            ctx.save()
            ctx.translate(dropX + dropWidth / 2, dropY + dropHeight / 2)
            ctx.scale(1, -1)
            ctx.drawImage(dropImageRef.current, -dropWidth / 2, -dropHeight / 2, dropWidth, dropHeight)
            ctx.restore()
          } else {
            ctx.drawImage(dropImageRef.current, dropX, dropY, dropWidth, dropHeight)
          }"""

new_drop_render = """          // If drop is above platform ('up'), flip it vertically
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

content = content.replace(old_drop_render, new_drop_render)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed drop image flipping")
print("  - Drops under platforms (down): Normal orientation")
print("  - Drops above platforms (up): Flipped vertically")

