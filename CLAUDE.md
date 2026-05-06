# CaloRAI – Claude Code Guide

Next.js 15 nutrition tracking app with AI food recognition via camera.

## Project Overview

- **App Router**: All pages in `app/` directory
- **API**: Mix of App Router (`app/api/`) and legacy Pages Router (`pages/api/analyze-food.js`)
- **Database**: SQLite (`db.sqlite`)
- **Camera Feature**: `components/CameraCapture.jsx` – photo capture, food analysis, meal logging
- **Styling**: Tailwind CSS + inline styles

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Home page, meal tracking dashboard |
| `app/layout.tsx` | Root layout |
| `app/api/meals/route.ts` | Meal CRUD endpoints |
| `app/api/goals/route.ts` | Daily nutrition goals |
| `pages/api/analyze-food.js` | GROQ AI food analysis (legacy) |
| `components/CameraCapture.jsx` | Camera → analyze → log workflow |
| `components/MacroRing.tsx` | Nutrition progress visualization |
| `components/MealForm.tsx` | Manual meal entry |
| `components/MealList.tsx` | Meal list display |

## Running the App

### Setup
```bash
npm install
```

### Windows Node Compatibility
If you have multiple Node versions (Cursor's + system), always use system Node:
```powershell
$env:Path="C:\Program Files\nodejs;" + $env:Path
npm run dev
```

### Dev Server
```bash
npm run dev
# http://localhost:3000 (secure context required for camera)
```

### Build & Deploy
```bash
npm run build
npm run start
```

## Camera Feature (Latest)

**Component**: `components/CameraCapture.jsx`

### Workflow
1. **Start Camera** → requests device camera permission
2. **Live Video Feed** → displays in responsive video element
3. **Capture & Analyze** → canvas capture → base64 → POST to `/api/analyze-food`
4. **AI Response** → displays food name, portion, macros
5. **Log This Meal** → POST to `/api/meals` with date & nutrition data
6. **Capture Another** → reset for next photo

### Features
- ✅ Secure context detection (localhost only)
- ✅ Browser compatibility check
- ✅ Permission denial error handling
- ✅ Canvas base64 conversion (JPEG 0.9 quality)
- ✅ Success/error feedback
- ✅ Mobile-responsive video (320px height, cover fit)
- ✅ Disabled states during analysis/logging
- ✅ Meal refresh callback on successful log

### Integration
Parent component passes callback:
```jsx
<CameraCapture onMealLogged={refresh} />
```
When meal is logged, `refresh()` updates the meals list automatically.

## Environment Variables

Create `.env.local`:
```
GROQ_API_KEY=gsk_...
```

The API supports both `GROQ_API_KEY` (server-only, preferred) and `NEXT_PUBLIC_GROQ_API_KEY` (client).

## Troubleshooting

### Camera Issues
- **"Camera requires a secure context"**: Use `http://localhost:3000`, not LAN IP or file://
- **Permission denied**: Browser permissions → allow camera access
- **No video stream**: Refresh page, check browser console

### better-sqlite3 ABI Errors
If you see native module errors after Node version switch:
```bash
npm install --force better-sqlite3
```

### Dev Server Won't Start
1. Check port 3000 isn't in use: `lsof -i :3000` (macOS/Linux)
2. Kill process: `killall node`
3. Restart: `npm run dev`

## Testing Checklist

- [ ] Start Camera button appears
- [ ] Clicking opens permission dialog
- [ ] Video feed displays (live preview)
- [ ] Capture & Analyze captures and sends to API
- [ ] "Analyzing..." shows during request
- [ ] Food data displays in card (name, portion, macros)
- [ ] "Log This Meal" button saves to database
- [ ] "Capture Another" resets for next photo
- [ ] Meal appears in meals list after logging
- [ ] Error messages show for permission denial / network issues

## Architecture Notes

- **Secure Context**: Camera requires `https://` or `localhost` (no http://<LAN-IP>)
- **Canvas Capture**: Converts video frame to JPEG base64 at 90% quality
- **Date Handling**: Uses ISO format (YYYY-MM-DD) for date grouping
- **Callback Pattern**: Parent refreshes meals list after logging via `onMealLogged` prop

---

**Last Updated**: 2026-05-06  
**Status**: Camera feature fully implemented and integrated
