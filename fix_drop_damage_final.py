#!/usr/bin/env python3
"""
Fix drop damage system - remove window logic completely
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Replace the complex window logic with simple increment
old_logic = """        const now = Date.now()
        
        // Check if within 2-second window of first drop in sequence
        if (st.dropHitStartTime > 0 && (now - st.dropHitStartTime) <= 2000) {
          // Within window: increment damage state
          st.dropHitCount++
          // Timer keeps running from first drop
        } else {
          // Outside window or first drop: start new damage sequence
          st.dropHitCount = 1
          st.dropHitStartTime = now // Start 2-second window
        }
        
        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          console.log('💀 3RD DROP HIT - ENTERING DEAD STATE:', {
            dropHitCount: st.dropHitCount,
            playerX: player.x,
            playerY: player.y,
            lives: newLives
          })"""

new_logic = """        const now = Date.now()
        
        // Simple increment: each drop = +1 damage state (no time window)
        st.dropHitCount++
        
        console.log('💧 DROP HIT:', {
          dropHitCount: st.dropHitCount,
          newLives: newLives,
          playerX: player.x,
          playerY: player.y
        })
        
        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          console.log('💀 3RD DROP - ENTERING DEAD STATE')"""

content = content.replace(old_logic, new_logic)

# Update the header comments
old_comments = """      // State progression: Idle → State 2 → State 3 → Dead
      // Drops within 2-second window accumulate damage
      // After 2 seconds, damage resets to State 2 (fresh sequence)
      // ============================================================================"""

new_comments = """      // State progression: Idle → State 2 → State 3 → Dead
      // Each drop increments damage state (no time window)
      // States persist until changed by flame healing
      // ============================================================================"""

content = content.replace(old_comments, new_comments)

# Update the last comment
old_comment_2 = """        // Normal drop hit (1st or 2nd): 1 second invulnerability"""

new_comment_2 = """        // Normal drop hit: 1 second invulnerability"""

content = content.replace(old_comment_2, new_comment_2)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Drop damage system simplified!")
print("")
print("New logic:")
print("  - Each drop = +1 damage state (no time limit)")
print("  - State 1 → Drop → State 2")
print("  - State 2 → Drop → State 3")
print("  - State 3 → Drop → Dead")
print("")
print("  - Each flame = -1 damage state")
print("  - State 3 → Flame → State 2")
print("  - State 2 → Flame → State 1")

