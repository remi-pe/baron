#!/usr/bin/env python3
"""
Replace the synthesized drop hit sound with the new MP3 file
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Replace the entire playOuchSound function
old_ouch_sound = """  const playOuchSound = useCallback(() => {
    if (!soundEnabled.ouch) return
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.22

      // Tone (descending pitch)
      const osc = audioContext.createOscillator()
      const toneGain = audioContext.createGain()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(620, now)
      osc.frequency.exponentialRampToValueAtTime(160, now + duration)
      toneGain.gain.setValueAtTime(0.0001, now)
      toneGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01)
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

      // Short noise burst for impact
      const noiseBufferLen = Math.floor(0.1 * audioContext.sampleRate)
      const noiseBuffer = audioContext.createBuffer(1, noiseBufferLen, audioContext.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < noiseBufferLen; i++) {
        const t = i / noiseBufferLen
        data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t)
      }
      const noise = audioContext.createBufferSource()
      noise.buffer = noiseBuffer
      const noiseFilter = audioContext.createBiquadFilter()
      noiseFilter.type = "bandpass"
      noiseFilter.frequency.setValueAtTime(800, now)
      noiseFilter.Q.setValueAtTime(0.8, now)
      const noiseGain = audioContext.createGain()
      noiseGain.gain.setValueAtTime(0.0001, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.3, now + 0.005)
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      // Master
      const master = audioContext.createGain()
      master.gain.setValueAtTime(0.35, now)

      // Connect
      osc.connect(toneGain)
      toneGain.connect(master)
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(master)
      master.connect(audioContext.destination)

      // Start/stop
      osc.start(now)
      noise.start(now)
      osc.stop(now + duration)
      noise.stop(now + 0.14)
    } catch {
      // no-op (autoplay restrictions may block without prior user gesture)
    }
  }, [soundEnabled])"""

new_ouch_sound = """  const playOuchSound = useCallback(() => {
    if (!soundEnabled.ouch) return
    try {
      const audio = new Audio('/drop-hit-sound.mp3')
      audio.volume = 0.6 // Adjust volume as needed
      audio.play().catch(() => { /* no-op */ })
    } catch {
      // no-op
    }
  }, [soundEnabled])"""

content = content.replace(old_ouch_sound, new_ouch_sound)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Replaced drop hit sound with new audio file")
print("  - Old: Synthesized sound via AudioContext")
print("  - New: /drop-hit-sound.mp3")
print("  - Source: https://www.dropbox.com/scl/fi/y06qxxqt09e2sjkun9ciw/ough-47202.mp3")
print("  - Volume: 60%")

