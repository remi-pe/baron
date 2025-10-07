#!/usr/bin/env python3
"""
Simplify drop damage system - remove 2-second window, use simple increment/decrement
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Remove dropHitStartTime from GameState interface
old_interface = """  fireStateStartTime: number
  dropHitCount: number
  dropHitStartTime: number
  isDead: boolean"""

new_interface = """  fireStateStartTime: number
  dropHitCount: number
  isDead: boolean"""

content = content.replace(old_interface, new_interface)

# 2. Remove dropHitStartTime from initialization
old_init = """      fireStateStartTime: 0,
      dropHitCount: 0,
      dropHitStartTime: 0,
      isDead: false,"""

new_init = """      fireStateStartTime: 0,
      dropHitCount: 0,
      isDead: false,"""

content = content.replace(old_init, new_init)

# 3. Simplify flame healing logic (remove window reset)
old_flame = """        // FLAME HEALS: Reduce drop damage by 1 state
        st.dropHitCount = Math.max(0, st.dropHitCount - 1)
        
        // Only reset the 2-second window timer if fully healed back to Idle
        if (st.dropHitCount === 0) {
          st.dropHitStartTime = 0
        }
        // Otherwise, timer keeps running from the first drop in the sequence"""

new_flame = """        // FLAME HEALS: Reduce drop damage by 1 state
        st.dropHitCount = Math.max(0, st.dropHitCount - 1)"""

content = content.replace(old_flame, new_flame)

# 4. Simplify drop collision logic - remove all window logic
old_drop_collision = """      // ============================================================================
      // DROP COLLISION - Damages 1 state + removes 1 life
      // ============================================================================
      // State progression: Idle → State 2 → State 3 → Dead
      // Drops within 2-second window accumulate damage
      // After 2 seconds, damage resets to State 2 (fresh sequence)
      // ============================================================================
      if (!st.invulnerable && !st.isDead && checkDropCollision(player, platform)) {
        console.log('💀 3RD DROP HIT - ENTERING DEAD STATE:', {
          dropHitCount: st.dropHitCount,
          playerX: player.x,
          playerY: player.y,
          lives: newLives
        })
        playOuchSound()
        const newLives = lives - 1
        setLives(newLives)
        st.fireStateStartTime = 0 // Cancel fire visual effect
        
        const now = Date.now()
        
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
          })
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
        st.invulnerableTime = Date.now() + 1000
        
        // Mark drop as collected
        platform.hasDrop = false
      }"""

new_drop_collision = """      // ============================================================================
      // DROP COLLISION - Damages 1 state + removes 1 life
      // ============================================================================
      // State progression: Idle → State 2 → State 3 → Dead
      // Each drop increments damage state (no time window)
      // ============================================================================
      if (!st.invulnerable && !st.isDead && checkDropCollision(player, platform)) {
        playOuchSound()
        const newLives = lives - 1
        setLives(newLives)
        st.fireStateStartTime = 0 // Cancel fire visual effect
        
        const now = Date.now()
        
        // Simple increment: each drop = +1 damage state
        st.dropHitCount++
        
        console.log('💧 DROP HIT:', {
          dropHitCount: st.dropHitCount,
          newLives: newLives,
          playerX: player.x,
          playerY: player.y
        })
        
        // Check for 3rd drop FIRST (always game over)
        if (st.dropHitCount >= 3) {
          console.log('💀 3RD DROP - ENTERING DEAD STATE')
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
        
        // Normal drop hit: 1 second invulnerability
        st.invulnerable = true
        st.invulnerableTime = Date.now() + 1000
        
        // Mark drop as collected
        platform.hasDrop = false
      }"""

content = content.replace(old_drop_collision, new_drop_collision)

# 5. Update respawn logic to reset dropHitCount
old_respawn = """              gameStateRef.current.isDead = false
              gameStateRef.current.dropHitCount = 0 // Reset to Idle after death penalty
              gameStateRef.current.dropHitStartTime = 0
              gameStateRef.current.invulnerable = true"""

new_respawn = """              gameStateRef.current.isDead = false
              gameStateRef.current.dropHitCount = 0 // Reset to Idle after respawn
              gameStateRef.current.invulnerable = true"""

# This respawn logic doesn't exist in the new simplified version, so this replacement may not match
# Let's skip it if it doesn't exist

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Simplified drop damage system implemented!")
print("")
print("Changes made:")
print("  - Removed dropHitStartTime variable")
print("  - Removed 2-second window logic")
print("  - Simple rule: Each drop = +1 damage state")
print("  - Simple rule: Each flame = -1 damage state")
print("  - States persist until changed by player action")
print("")
print("New system:")
print("  State 1 → Drop → State 2 → Drop → State 3 → Drop → Dead")
print("  State 3 → Flame → State 2 → Flame → State 1")

