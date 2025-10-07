#!/usr/bin/env python3
"""
1. Update countdown to READY only (0.5s)
2. Reorganize game over modal: Coal Jack title + grouped scores + button at bottom
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Update countdown to only READY for 500ms
old_countdown = """  // Countdown logic: READY (750ms) → GO (750ms) → Start
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 'READY') {
      // Show READY for 750ms, then GO
      const timer = setTimeout(() => {
        setCountdown('GO')
      }, 750)
      return () => clearTimeout(timer)
    }

    if (countdown === 'GO') {
      // Show GO for 750ms, then start game
      const timer = setTimeout(() => {
        setCountdown(null)
        initializeGame()
        setIsPlaying(true)
      }, 750)
      return () => clearTimeout(timer)
    }
  }, [countdown, initializeGame])"""

new_countdown = """  // Countdown logic: READY (500ms) → Start
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 'READY') {
      // Show READY for 500ms, then start game
      const timer = setTimeout(() => {
        setCountdown(null)
        initializeGame()
        setIsPlaying(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [countdown, initializeGame])"""

content = content.replace(old_countdown, new_countdown)

# 2. Reorganize game over modal
old_modal = """              <div
                className="bg-white rounded-2xl p-6 text-center shadow-2xl mx-3 pt-6"
                style={{ fontFamily: "Rethink Sans, sans-serif" }}
              >
                {/* Game Over text */}
                <h2
                  className="text-3xl font-bold text-red-600 mb-2 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  GAME OVER
                </h2>

                {/* Score */}
                <p
                  className="text-xl text-gray-600 mb-6 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  Score: {score}
                </p>

                {/* New Best Score notification */}
                {isNewBestScore && (
                  <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p
                      className="text-lg font-bold text-yellow-800 select-none"
                      style={{ fontFamily: "Rethink Sans, sans-serif" }}
                    >
                      🎉 NEW BEST SCORE! 🎉
                    </p>
                  </div>
                )}

                {/* Start Again Button */}
                <button
                  onClick={startAgain}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-2xl text-lg mb-3 transition-all duration-200 hover:scale-105 active:scale-95 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  START AGAIN
                </button>

                {/* Best Score */}
                {getBestScore() > 0 && (
                  <p className="text-base text-gray-500 select-none" style={{ fontFamily: "Rethink Sans, sans-serif" }}>
                    Best Score: {getBestScore()}
                  </p>
                )}
              </div>"""

new_modal = """              <div
                className="bg-white rounded-2xl p-8 text-center shadow-2xl mx-3 flex flex-col"
                style={{ fontFamily: "Rethink Sans, sans-serif", minWidth: "320px" }}
              >
                {/* Coal Jack Title */}
                <h1
                  className="text-2xl font-bold text-gray-800 mb-4 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  COAL JACK
                </h1>

                {/* Game Over text */}
                <h2
                  className="text-3xl font-bold text-red-600 mb-6 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  GAME OVER
                </h2>

                {/* New Best Score notification */}
                {isNewBestScore && (
                  <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p
                      className="text-lg font-bold text-yellow-800 select-none"
                      style={{ fontFamily: "Rethink Sans, sans-serif" }}
                    >
                      🎉 NEW BEST SCORE! 🎉
                    </p>
                  </div>
                )}

                {/* Scores grouped together */}
                <div className="mb-8 flex-grow flex flex-col justify-center">
                  <p
                    className="text-xl text-gray-600 mb-2 select-none"
                    style={{ fontFamily: "Rethink Sans, sans-serif" }}
                  >
                    Score: {score}
                  </p>
                  {getBestScore() > 0 && (
                    <p className="text-base text-gray-500 select-none" style={{ fontFamily: "Rethink Sans, sans-serif" }}>
                      Best Score: {getBestScore()}
                    </p>
                  )}
                </div>

                {/* Start Again Button - at bottom */}
                <button
                  onClick={startAgain}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-2xl text-lg transition-all duration-200 hover:scale-105 active:scale-95 select-none"
                  style={{ fontFamily: "Rethink Sans, sans-serif" }}
                >
                  START AGAIN
                </button>
              </div>"""

content = content.replace(old_modal, new_modal)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully reorganized game over modal")
print("  - Added 'COAL JACK' title on top")
print("  - Grouped Score and Best Score together")
print("  - Moved START AGAIN button to bottom")
