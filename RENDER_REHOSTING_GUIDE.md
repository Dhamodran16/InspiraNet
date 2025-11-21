# Render Rehosting Guide for InspiraNet

This guide provides step-by-step instructions for rehosting your InspiraNet application on Render.

## Current URLs
- **Frontend**: https://inspiranet.onrender.com
- **Backend**: https://inspiranet-backend.onrender.com

## Prerequisites

1. **Render Account**: Ensure you have an active Render account
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Atlas**: Database should be set up and accessible
4. **Cloudinary Account**: For image/file uploads
5. **Environment Variables**: All secrets and configuration ready

---

## Manual Steps on Render Dashboard

### Step 1: Backend Service Setup

1. **Go to Render Dashboard** → https://dashboard.render.com
2. **Click "New +"** → Select **"Web Service"**
3. **Connect Repository**:
   - Connect your GitHub repository
   - Select the repository containing your code
4. **Configure Backend Service**:
   - **Name**: `inspiranet-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose based on your needs (Starter/Standard/Pro)

5. **Environment Variables** (Add these in the Environment tab):
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   FRONTEND_URL=https://inspiranet.onrender.com
   CORS_ORIGIN=https://inspiranet.onrender.com
   SESSION_SECRET=your_session_secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

6. **Advanced Settings**:
   - **Auto-Deploy**: `Yes` (deploys on every push to main branch)
   - **Health Check Path**: `/api/health` (if you have one)

7. **Click "Create Web Service"**

### Step 2: Frontend Service Setup

1. **Go to Render Dashboard** → Click **"New +"** → Select **"Static Site"**
2. **Connect Repository**:
   - Connect the same GitHub repository
3. **Configure Frontend Service**:
   - **Name**: `inspiranet` (or your preferred name)
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: `Node` (for build process)

4. **Environment Variables** (Add these in the Environment tab):
   ```
   VITE_API_URL=https://inspiranet-backend.onrender.com
   VITE_SOCKET_URL=https://inspiranet-backend.onrender.com
   VITE_MEETING_URL=https://inspiranet-backend.onrender.com
   VITE_FRONTEND_URL=https://inspiranet.onrender.com
   NODE_ENV=production
   ```

5. **Advanced Settings**:
   - **Auto-Deploy**: `Yes`
   - **Pull Request Previews**: `Yes` (optional)

6. **Click "Create Static Site"**

### Step 3: Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your service settings
2. Click on **"Custom Domains"**
3. Add your domain
4. Follow DNS configuration instructions
5. Update environment variables with new domain URLs

---

## Code Changes Required

### ✅ Already Configured (No Changes Needed)

The following files are already properly configured:

1. **`render.yaml`** - Root deployment configuration
2. **`frontend/render.yaml`** - Frontend-specific configuration
3. **`backend/package.json`** - Backend scripts
4. **`frontend/package.json`** - Frontend build scripts
5. **Environment variable usage** - All URLs use environment variables

### ⚠️ Important Notes

1. **Backend URL Reference**: After backend deploys, note the new backend URL
2. **Update Frontend Environment Variables**: Update `VITE_API_URL`, `VITE_SOCKET_URL`, and `VITE_MEETING_URL` in frontend service to point to the new backend URL
3. **Update Backend Environment Variables**: Update `FRONTEND_URL` and `CORS_ORIGIN` in backend service to point to the new frontend URL

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables documented
- [ ] MongoDB Atlas connection string ready
- [ ] Cloudinary credentials ready
- [ ] JWT secrets generated
- [ ] SMTP credentials configured (if using email)
- [ ] GitHub repository is up to date
- [ ] All code changes committed and pushed

### Backend Deployment

- [ ] Backend service created on Render
- [ ] All environment variables added
- [ ] Build command verified: `npm install`
- [ ] Start command verified: `npm start`
- [ ] Root directory set to: `backend`
- [ ] Service deployed successfully
- [ ] Health check endpoint working: `https://your-backend-url.onrender.com/api/health`
- [ ] Backend URL noted for frontend configuration

### Frontend Deployment

- [ ] Frontend service created on Render
- [ ] Backend URL environment variables updated with actual backend URL
- [ ] Build command verified: `npm install && npm run build`
- [ ] Publish directory set to: `dist`
- [ ] Root directory set to: `frontend`
- [ ] Service deployed successfully
- [ ] Frontend URL accessible
- [ ] Frontend URL noted for backend CORS configuration

