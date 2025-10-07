#!/usr/bin/env python3
"""
Add a visual reference panel showing all 4 runner states on the side of the screen
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Find the return statement and add the states reference panel
# We'll add it before the main game div
old_return = """  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-2">
      <BrandHeader"""

new_return = """  return (
    <div className="flex flex-row items-start justify-center min-h-screen bg-gray-100 p-2 gap-4">
      {/* Runner States Reference Panel - Desktop Only */}
      <div className="hidden lg:block mt-20 bg-white rounded-lg shadow-lg p-4 border-2 border-gray-300">
        <h2 className="text-center font-bold text-gray-800 mb-4 text-sm">Runner States Reference</h2>
        <div className="flex flex-col gap-4">
          {/* State 1: Idle */}
          <div className="text-center">
            <div className="text-xs font-semibold text-gray-700 mb-2">State 1: Idle</div>
            <div className="text-xs text-gray-600 mb-1">Saturation: 120%</div>
            <div className="text-xs text-gray-600 mb-2">Brightness: 100%</div>
            <img 
              src="/Character_1.svg" 
              alt="State 1" 
              className="w-16 h-16 mx-auto"
              style={{ filter: 'saturate(1.2) brightness(1.0)' }}
            />
          </div>

          {/* State 2: Drop Hit 1 */}
          <div className="text-center border-t pt-4">
            <div className="text-xs font-semibold text-gray-700 mb-2">State 2: Drop Hit 1</div>
            <div className="text-xs text-gray-600 mb-1">Saturation: 60%</div>
            <div className="text-xs text-gray-600 mb-2">Brightness: 80%</div>
            <img 
              src="/Character_1.svg" 
              alt="State 2" 
              className="w-16 h-16 mx-auto"
              style={{ filter: 'saturate(0.6) brightness(0.8)' }}
            />
          </div>

          {/* State 3: Drop Hit 2 */}
          <div className="text-center border-t pt-4">
            <div className="text-xs font-semibold text-gray-700 mb-2">State 3: Drop Hit 2</div>
            <div className="text-xs text-gray-600 mb-1">Saturation: 0%</div>
            <div className="text-xs text-gray-600 mb-2">Brightness: 50%</div>
            <img 
              src="/Character_1.svg" 
              alt="State 3" 
              className="w-16 h-16 mx-auto"
              style={{ filter: 'saturate(0.0) brightness(0.5)' }}
            />
          </div>

          {/* State 4: Dead */}
          <div className="text-center border-t pt-4">
            <div className="text-xs font-semibold text-gray-700 mb-2">State 4: Dead</div>
            <div className="text-xs text-gray-600 mb-1">Uses DEAD.svg</div>
            <div className="text-xs text-gray-600 mb-2">Sat: 10%, Bright: 50%</div>
            <img 
              src="/DEAD.svg" 
              alt="State 4" 
              className="w-16 h-16 mx-auto"
              style={{ filter: 'saturate(0.1) brightness(0.5)' }}
            />
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col items-center">
      <BrandHeader"""

content = content.replace(old_return, new_return)

# Close the main game area div at the end
# Find the closing div before the end of return
old_closing = """      </div>
    </div>
  )
}"""

new_closing = """      </div>
      </div>
    </div>
  )
}"""

content = content.replace(old_closing, new_closing)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully added Runner States Reference Panel")
print("  - Shows all 4 states with titles and filter values")
print("  - Positioned on the left side (desktop only, hidden on mobile/tablet)")
print("  - State 1: Idle (120% sat, 100% bright)")
print("  - State 2: Drop Hit 1 (60% sat, 80% bright)")
print("  - State 3: Drop Hit 2 (0% sat, 50% bright)")
print("  - State 4: Dead (DEAD.svg with 10% sat, 50% bright)")

