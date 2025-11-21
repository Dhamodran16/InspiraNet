# Production Migration Guide: Localhost → Production

This guide helps you migrate from localhost/development mode to production mode with hosted URLs.

## ✅ Current Status

Your `backend/config.env` is already configured for production:
- ✅ `NODE_ENV=production`
- ✅ Production URLs configured
- ✅ All environment variables set

## 🔧 Required Changes

### 1. Backend Configuration (`backend/config.env`)

**Already Configured ✅** - Your config.env is production-ready:
```env
NODE_ENV=production
BACKEND_URL=https://inspiranet-backend.onrender.com
FRONTEND_URL=https://inspiranet.onrender.com
CORS_ORIGIN=https://inspiranet.onrender.com
```

**No changes needed** - Already in production mode!

### 2. Frontend Build Configuration

The frontend automatically uses production URLs when built with production mode.

**Build Command for Production:**
```bash
cd frontend
npm run build:prod
# or
npm run build:render
```

This will:
- ✅ Use production URLs from `vite.config.ts`
- ✅ Disable development tools
- ✅ Optimize for production

### 3. Environment Variables for Render

When deploying to Render, set these environment variables:

**Backend Service:**
- All variables from `backend/config.env` (already production-ready)

**Frontend Service:**
```
VITE_API_URL=https://inspiranet-backend.onrender.com
VITE_SOCKET_URL=https://inspiranet-backend.onrender.com
VITE_MEETING_URL=https://inspiranet-backend.onrender.com
VITE_FRONTEND_URL=https://inspiranet.onrender.com
NODE_ENV=production
```

## 📋 Verification Checklist

### Backend Verification

- [x] `NODE_ENV=production` in `backend/config.env`
- [x] All URLs point to production (not localhost)
- [x] MongoDB connection string is production database
- [x] CORS_ORIGIN set to production frontend URL
- [x] FRONTEND_URL set to production frontend URL

### Frontend Verification

- [ ] Build with production mode: `npm run build:prod`
- [ ] Verify build output uses production URLs
- [ ] Check that no localhost references in built files
- [ ] Test API connections to production backend

### Runtime Verification

- [ ] Backend starts without development warnings
- [ ] Frontend connects to production backend
- [ ] Socket.io connects to production backend
- [ ] All API calls go to production URLs
- [ ] No CORS errors
- [ ] File uploads work (Cloudinary)
- [ ] Authentication works

## 🚀 Deployment Steps

### Step 1: Verify Backend Config
```bash
# Check backend/config.env
cat backend/config.env | grep -E "NODE_ENV|URL|localhost"
# Should show: NODE_ENV=production and production URLs only
```

### Step 2: Build Frontend for Production
```bash
cd frontend
npm run build:prod
# Verify dist folder is created
ls -la dist/
```

### Step 3: Test Locally (Optional)
```bash
# Backend
cd backend
npm start
# Should start in production mode

# Frontend (preview production build)
cd frontend
npm run preview
# Should connect to production backend
```

### Step 4: Deploy to Render

1. **Backend Service:**
   - Use `backend/config.env` values in Render environment variables
   - Build: `npm install`
   - Start: `npm start`

2. **Frontend Service:**
   - Set environment variables listed above
   - Build: `npm install && npm run build:prod`
   - Publish: `dist`

## 🔍 Code Analysis

### Files That Handle Environment Detection

1. **`frontend/vite.config.ts`**
   - ✅ Automatically uses production URLs when `mode === 'production'`
   - ✅ Uses localhost only in development mode

2. **`frontend/src/utils/urlConfig.ts`**
   - ✅ Uses `import.meta.env.MODE` to detect environment
   - ✅ Falls back to production URLs if environment variables not set

3. **`frontend/src/config/env.ts`**
   - ✅ Uses `import.meta.env.PROD` to detect production
   - ✅ Validates production config

4. **`backend/server.js`**
   - ✅ Uses `process.env.NODE_ENV` to detect environment
   - ✅ CORS configured to use `FRONTEND_URL` and `CORS_ORIGIN` from env

## ⚠️ Important Notes

1. **Development vs Production:**
   - Development: Uses localhost URLs, development tools enabled
   - Production: Uses hosted URLs, optimizations enabled

2. **Build Mode:**
   - `npm run dev` → Development mode (localhost)
   - `npm run build` → Production mode (uses production URLs)
   - `npm run build:prod` → Explicit production build

3. **Environment Variables:**
   - Backend: Uses `config.env` file (already production-ready)
   - Frontend: Uses environment variables set in Render dashboard
   - Frontend build-time: Uses `vite.config.ts` defaults if env vars not set

4. **No Code Changes Needed:**
   - The codebase already handles environment detection
   - Just ensure you build with production mode
   - Set environment variables in Render dashboard

## 🐛 Troubleshooting

### Issue: Frontend still connecting to localhost

**Solution:**
1. Ensure you're building with production mode: `npm run build:prod`
2. Check environment variables in Render dashboard
3. Verify `vite.config.ts` production mode logic

### Issue: Backend CORS errors

**Solution:**
1. Verify `FRONTEND_URL` and `CORS_ORIGIN` in backend config.env
2. Ensure they match your frontend URL exactly
3. Restart backend after updating

### Issue: Development tools still active

**Solution:**
1. Ensure `NODE_ENV=production` in backend
2. Build frontend with `npm run build:prod`
3. Check that `mode === 'production'` in vite.config.ts

## ✅ Final Checklist

Before going live:

- [ ] Backend `config.env` has `NODE_ENV=production`
- [ ] All URLs in `config.env` are production URLs (no localhost)
- [ ] Frontend built with `npm run build:prod`
- [ ] Environment variables set in Render dashboard
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Test login/authentication
- [ ] Test API calls
- [ ] Test Socket.io connection
- [ ] Test file uploads
- [ ] No console errors
- [ ] No CORS errors

## 📝 Summary

**Your application is already configured for production!**

- ✅ Backend config is production-ready
- ✅ Frontend code handles environment detection
- ✅ Just need to build with production mode
- ✅ Set environment variables in Render

**Next Steps:**
1. Build frontend: `cd frontend && npm run build:prod`
2. Deploy to Render (see `RENDER_REHOSTING_GUIDE.md`)
3. Set environment variables in Render dashboard
4. Verify everything works

---

**Status**: Ready for Production ✅
**Last Updated**: Based on current codebase analysis

