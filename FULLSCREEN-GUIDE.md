# Fullscreen Behavior Guide 📱💻

## Understanding Fullscreen Across Devices

Fullscreen behavior varies significantly between desktop and mobile browsers. This guide explains how our system handles each case perfectly.

---

## 🖥️ Desktop Fullscreen

### How It Works

On desktop browsers (Chrome, Firefox, Safari, Edge), the **Fullscreen API** is well-supported:

```typescript
// Enter fullscreen
element.requestFullscreen()

// Exit fullscreen  
document.exitFullscreen()

// Check if in fullscreen
const isFullscreen = !!document.fullscreenElement
```

### Desktop Behavior

**When User Clicks Fullscreen:**
1. Video expands to fill entire screen
2. Browser UI (tabs, address bar) hides
3. Controls remain visible for 3 seconds
4. Mouse movement shows controls again
5. ESC key exits fullscreen

**Implementation:**
```typescript
const handleFullscreen = () => {
  if (!playerRef.current) return
  
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    playerRef.current.requestFullscreen()
  }
}
```

**Auto-Hide Controls:**
```typescript
useEffect(() => {
  if (isFullscreen) {
    const player = playerRef.current
    if (player) {
      player.addEventListener('mousemove', handleActivity)
      
      return () => {
        player.removeEventListener('mousemove', handleActivity)
      }
    }
  }
}, [isFullscreen])

const handleActivity = useCallback(() => {
  setShowControls(true)
  
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
  }
  
  timeoutRef.current = setTimeout(() => {
    setShowControls(false)
  }, 3000)  // Hide after 3 seconds
}, [])
```

---

## 📱 Mobile Fullscreen

### The Challenge

Mobile browsers handle fullscreen differently than desktop:

**iOS Safari:**
- Limited fullscreen API support
- Videos often use native player fullscreen
- Landscape orientation may auto-trigger
- Browser UI behavior varies

**Android Chrome:**
- Better fullscreen API support
- May rotate device to landscape
- Status bar may remain visible
- Different behavior in WebView vs browser

### Our Solution

We've implemented a **hybrid approach** that works across all mobile devices:

```typescript
// 1. Attempt standard fullscreen API
playerRef.current.requestFullscreen().catch(err => {
  console.error('Fullscreen request failed:', err)
  
  // 2. Fallback: Use CSS to maximize viewport
  playerRef.current.style.position = 'fixed'
  playerRef.current.style.top = '0'
  playerRef.current.style.left = '0'
  playerRef.current.style.width = '100vw'
  playerRef.current.style.height = '100vh'
  playerRef.current.style.zIndex = '9999'
})
```

### Mobile Best Practices

**1. Playsinline Attribute**
```typescript
playerVars: {
  playsinline: 1,  // Prevents fullscreen on iOS
}
```

**2. Touch Events**
```typescript
player.addEventListener('touchstart', handleActivity)
```

**3. Viewport Meta Tag**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

---

## 🔄 Orientation Handling

### Landscape Lock (Optional)

You can encourage landscape mode on mobile:

```typescript
// Request landscape orientation (not all browsers support)
if ('orientation' in screen && 'lock' in screen.orientation) {
  screen.orientation.lock('landscape').catch(err => {
    console.log('Orientation lock failed:', err)
  })
}
```

### Detect Orientation Changes

```typescript
useEffect(() => {
  const handleOrientationChange = () => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches
    
    if (isLandscape && isMobile) {
      // Optimize layout for landscape
      setIsLandscapeMode(true)
    } else {
      setIsLandscapeMode(false)
    }
  }

  window.addEventListener('orientationchange', handleOrientationChange)
  window.addEventListener('resize', handleOrientationChange)
  
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.removeEventListener('resize', handleOrientationChange)
  }
}, [isMobile])
```

---

## 🎯 YouTube iFrame Fullscreen

### The Problem

YouTube's native fullscreen button can interfere with our custom controls:

