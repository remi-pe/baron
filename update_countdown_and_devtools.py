#!/usr/bin/env python3
"""
1. Hide Dev Tools on mobile (only show on desktop)
2. Change countdown from "READY" to "Ready?" and make it 40% smaller
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Add mobile detection hook at the beginning of BrandHeader component
# Find the BrandHeader function and add useState for mobile detection
old_brand_header = """  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const toggleSound = (key: keyof typeof soundEnabled) => {
    setSoundEnabled({ ...soundEnabled, [key]: !soundEnabled[key] })
  }

  return (
    <div className="w-full max-w-[800px] mb-3 relative z-[100]">
      {/* Dev Tools Dropdown Button */}
      <div className="flex justify-center">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 relative z-[100]"
        >
          🛠️ Dev Tools"""

new_brand_header = """  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSound = (key: keyof typeof soundEnabled) => {
    setSoundEnabled({ ...soundEnabled, [key]: !soundEnabled[key] })
  }

  return (
    <div className="w-full max-w-[800px] mb-3 relative z-[100]">
      {/* Dev Tools Dropdown Button - Desktop Only */}
      {!isMobile && (
        <div className="flex justify-center">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 relative z-[100]"
          >
            🛠️ Dev Tools"""

content = content.replace(old_brand_header, new_brand_header)

# 2. Close the conditional wrapper after the button
old_button_close = """          </svg>
        </button>
      </div>

      {/* Dropdown Content */}"""

new_button_close = """          </svg>
          </button>
        </div>
      )}

      {/* Dropdown Content */}"""

content = content.replace(old_button_close, new_button_close)

# 3. Change countdown text from "READY" to "Ready?" and make it 40% smaller (text-6xl to text-4xl)
old_countdown_display = """              <div
                className="text-6xl font-bold text-white drop-shadow-2xl select-none animate-pulse"
                style={{ fontFamily: "Rethink Sans, sans-serif" }}
              >
                {countdown}
              </div>"""

new_countdown_display = """              <div
                className="text-4xl font-bold text-white drop-shadow-2xl select-none animate-pulse"
                style={{ fontFamily: "Rethink Sans, sans-serif" }}
              >
                {countdown === 'READY' ? 'Ready?' : countdown}
              </div>"""

content = content.replace(old_countdown_display, new_countdown_display)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully updated:")
print("  1. Dev Tools: Hidden on mobile (< 768px), visible on desktop")
print("  2. Countdown: Changed 'READY' to 'Ready?' and reduced size by 40% (text-6xl → text-4xl)")

