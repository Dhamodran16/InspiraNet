# Upgrade to Production Mode - Complete Guide

## ✅ Current Status Check

Your backend is **already configured for production**:
- ✅ `NODE_ENV=production` in `backend/config.env`
- ✅ All URLs are production URLs (no localhost)
- ✅ CORS configured for production frontend

## 🎯 What Needs to Be Done

### 1. Backend (Already Ready ✅)

**Status**: No changes needed - already in production mode!

Your `backend/config.env` is correctly configured:
```env
NODE_ENV=production
BACKEND_URL=https://inspiranet-backend.onrender.com
FRONTEND_URL=https://inspiranet.onrender.com
CORS_ORIGIN=https://inspiranet.onrender.com
```

**Note**: The `PORT=10000` in config.env is fine - Render will use its own PORT environment variable.

### 2. Frontend Build Configuration

**Action Required**: Ensure you build with production mode.

**Current Build Scripts:**
- `npm run build` - Uses Vite's default (production mode)
- `npm run build:prod` - Explicit production build ✅
- `npm run build:render` - Production build for Render ✅

**To Build for Production:**
```bash
cd frontend
npm run build:prod
```

This will:
- ✅ Use production URLs from `vite.config.ts`
- ✅ Disable development tools
- ✅ Optimize bundle size
- ✅ Remove source maps (already configured)

### 3. Environment Variables for Render

**Backend Service** - Use values from `backend/config.env`:
```
NODE_ENV=production
PORT=5000 (Render will set this automatically)
BACKEND_URL=https://inspiranet-backend.onrender.com
FRONTEND_URL=https://inspiranet.onrender.com
CORS_ORIGIN=https://inspiranet.onrender.com
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SESSION_SECRET=your_session_secret
... (all other variables from config.env)
```

**Frontend Service** - Set these in Render dashboard:
```
VITE_API_URL=https://inspiranet-backend.onrender.com
VITE_SOCKET_URL=https://inspiranet-backend.onrender.com
VITE_MEETING_URL=https://inspiranet-backend.onrender.com
VITE_FRONTEND_URL=https://inspiranet.onrender.com
NODE_ENV=production
```

## 📋 Step-by-Step Upgrade Process

### Step 1: Verify Backend Configuration

```bash
# Check backend config
cd backend
cat config.env | grep -E "NODE_ENV|localhost|127.0.0.1"

# Should show:
# NODE_ENV=production
# (No localhost or 127.0.0.1 should appear)
```

✅ **Your backend is already production-ready!**

### Step 2: Build Frontend for Production

```bash
cd frontend

# Build for production
npm run build:prod

# Verify build output
ls -la dist/

# Check that no localhost URLs in built files (optional)
grep -r "localhost" dist/ || echo "✅ No localhost found in build"
```

### Step 3: Test Production Build Locally (Optional)

```bash
# Preview production build
cd frontend
npm run preview

# In another terminal, start backend
cd backend
npm start

# Test in browser:
# - Should connect to production backend
# - No development tools active
# - All API calls go to production URLs
```

### Step 4: Deploy to Render

Follow the steps in `RENDER_REHOSTING_GUIDE.md`:

1. **Create Backend Service**
   - Use environment variables from `backend/config.env`
   - Build: `npm install`
   - Start: `npm start`

2. **Create Frontend Service**
   - Set environment variables listed above
   - Build: `npm install && npm run build:prod`
   - Publish: `dist`

### Step 5: Verify Production Deployment

After deployment, verify:

1. **Backend Health:**
   ```
   curl https://inspiranet-backend.onrender.com/api/health
   ```

2. **Frontend Loads:**
   - Visit: `https://inspiranet.onrender.com`
   - Should load without errors

3. **API Connection:**
   - Open browser console
   - Try logging in
   - Check network tab - all requests should go to production backend

4. **Socket.io:**
   - Check browser console for socket connection
   - Should connect to production backend

## 🔍 Code Analysis

### How Environment Detection Works

1. **Backend (`backend/server.js`):**
   ```javascript
   // Uses process.env.NODE_ENV
   if (process.env.NODE_ENV === 'development') {
     // Development mode
   } else {
     // Production mode (default)
   }
   ```

2. **Frontend (`frontend/vite.config.ts`):**
   ```typescript
   // Uses mode parameter
   mode === 'production' 
     ? 'production-url'
     : 'localhost-url'
   ```

3. **Frontend Runtime (`frontend/src/utils/urlConfig.ts`):**
   ```typescript
   // Uses import.meta.env.MODE
   const isDev = import.meta.env.MODE === 'development';
   return isDev ? devConfig : prodConfig;
   ```

### Files That Handle Environment

✅ **Already Configured:**
- `backend/server.js` - Uses `NODE_ENV` from config.env
- `frontend/vite.config.ts` - Uses `mode` parameter
- `frontend/src/utils/urlConfig.ts` - Auto-detects environment
- `frontend/src/config/env.ts` - Uses `import.meta.env.PROD`

## ⚠️ Important Notes

1. **PORT Configuration:**
   - Your `config.env` has `PORT=10000`
   - Render will set its own `PORT` environment variable
   - Backend code uses: `process.env.PORT || 5000`
   - This is fine - Render's PORT will override

2. **Development vs Production:**
   - **Development**: `npm run dev` → localhost URLs
   - **Production**: `npm run build:prod` → production URLs

3. **Environment Variables:**
   - Backend: Reads from `config.env` file
   - Frontend: Uses build-time environment variables
   - Render: Sets environment variables in dashboard

4. **No Code Changes Needed:**
   - Codebase already handles environment detection
   - Just ensure correct build mode and environment variables

## 🐛 Troubleshooting

### Issue: Still connecting to localhost

**Check:**
1. Did you build with `npm run build:prod`?
2. Are environment variables set in Render?
3. Check browser console for actual URLs being used

**Solution:**
```bash
# Rebuild with production mode
cd frontend
rm -rf dist
npm run build:prod
```

### Issue: CORS errors

**Check:**
1. `FRONTEND_URL` in backend matches frontend URL exactly
2. `CORS_ORIGIN` in backend matches frontend URL exactly
3. No trailing slashes in URLs

**Solution:**
- Update `backend/config.env` with exact frontend URL
- Restart backend service

### Issue: Development tools still active

**Check:**
1. `NODE_ENV=production` in backend config.env
2. Built with production mode
3. Not running `npm run dev`

**Solution:**
- Ensure `NODE_ENV=production` in backend
- Use `npm run build:prod` for frontend
- Don't use `npm run dev` in production

## ✅ Final Verification Checklist

Before going live:

**Backend:**
- [x] `NODE_ENV=production` in config.env
- [x] All URLs are production URLs
- [x] No localhost references
- [x] CORS_ORIGIN matches frontend URL

**Frontend:**
- [ ] Built with `npm run build:prod`
- [ ] Environment variables set in Render
- [ ] No localhost in built files

**Deployment:**
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables set correctly
- [ ] Test authentication
- [ ] Test API calls
- [ ] Test Socket.io
- [ ] Test file uploads
- [ ] No console errors
- [ ] No CORS errors

## 📝 Summary

**Your application is production-ready!**

✅ Backend: Already configured for production
✅ Frontend: Code handles environment detection
✅ Build: Use `npm run build:prod`
✅ Deploy: Follow Render deployment guide

**Next Steps:**
1. Build frontend: `cd frontend && npm run build:prod`
2. Deploy to Render (see `RENDER_REHOSTING_GUIDE.md`)
3. Set environment variables
4. Verify everything works

---

**Status**: Ready for Production ✅
**Last Updated**: Based on current codebase