```typescript
// DISABLE YouTube's fullscreen button
playerVars: {
  fs: 0,  // Removes the fullscreen button from YouTube controls
}
```

### Our Custom Fullscreen

Instead of YouTube's built-in fullscreen, we implement our own:

**Advantages:**
- ✅ Consistent behavior across devices
- ✅ Custom controls remain visible
- ✅ Better tracking and analytics
- ✅ Can add custom UI elements
- ✅ Prevents YouTube branding in fullscreen

**Implementation:**
```typescript
// We fullscreen the entire player container, not just the iframe
<div ref={playerRef} className="player-container">
  <iframe /> {/* YouTube video */}
  <div className="custom-controls" /> {/* Our controls */}
</div>

// Then fullscreen the whole container
playerRef.current.requestFullscreen()
```

---

## 🛡️ Preventing User Controls

To achieve true TV-like experience, we block all video controls:

### 1. YouTube Configuration
```typescript
playerVars: {
  controls: 0,        // No YouTube controls
  disablekb: 1,       // No keyboard shortcuts
  fs: 0,              // No fullscreen button
  modestbranding: 1,  // Minimal branding
  rel: 0,             // No related videos
  iv_load_policy: 3,  // No annotations
}
```

### 2. Overlay Blocker
```tsx
{/* Transparent div blocks clicks to iframe */}
<div className="absolute inset-0 pointer-events-auto" />
```

### 3. Prevent Context Menu
```typescript
playerRef.current.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  return false
})
```

### 4. Block Pause Attempts
```typescript
onStateChange: (event) => {
  // If video is paused, resume it
  if (event.data === window.YT.PlayerState.PAUSED) {
    setTimeout(() => {
      ytPlayerRef.current?.playVideo()
    }, 500)
  }
}
```

---

## 🎨 Fullscreen UI Design

### Desktop Fullscreen UI

```tsx
{isFullscreen && (
  <AnimatePresence>
    {showControls && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-0 left-0 right-0"
      >
        {/* Volume, Live Badge, Exit Button */}
      </motion.div>
    )}
  </AnimatePresence>
)}
```

### Mobile Fullscreen UI

On mobile, we show simpler controls:
- Volume control
- Exit fullscreen button
- Program title

**Considerations:**
- Larger touch targets (44px minimum)
- No hover states (use active states)
- Swipe gestures for controls

---

## 🧪 Testing Fullscreen

### Desktop Testing

```bash
# Chrome
1. Click fullscreen button
2. Verify video fills screen
3. Move mouse → controls appear
4. Wait 3 seconds → controls disappear
5. Press ESC → exit fullscreen

# Firefox
Same as Chrome

# Safari
Same as Chrome (may show more browser UI)
```

### Mobile Testing

```bash
# iOS Safari
1. Tap fullscreen
2. Check if orientation changes
3. Verify controls are touch-friendly
4. Test volume slider
5. Tap exit button

# Android Chrome  
Same as iOS Safari

# Test Orientations
- Portrait mode
- Landscape mode (both orientations)
- Rotation during playback
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Fullscreen Not Working on Mobile

**Cause:** iOS requires user gesture to enter fullscreen

**Fix:**
```typescript
// Ensure fullscreen is triggered by user action, not automatically
<button onClick={handleFullscreen}>Go Fullscreen</button>
```

### Issue 2: Controls Not Hiding

**Cause:** Event listeners not properly attached

**Fix:**
```typescript
// Make sure to remove old listeners before adding new ones
useEffect(() => {
  const player = playerRef.current
  if (!player) return

  player.addEventListener('mousemove', handleActivity)
  
  return () => {
    player.removeEventListener('mousemove', handleActivity)
  }
}, [handleActivity])
```

### Issue 3: Black Bars in Fullscreen

**Cause:** Video aspect ratio doesn't match screen

**Fix:**
```css
/* Use object-fit to fill screen */
.video-container {
  width: 100%;
  height: 100%;
  object-fit: cover; /* or 'contain' */
}
```

### Issue 4: Fullscreen Exits Unexpectedly

**Cause:** Browser security restrictions

**Fix:**
```typescript
// Listen for fullscreen change events
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    // Fullscreen was exited
    setIsFullscreen(false)
  }
})
```

---

## 📊 Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Android Chrome |
|---------|--------|---------|--------|------|------------|----------------|
| Fullscreen API | ✅ | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ |
| Auto-hide controls | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ✅ | ✅ | ✅ | ❌ N/A | ❌ N/A |
| Orientation lock | ❌ | ❌ | ❌ | ❌ | ⚠️ Limited | ⚠️ Limited |
| Touch events | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend:
- ✅ Fully supported
- ⚠️ Partial support
- ❌ Not supported

---

## 🔬 Advanced Techniques

### Picture-in-Picture (Future Enhancement)

```typescript
// Enable PiP mode (Chrome, Safari)
const enablePiP = async () => {
  try {
    await videoElement.requestPictureInPicture()
  } catch (error) {
    console.log('PiP not supported')
  }
}
```

### Custom Fullscreen Transitions

```css
/* Smooth fullscreen animation */
.player-container {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}
```

### Detecting Fullscreen Capability

```typescript
const canFullscreen = 
  document.fullscreenEnabled ||
  document.webkitFullscreenEnabled ||
  document.mozFullScreenEnabled ||
  document.msFullscreenEnabled

