# Render Rehosting Summary

## What You Need to Do

### ✅ Code Changes (Already Done)

1. **Backend CORS Configuration** (`backend/server.js`)
   - ✅ Removed hardcoded frontend URL fallbacks
   - ✅ Now uses environment variables exclusively
   - ✅ More flexible for different deployment URLs

2. **Configuration Files**
   - ✅ `render.yaml` - Already configured
   - ✅ `frontend/render.yaml` - Already configured
   - ✅ All environment variables use proper fallbacks

### 📋 Manual Steps Required

#### Step 1: Create Backend Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repository
4. Configure service:
   ```
   Name: inspiranet-backend
   Environment: Node
   Region: (choose closest)
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```
5. Add environment variables (see list below)
6. Click **"Create Web Service"**
7. **Wait for deployment** and note the backend URL (e.g., `https://inspiranet-backend.onrender.com`)

#### Step 2: Create Frontend Service on Render

1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure service:
   ```
   Name: inspiranet
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
4. Add environment variables (use backend URL from Step 1):
   ```
   VITE_API_URL=<backend-url-from-step-1>
   VITE_SOCKET_URL=<backend-url-from-step-1>
   VITE_MEETING_URL=<backend-url-from-step-1>
   VITE_FRONTEND_URL=<will-be-assigned-after-deployment>
   NODE_ENV=production
   ```
5. Click **"Create Static Site"**
6. **Wait for deployment** and note the frontend URL (e.g., `https://inspiranet.onrender.com`)

#### Step 3: Update Environment Variables

**Backend Service:**
1. Go to backend service settings
2. Update environment variables:
   ```
   FRONTEND_URL=<frontend-url-from-step-2>
   CORS_ORIGIN=<frontend-url-from-step-2>
   ```
3. Restart service

**Frontend Service:**
1. Go to frontend service settings
2. Update environment variable:
   ```
   VITE_FRONTEND_URL=<frontend-url-from-step-2>
   ```
3. Redeploy service

---

## Environment Variables Checklist

### Backend Service (Required)

Copy these from your current `backend/config.env`:

- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `MONGODB_URI=...` (your MongoDB connection string)
- [ ] `JWT_SECRET=...` (your JWT secret)
- [ ] `JWT_REFRESH_SECRET=...` (your refresh JWT secret)
- [ ] `CLOUDINARY_CLOUD_NAME=...`
- [ ] `CLOUDINARY_API_KEY=...`
- [ ] `CLOUDINARY_API_SECRET=...`
- [ ] `FRONTEND_URL=...` (set after frontend deploys)
- [ ] `CORS_ORIGIN=...` (set after frontend deploys)
- [ ] `SESSION_SECRET=...`
- [ ] `SMTP_HOST=smtp.gmail.com` (if using email)
- [ ] `SMTP_PORT=587` (if using email)
- [ ] `SMTP_USER=...` (if using email)
- [ ] `SMTP_PASS=...` (if using email)

### Frontend Service (Required)

- [ ] `VITE_API_URL=...` (backend URL from Step 1)
- [ ] `VITE_SOCKET_URL=...` (backend URL from Step 1)
- [ ] `VITE_MEETING_URL=...` (backend URL from Step 1)
- [ ] `VITE_FRONTEND_URL=...` (frontend URL from Step 2)
- [ ] `NODE_ENV=production`

---

## Verification Steps

After deployment, verify:

1. **Backend Health Check**
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return success response

2. **Frontend Loads**
   - Visit: `https://your-frontend-url.onrender.com`
   - Should load the application

3. **API Connection**
   - Try logging in
   - Check browser console for API errors
   - Verify network requests go to backend URL

4. **Socket.io Connection**
   - Check browser console for socket connection
   - Verify real-time features work

5. **File Uploads**
   - Test image/file upload
   - Verify Cloudinary integration works

---

## Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Verify all required environment variables are set
- Check logs in Render dashboard

### Frontend can't connect to backend
- Verify `VITE_API_URL` matches backend URL exactly
- Check backend CORS settings
- Verify backend is running

### CORS errors
- Ensure `FRONTEND_URL` and `CORS_ORIGIN` in backend match frontend URL exactly
- Check for trailing slashes (should not have them)
- Restart backend after updating CORS variables

### Build fails
- Check Node.js version (should be >= 18.0.0)
- Verify all dependencies in `package.json`
- Check build logs for specific errors

---

## Alternative: Using Blueprint (render.yaml)

If you prefer automated setup:

1. Ensure `render.yaml` is in repository root
2. Go to Render Dashboard → **"New +"** → **"Blueprint"**
3. Connect repository
4. Render will detect `render.yaml` and create services
5. **Still need to manually add environment variables** (secrets are not in YAML)

---

## Important Notes

1. **Free Tier Limitation**: Services spin down after 15 minutes of inactivity. First request may be slow.

2. **Environment Variables**: Must be set in Render dashboard, not in code files.

3. **URL Updates**: After getting URLs from Render, update environment variables in both services.

4. **Auto-Deploy**: Enabled by default. Every push to main branch triggers deployment.

5. **Custom Domain**: Can be added later in service settings.

---

## Support

- **Detailed Guide**: See `RENDER_REHOSTING_GUIDE.md`
- **Quick Start**: See `DEPLOYMENT_QUICK_START.md`
- **Render Docs**: https://render.com/docs

---

**Status**: Ready for deployment ✅
**Estimated Time**: 15-20 minutes for complete setup

