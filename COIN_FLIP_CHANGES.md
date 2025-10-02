# Coin Flip Animation Changes

## Web Version (Baron-web.tsx)

### Change 1: Update drawCoin function (replace lines 1320-1348)

```typescript
// Draw a simple coin with horizontal flip animation
const drawCoin = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number) => {
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)

  // Create horizontal flip animation (completes every ~3 seconds)
  const flipSpeed = 0.003 // Controls rotation speed (increased for visibility)
  const scaleX = Math.cos(time * flipSpeed)
  ctx.scale(scaleX, 1)

  // Outer circle (gold)
  ctx.fillStyle = "#ffd700"
  ctx.strokeStyle = "#b8860b"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, w / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Inner circle (darker gold) - only show when coin is somewhat facing us
  if (Math.abs(scaleX) > 0.1) {
    ctx.fillStyle = "#daa520"
    ctx.beginPath()
    ctx.arc(0, 0, w / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Dollar sign (only show when facing forward enough)
  if (scaleX > 0.2) {
    ctx.fillStyle = "#8b4513"
    ctx.font = `${Math.floor(w * 0.6)}px Rethink Sans, sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("$", 0, 0)
  }

  ctx.restore()
}
```

### Change 2: Update coin rendering (replace lines 1543-1549)

```typescript
// Coins (collectibles)
const now = performance.now()
st.coins.forEach((coin) => {
  if (coin.collected) return
  if (coin.x + coin.width > camera.x && coin.x < camera.x + canvas.width) {
    drawCoin(ctx, coin.x, coin.y, coin.width, coin.height, now)
  }
})
```

## Mobile Version (Baron/components/Baron-app.tsx)

Find the equivalent drawCoin function and coin rendering sections and apply the same changes.

## Key Changes:
1. Added `time` parameter to drawCoin function
2. Added `const scaleX = Math.cos(time * flipSpeed)` for rotation
3. Applied `ctx.scale(scaleX, 1)` for horizontal flip
4. Made $ symbol only show when `scaleX > 0.2` (facing forward)
5. Pass `performance.now()` when calling drawCoin

The flipSpeed of 0.003 means the coin completes a full rotation approximately every 2 seconds, making it clearly visible.

