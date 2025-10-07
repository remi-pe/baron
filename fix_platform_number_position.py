#!/usr/bin/env python3
"""
Position platform numbers directly below each platform (aligned with platform center)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Replace the platform numbers section
old_numbers = """      {/* Platform Numbers Display - below canvas */}
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
      )}"""

new_numbers = """      {/* Platform Numbers Display - positioned below each platform */}
      {showPlatformNumbers && gameStateRef.current && (
        <div className="relative w-[390px] h-[40px] mt-5">
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
                  className="absolute text-black font-bold text-lg px-2 py-1 bg-gray-200 rounded"
                  style={{ 
                    fontFamily: "Rethink Sans, sans-serif",
                    left: `${screenX}px`,
                    transform: 'translateX(-50%)',
                    top: '0px'
                  }}
                >
                  {platform.id}
                </span>
              )
            })
            .filter(Boolean)}
        </div>
      )}"""

content = content.replace(old_numbers, new_numbers)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully repositioned platform numbers")
print("  - Each number is now positioned below its corresponding platform")
print("  - Numbers move with camera scroll (left to right)")
print("  - 20px gap below canvas maintained")