### Post-Deployment

- [ ] Backend CORS updated with frontend URL
- [ ] Frontend API calls working
- [ ] Socket.io connections working
- [ ] Authentication flow working
- [ ] File uploads working (Cloudinary)
- [ ] Email notifications working (if configured)
- [ ] All routes accessible
- [ ] Real-time features working

---

## Troubleshooting

### Backend Issues

1. **Build Fails**:
   - Check Node.js version (should be >= 18.0.0)
   - Verify `package.json` has correct scripts
   - Check build logs for specific errors

2. **Service Won't Start**:
   - Verify `PORT` environment variable is set
   - Check MongoDB connection string
   - Review server logs in Render dashboard

3. **CORS Errors**:
   - Verify `FRONTEND_URL` and `CORS_ORIGIN` match your frontend URL
   - Check backend logs for CORS rejection messages

### Frontend Issues

1. **Build Fails**:
   - Check Node.js version
   - Verify all environment variables are set
   - Check build logs for specific errors

2. **API Calls Fail**:
   - Verify `VITE_API_URL` points to correct backend URL
   - Check browser console for CORS errors
   - Verify backend is running and accessible

3. **Socket.io Not Connecting**:
   - Verify `VITE_SOCKET_URL` points to correct backend URL
   - Check backend Socket.io CORS configuration
   - Review browser console for connection errors

### Common Solutions

1. **Environment Variables Not Working**:
   - Restart the service after adding environment variables
   - Verify variable names match exactly (case-sensitive)
   - Check for typos in URLs

2. **Static Files Not Loading**:
   - Verify `Publish Directory` is set to `dist`
   - Check that build completed successfully
   - Verify file paths in HTML

3. **Routes Not Working**:
   - Ensure `render.yaml` has proper rewrite rules
   - Check that all routes redirect to `index.html`
   - Verify React Router configuration

---

## Using render.yaml (Alternative Method)

If you prefer using the `render.yaml` file:

1. **Push `render.yaml` to root of repository**
2. **Go to Render Dashboard** → **"New +"** → **"Blueprint"**
3. **Connect Repository** and select the repository
4. **Render will automatically detect `render.yaml`**
5. **Review the services** it will create
6. **Click "Apply"** to create all services
7. **Add environment variables** manually in each service's settings

**Note**: You'll still need to manually add environment variables as `render.yaml` uses `sync: false` for sensitive values.

---

## Monitoring & Maintenance

### Health Checks

- **Backend**: Set up health check endpoint at `/api/health`
- **Frontend**: Static site automatically health-checked by Render

### Logs

- Access logs in Render dashboard under each service
- Backend logs show server activity and errors
- Frontend build logs show build process

### Updates

- **Auto-Deploy**: Enabled by default, deploys on every push to main branch
- **Manual Deploy**: Use "Manual Deploy" button in Render dashboard
- **Rollback**: Use "Rollback" option if deployment fails

---

## Security Best Practices

1. **Never commit** `.env` files or `config.env` files
2. **Use Render's environment variables** for all secrets
3. **Rotate secrets** periodically
4. **Enable HTTPS** (automatic on Render)
5. **Use strong JWT secrets** (at least 32 characters)
6. **Configure CORS** properly to prevent unauthorized access
7. **Use rate limiting** (already configured in backend)

---

## Cost Considerations

- **Starter Plan**: Free tier available (with limitations)
- **Standard Plan**: Better performance, more resources
- **Pro Plan**: Production-grade performance

**Note**: Free tier services spin down after 15 minutes of inactivity. First request after spin-down may be slow.

---

## Support Resources

- **Render Documentation**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Render Community**: https://community.render.com

---

## Quick Reference: Environment Variables

### Backend Required Variables
```
NODE_ENV=production
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=...
CORS_ORIGIN=...
SESSION_SECRET=...
```

### Frontend Required Variables
```
VITE_API_URL=...
VITE_SOCKET_URL=...
VITE_MEETING_URL=...
VITE_FRONTEND_URL=...
NODE_ENV=production
```

---

**Last Updated**: Based on current codebase configuration
**Status**: Ready for deployment