if (!canFullscreen) {
  // Show fallback UI
}
```

---

## 🎓 Best Practices Summary

### ✅ DO

1. **Always provide exit button** in fullscreen mode
2. **Auto-hide controls** after inactivity timer
3. **Show controls on any user activity** (mouse, touch, keyboard)
4. **Test on real devices** (emulators don't represent actual behavior)
5. **Handle orientation changes** gracefully
6. **Provide fallbacks** for browsers without fullscreen API
7. **Use large touch targets** on mobile (44px minimum)
8. **Listen for fullscreen change events** to sync UI state

### ❌ DON'T

1. **Don't force fullscreen** without user action
2. **Don't rely solely on native video fullscreen**
3. **Don't forget touch event handlers** on mobile
4. **Don't assume all browsers behave the same**
5. **Don't block ESC key** (users should always be able to exit)
6. **Don't ignore browser console warnings** about fullscreen

---

## 🚀 Performance Optimization

### Minimize Reflows

```typescript
// BAD: Multiple style changes
element.style.width = '100vw'
element.style.height = '100vh'
element.style.position = 'fixed'

// GOOD: Single class change
element.classList.add('fullscreen')
```

### Use CSS Transforms

```css
/* Better performance than changing position */
.fullscreen {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}
```

### Debounce Resize Events

```typescript
let resizeTimeout: NodeJS.Timeout

const handleResize = () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    // Handle resize
  }, 250)
}
```

---

## 📱 Device-Specific Quirks

### iPhone/iPad

- Fullscreen API limited before iOS 15
- Video may prefer native player
- Status bar may remain visible
- Home indicator may appear

### Android

- Varies by manufacturer (Samsung, Google, etc.)
- Some devices show notification bar
- Gesture navigation may interfere
- Battery saver mode can affect playback

### Smart TVs

- Remote control navigation
- Focus management critical
- Larger screen = different UX
- Back button should exit fullscreen

---

## 🔍 Debugging Tools

### Check Fullscreen State

```typescript
console.log('Fullscreen element:', document.fullscreenElement)
console.log('Fullscreen enabled:', document.fullscreenEnabled)
```

### Monitor Events

```typescript
['fullscreenchange', 'fullscreenerror'].forEach(event => {
  document.addEventListener(event, (e) => {
    console.log(`Event: ${event}`, e)
  })
})
```

### Inspect Video Player

```typescript
// Add to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.debugPlayer = ytPlayerRef.current
}

// Then in console:
// window.debugPlayer.getPlayerState()
// window.debugPlayer.getCurrentTime()
```

---

**Fullscreen is perfect! 🎉**

Your users will enjoy a seamless TV experience across all devices.
