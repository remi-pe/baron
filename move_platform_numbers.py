#!/usr/bin/env python3
"""
Move platform numbers outside canvas below the game area with 20px gap and black color
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Remove the canvas rendering of platform numbers
old_platform_numbers = """
        // Platform number (dev tool) - always at bottom of screen
        if (showPlatformNumbers && platform.id) {
          ctx.save()
          ctx.fillStyle = "#ff0000"
          ctx.font = "bold 20px Arial"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          const numberX = platform.x + platform.width / 2
          const numberY = CANVAS_H - 20 // 20px from bottom of screen
          ctx.fillText(platform.id.toString(), numberX, numberY)
          ctx.restore()
        }"""

content = content.replace(old_platform_numbers, '')

# 2. Add platform numbers display below canvas
# Find the canvas closing div tag and add numbers display before the closing </div>
old_canvas_section = """      </div>

    </div>
  )
}"""

new_canvas_section = """      </div>

      {/* Platform Numbers Display - below canvas */}
      {showPlatformNumbers && gameStateRef.current && (
        <div className="mt-5 w-[390px] min-h-[30px] flex items-center justify-center gap-3 flex-wrap">
          {gameStateRef.current.platforms
            .filter(p => {
              const camera = gameStateRef.current!.camera
              return p.x + p.width > camera.x && p.x < camera.x + CANVAS_W
            })
            .map(platform => {
              const camera = gameStateRef.current!.camera
              const screenX = platform.x + platform.width / 2 - camera.x
              // Only show if reasonably visible on screen
              if (screenX < -50 || screenX > CANVAS_W + 50) return null
              return (
                <span
                  key={platform.id}
                  className="text-black font-bold text-lg px-2 py-1 bg-gray-200 rounded"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  {platform.id}
                </span>
              )
            })
            .filter(Boolean)}
        </div>
      )}

    </div>
  )
}"""

content = content.replace(old_canvas_section, new_canvas_section)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully moved platform numbers below canvas")
print("  - Removed from canvas rendering")
print("  - Added below canvas with 20px gap")
print("  - Changed color: red → black")
print("  - Shows visible platform numbers in badge format")
