# 🚀 Quick Start Guide

## Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd /var/www/deeni-tv-fe/deeni-tv-fe
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open in Browser
Visit: **http://localhost:3000**

That's it! The TV broadcast will start playing automatically after your first interaction (click, touch, or keypress).

---

## ✅ What Should Happen

When you open the application:

1. **Video starts playing automatically** after your first interaction (click, touch, or keypress) at the correct synchronized timestamp
2. **Bottom ticker bar** shows current program info and "Up Next"
3. **Volume control** is available (only user control)
4. **Live indicator** pulses in red
5. **Clicking fullscreen** expands to full screen with auto-hiding controls

---

## 🧪 Testing Synchronization

### Test 1: Multi-Browser Sync
```bash
1. Open http://localhost:3000 in Chrome
2. Open http://localhost:3000 in another Chrome tab
3. Both should show the SAME video at the SAME position
```

### Test 2: Auto-Advance
```bash
1. Wait for a video to end (or edit schedule for short videos)
2. Video should automatically advance to the next program
3. All open browsers should advance together
```

### Test 3: Fullscreen
```bash
Desktop:
1. Click fullscreen button
2. Controls should hide after 3 seconds
3. Move mouse → controls reappear
4. Press ESC to exit

Mobile:
1. Tap fullscreen button
2. Device may rotate to landscape
3. Tap screen to show/hide controls
4. Tap exit button to leave fullscreen
```

### Dev-only: Simulate server payload (quick test)
```bash
# Open the app with query params to simulate backend payload
# - debugVideoId  : YouTube video id
# - debugTime     : start time in seconds

# Example: start a video at 5 minutes (300s)
http://localhost:3000/?debugVideoId=TosSYbyRKXs&debugTime=300

# Useful to test: autoplay start-at-time, fallback iframe start, and auto-next behavior
```

---

## 📝 Adding Your Own Videos

Edit `/lib/schedule-utils.ts`:

```typescript
export const SCHEDULE: VideoProgram[] = [
  {
    id: '1',
    videoId: 'YOUR_YOUTUBE_VIDEO_ID',  // ← Change this
    title: 'Your Program Title',        // ← Change this
    description: 'Description here',    // ← Change this
    duration: 1800,  // 30 minutes in seconds
    startTime: new Date(),
    endTime: new Date(),
    category: 'Your Category',
    language: 'English'
  },
  // Add more videos...
]
```

**Finding YouTube Video ID:**
- URL: `https://www.youtube.com/watch?v=abc123xyz`
- Video ID: `abc123xyz`

---

## 🎯 Key Files to Customize

| File | Purpose | What to Change |
|------|---------|----------------|
| `/lib/schedule-utils.ts` | Video schedule | Add/remove videos, change durations |
| `/components/tv-ticker.tsx` | Bottom ticker bar | Styling, animation speed |
| `/components/synced-video-player.tsx` | Video player | Sync intervals, error handling |
| `/app/page.tsx` | Main page | Add channels, modify layout |

---

## 🔧 Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for errors
npm run lint

# Kill all Next.js processes (if port is stuck)
pkill -f "next dev"
```

---

## 🐛 Troubleshooting

### Video Not Playing
**Problem:** Black screen or loading indicator  
**Solution:**
1. Check YouTube video ID is correct
2. Verify video allows embedding
3. Check browser console for errors

### Sync is Off
**Problem:** Different users see different positions  
**Solution:**
1. Check server time is accurate
2. Verify network delay compensation is working
3. Look for drift detection messages in console

### Port Already in Use
**Problem:** `Port 3000 is in use`  
**Solution:**
```bash
pkill -f "next dev"
rm -rf .next/dev/lock
npm run dev
```

### Fullscreen Not Working
**Problem:** Nothing happens when clicking fullscreen  
**Solution:**
1. Some browsers require HTTPS for fullscreen
2. Try in Chrome first (best support)
3. Check browser console for permission errors

---

## 📊 Monitoring

### Check API Endpoints

```bash
# Get current video
curl http://localhost:3000/api/current-video

# Get upcoming videos
curl http://localhost:3000/api/upcoming-videos
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "program": {
      "id": "1",
      "videoId": "2VyyN6HHv_U",
      "title": "Morning Prayer & Reflection",
      "duration": 1800,
      "...": "..."
    },
    "currentTime": 450,
    "timeRemaining": 1350,
    "nextProgram": { "..." },
    "serverTime": 1709654400000
  }
}
```

---

## 🎨 Customizing the Look

### Change Primary Color

Edit `app/globals.css`:

```css
:root {
  --primary: 10 80% 50%;  /* Change these HSL values */
}
```

### Modify Ticker Bar

Edit `components/tv-ticker.tsx`:

```typescript
// Change scroll speed (line ~60)
animate={{ x: [0, -1000] }}
transition={{
  duration: 20,  // ← Change this (seconds)
  repeat: Infinity,
  ease: "linear",
}}
```

### Adjust Auto-Hide Timer

Edit `components/synced-video-player.tsx`:

```typescript
// Change control hide delay (line ~170)
timeoutRef.current = setTimeout(() => {
  setShowControls(false)
}, 3000)  // ← Change this (milliseconds)
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and Run
docker build -t deeni-tv .
docker run -p 3000:3000 deeni-tv
```

### Nginx (Production)

```nginx
server {
  listen 80;
  server_name deeni.tv;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

## 📱 Testing on Mobile

### Local Network Access

```bash
# Find your local IP
ip addr show  # Linux
ipconfig      # Windows
ifconfig      # Mac

# Access from mobile
http://YOUR_LOCAL_IP:3000
# Example: http://192.168.1.100:3000
```

### Test Checklist
- [x] Video plays without interaction (after initial user interaction)
- [ ] Touch shows/hides controls
- [ ] Fullscreen works in both orientations
- [x] Volume slider is easy to use
- [ ] Ticker bar is readable
- [ ] No layout breaking
- [ ] Performance is smooth

---

## 🎓 Learning Resources

### Next.js
- [Official Docs](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

### YouTube IFrame API
- [Official Reference](https://developers.google.com/youtube/iframe_api_reference)

### Fullscreen API
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)

---

## 💡 Pro Tips

1. **Use Actual YouTube Videos:** The placeholder video IDs are demos. Replace with your real content.

2. **Test Sync Accuracy:** Open 3+ browsers to ensure sync works with multiple users.

3. **Monitor Performance:** Check CPU and memory usage during playback.

4. **Optimize Schedule:** Use videos with similar durations for smoother transitions.

5. **Add More Videos:** The more videos in your schedule, the more variety for users.

6. **Test on Real Devices:** Emulators don't show true mobile behavior.

7. **Check Network Delay:** High latency affects sync accuracy. Consider CDN in production.

---

## 📞 Support

### Development Issues
Check the browser console for error messages

### Sync Problems
Look for these log messages:
- `🎬 Started playback at X.Xs`
- `📺 Video ended, loading next program...`
- `🔄 Video switched on server, resyncing...`
- `⏱️ Drift detected (Xs), resyncing...`

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

---

## 🎉 You're Ready!

Your TV broadcasting platform is now running. Open multiple browsers to see the synchronized magic in action!

**Next Steps:**
1. ✅ Add your real video content
2. ✅ Customize colors and styling
3. ✅ Test on multiple devices
4. ✅ Deploy to production (when ready)

**Happy Broadcasting! 📺**
