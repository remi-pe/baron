#!/usr/bin/env python3
"""
Fix: 3rd drop should ALWAYS lead to Game Over after 2-second delay
Currently: 3rd drop only triggers temporary death if player has lives
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Replace the drop collision logic to check for 3rd drop BEFORE checking lives
old_logic = """        // Check if game over
        if (newLives <= 0) {
          // Out of lives: trigger death
          st.isDead = true
          st.deadStartTime = now
          
          // Wait 2 seconds to show DEAD state before game over modal
          setTimeout(() => {
            saveScoreToHistory(score)
            setIsGameOver(true)
            setIsPlaying(false)
            playGameOverMusic()
          }, 2000)
          return
        }
        
        // Still have lives: check damage state
        if (st.dropHitCount >= 3) {
          // 3rd drop penalty: show DEAD state for 2 seconds
          st.isDead = true
          st.deadStartTime = now
          
          // Respawn after 2 seconds if lives remain
          setTimeout(() => {
            if (gameStateRef.current) {
              gameStateRef.current.isDead = false
              gameStateRef.current.dropHitCount = 0 // Reset to Idle after death penalty
              gameStateRef.current.dropHitStartTime = 0
              gameStateRef.current.invulnerable = true
              gameStateRef.current.invulnerableTime = Date.now() + 2000
            }
          }, 2000)
        } else {
          // Normal drop hit: 1 second invulnerability (allows stacking within 2s window)
          st.invulnerable = true
          st.invulnerableTime = Date.now() + 1000
        }"""

new_logic = """        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          // 3rd drop: GAME OVER after 2-second delay
          st.isDead = true
          st.deadStartTime = now
          
          // Wait 2 seconds to show DEAD state before game over modal
          setTimeout(() => {
            saveScoreToHistory(score)
            setIsGameOver(true)
            setIsPlaying(false)
            playGameOverMusic()
          }, 2000)
          return
        }
        
        // Check if out of lives
        if (newLives <= 0) {
          // Out of lives: trigger death
          st.isDead = true
          st.deadStartTime = now
          
          // Wait 2 seconds to show DEAD state before game over modal
          setTimeout(() => {
            saveScoreToHistory(score)
            setIsGameOver(true)
            setIsPlaying(false)
            playGameOverMusic()
          }, 2000)
          return
        }
        
        // Normal drop hit (1st or 2nd): 1 second invulnerability
        st.invulnerable = true
        st.invulnerableTime = Date.now() + 1000"""

content = content.replace(old_logic, new_logic)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed 3rd drop game over logic")
print("  - 3rd drop now ALWAYS leads to Game Over")
print("  - 2-second delay shows DEAD state before game over modal")
print("  - Sequence: Drop 3 → DEAD state (2s) → Game Over modal")

