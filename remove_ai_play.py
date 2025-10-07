#!/usr/bin/env python3
"""
Remove AI PLAY button from game over modal
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Remove the AI Play button section
old_ai_button = """
                {/* AI Play Button */}
                <button
                  onClick={startAIPlay}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-2xl text-lg mb-4 transition-all duration-200 hover:scale-105 active:scale-95 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  AI PLAY
                </button>
"""

# Replace with empty string
content = content.replace(old_ai_button, '')

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully removed AI PLAY button")
print("  - Game over modal now only shows START AGAIN button")
