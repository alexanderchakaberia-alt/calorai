# Camera Capture Feature – Testing Guide

## Quick Test

### 1. Start the Dev Server
```powershell
# On Windows with multiple Node versions:
$env:Path="C:\Program Files\nodejs;" + $env:Path
npm run dev
```
Dev server runs at **http://localhost:3000**

### 2. Open the App
- Navigate to http://localhost:3000
- You should see the Nutrition Tracker home page
- Scroll down to the "Food Recognition" card with "Start Camera" button

### 3. Test Camera Permission Flow

#### First Click: Start Camera
- Click **"Start Camera"** button
- Browser should request camera permission (notification bar at top)
- Grant permission → video feed appears
- Deny permission → error message "Failed to start camera."

#### Camera Feed Visible?
✅ Should see:
- Live video preview from device camera
- Black background if camera hasn't started yet
- "Capture & Analyze" button below video

### 4. Test Photo Capture & Analysis

#### Click "Capture & Analyze"
- Button changes to "Analyzing..." (disabled)
- Camera stream is sent to `/api/analyze-food`
- AI processes the image via GROQ
- Response time: 2-5 seconds typical

#### Expected Result:
Food card appears with:
```
Food Name
Portion Size

[Calories] [Protein]
[Fat]      [Carbs]

[Log This Meal] [Capture Another]
```

### 5. Test Meal Logging

#### Click "Log This Meal"
- Button shows "Logging..." state
- Data POSTs to `/api/meals` with:
  - date: today (YYYY-MM-DD)
  - name: food name
  - calories, protein, fat, carbs: nutrition values
- Success message appears: ✓ "[Food Name]" logged to today's meals!
- Food card disappears after 3 seconds
- **Verify**: Meal appears in the meals list below

### 6. Test "Capture Another"
- Click **"Capture Another"**
- Food card clears
- Camera feed should reappear
- Can take another photo

### 7. Test Error Scenarios

#### Permission Denied
1. Click "Start Camera"
2. Deny permission in browser
3. Error message should appear: "Failed to start camera."
4. "Start Camera" button reappears for retry

#### Network Error (API Unavailable)
1. Start camera
2. Take a photo
3. If `/api/analyze-food` fails → error shows: "Analyze failed" or specific error
4. Can retry without restarting

#### Logging Error
1. Capture food successfully
2. If `/api/meals` fails → error shows: "Failed to log meal"
3. "Log This Meal" button re-enables for retry

## Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Works well |
| Safari | ✅ Full | iOS camera works |
| Edge | ✅ Full | Chromium-based |

## Mobile Testing

### iOS (iPhone/iPad)
1. Open Safari
2. Go to http://localhost:3000
3. Grant camera permission
4. Should see rear camera feed
5. Capture and analyze works

### Android (Chrome)
1. Open Chrome
2. Go to http://localhost:3000
3. Grant camera permission
4. Should see rear camera feed
5. Capture and analyze works

**Note**: On mobile, video may appear rotated — this is handled by browser's `objectFit: "cover"` which crops appropriately.

## Secure Context Check

❌ **Won't work**:
- `http://192.168.1.100:3000` (LAN IP – insecure)
- `file:///path/to/index.html` (file protocol)
- Any non-https remote URL

✅ **Will work**:
- `http://localhost:3000` ← Use this
- `http://127.0.0.1:3000`
- `https://yourdomain.com` (production)

## Console Debugging

Open browser DevTools (F12) and check:

```javascript
// Check if secure context
window.isSecureContext // should be true

// Check if camera API available
navigator.mediaDevices?.getUserMedia // should exist

// Check permissions
navigator.permissions.query({ name: 'camera' })
  .then(result => console.log(result.state))
```

## Verify the Flow

Run through this checklist:

- [ ] Dev server running on localhost:3000
- [ ] App loads without errors
- [ ] "Food Recognition" card visible
- [ ] "Start Camera" button clickable
- [ ] Camera permission dialog appears
- [ ] Video feed displays in card (after granting permission)
- [ ] "Capture & Analyze" button visible below video
- [ ] Clicking capture sends request to /api/analyze-food
- [ ] "Analyzing..." state shows during request
- [ ] Food data card appears with name and macros
- [ ] "Log This Meal" button works
- [ ] "Logging..." state shows during save
- [ ] Success message appears and auto-dismisses
- [ ] Meal appears in meals list below
- [ ] "Capture Another" resets the component
- [ ] Can capture multiple meals in one session
- [ ] Error messages appear for failures
- [ ] Buttons are disabled during async operations

## Common Issues & Fixes

### "Camera requires a secure context"
**Problem**: You're using a LAN IP like `192.168.x.x`  
**Fix**: Use `http://localhost:3000` instead

### No video stream appears
**Problem**: Camera permission was denied or camera is busy  
**Fix**: 
1. Check browser permissions (URL bar → lock icon)
2. Ensure no other app is using the camera
3. Refresh the page and try again

### "Analyze failed" error
**Problem**: `/api/analyze-food` endpoint is down or GROQ API key is invalid  
**Fix**:
1. Check `.env.local` has valid `GROQ_API_KEY`
2. Ensure dev server is running
3. Check dev server logs for errors: `tail -f dev.log`

### Meal logs but doesn't appear in list
**Problem**: Refresh callback not fired or meals list not updated  
**Fix**:
1. Refresh the page manually (F5)
2. Check browser console for errors
3. Verify `/api/meals` endpoint is working

---

**Ready to test!** 🎥  
Start the dev server and click "Start Camera" to begin.
