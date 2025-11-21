# Quick Start: Render Deployment

## TL;DR - Fast Deployment Steps

### 1. Backend (5 minutes)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `inspiranet-backend`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build**: `npm install`
   - **Start**: `npm start`
5. Add ALL environment variables from `backend/config.env.example`
6. Deploy!

### 2. Frontend (5 minutes)

1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repo
3. Configure:
   - **Name**: `inspiranet`
   - **Root Directory**: `frontend`
   - **Build**: `npm install && npm run build`
   - **Publish**: `dist`
4. Add environment variables:
   ```
   VITE_API_URL=<your-backend-url>
   VITE_SOCKET_URL=<your-backend-url>
   VITE_MEETING_URL=<your-backend-url>
   VITE_FRONTEND_URL=<your-frontend-url>
   NODE_ENV=production
   ```
5. Deploy!

### 3. Update URLs (2 minutes)

1. Copy backend URL from Render dashboard
2. Update frontend environment variables with backend URL
3. Copy frontend URL from Render dashboard
4. Update backend `FRONTEND_URL` and `CORS_ORIGIN` with frontend URL
5. Restart both services

### ✅ Done!

Your app should now be live at your Render URLs.

---

**For detailed instructions, see `RENDER_REHOSTING_GUIDE.md`**

