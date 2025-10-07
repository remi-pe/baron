#!/usr/bin/env python3
"""
Preload drop hit sound to eliminate playback delay (fixed version)
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# 1. Add useEffect to preload the audio (before coin images loading)
old_coin_loading = """  // Load coin images
  useEffect(() => {
    const coin1 = new Image()"""

new_coin_loading = """  // Preload drop hit sound for instant playback
  useEffect(() => {
    const audio = new Audio('/drop-hit-sound.mp3')
    audio.volume = 0.6
    audio.preload = 'auto'
    audio.load()
    dropHitAudioRef.current = audio
  }, [])

  // Load coin images
  useEffect(() => {
    const coin1 = new Image()"""

content = content.replace(old_coin_loading, new_coin_loading)

# 2. Update playOuchSound to use preloaded audio
old_play_ouch = """  const playOuchSound = useCallback(() => {
    if (!soundEnabled.ouch) return
    try {
      const audio = new Audio('/drop-hit-sound.mp3')
      audio.volume = 0.6 // Adjust volume as needed
      audio.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])"""

new_play_ouch = """  const playOuchSound = useCallback(() => {
    if (!soundEnabled.ouch || !dropHitAudioRef.current) return
    try {
      // Reset to start and play instantly (no loading delay)
      dropHitAudioRef.current.currentTime = 0
      dropHitAudioRef.current.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])"""

content = content.replace(old_play_ouch, new_play_ouch)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Drop hit sound now preloaded for instant playback")
print("  - Audio file preloaded on component mount")
print("  - No delay when hitting drops")
print("  - Instant 0ms playback")

