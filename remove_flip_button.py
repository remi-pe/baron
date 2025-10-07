#!/usr/bin/env python3
"""
Remove the flip button CTA (users can use Space bar on desktop or tap screen on mobile)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Remove the flip button section
old_button = '''
      <div className="mt-3 flex gap-2 justify-center">
        <Button
          onClick={() => {
            if (gameStateRef.current && isPlaying && !isGameOver) doFlip()
          }}
          disabled={!isPlaying || isGameOver}
          className="select-none w-[390px] h-14 text-lg font-medium tracking-widest rounded-xl shadow-lg bg-[#4338ca] hover:bg-[#4338ca] active:bg-[#4338ca] text-white border-0"
          style={{ fontFamily: "Rethink Sans, sans-serif" }}
        >
          flip
        </Button>
      </div>'''

# Replace with empty string
content = content.replace(old_button, '')

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully removed flip button")
print("  - Desktop users can use Space bar")
print("  - Mobile users can tap anywhere on screen")
