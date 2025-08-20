# 🚀 Render Deployment Guide for InspiraNet

## Overview
Render is a cloud platform that offers static site hosting with automatic deployments from Git repositories. It's perfect for React applications built with Vite.

## Prerequisites
- Node.js 18+ project
- Git repository with your code
- Render account (free tier available)
- Backend API deployed and accessible

## Deployment Methods

### Method 1: Web Dashboard (Recommended)

#### Step 1: Prepare Your Repository
1. Ensure all changes are committed to your Git repository
2. Make sure you're in the `frontend` directory
3. Verify these files exist:
   - `package.json`
   - `vite.config.ts`
   - `render.yaml` (created for you)

#### Step 2: Connect to Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" and select "Static Site"
3. Connect your GitHub/GitLab repository
4. Configure the deployment:
   - **Name**: `inspiranet-frontend`
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `frontend` (if your repo has both frontend/backend)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

#### Step 3: Set Environment Variables
In the Render dashboard, go to your service > Environment:
```
VITE_BACKEND_URL=https://your-backend-api.com
VITE_FRONTEND_URL=https://your-app-name.onrender.com
VITE_SOCKET_URL=https://your-backend-api.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

#### Step 4: Deploy
Click "Create Static Site" and wait for the build to complete.

### Method 2: Using render.yaml (Blueprint)

#### Step 1: Update render.yaml
Edit the `render.yaml` file with your actual values:
```yaml
services:
  - type: web
    name: inspiranet-frontend
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_BACKEND_URL
        value: https://your-actual-backend.com
      - key: VITE_FRONTEND_URL
        value: https://your-actual-app.onrender.com
      # ... other variables
```

#### Step 2: Deploy via Blueprint
1. In Render dashboard, click "New +" > "Blueprint"
2. Connect your repository
3. Render will automatically detect and use your `render.yaml`

## Configuration Files

### render.yaml
This file defines your service configuration:
- Build commands
- Environment variables
- Routing rules
- Service settings

### _redirects
Handles client-side routing for React Router:
```
/*    /index.html   200
```

### build.sh
Optional build script for custom build processes.

## Environment Variables

### Required Variables
- `VITE_BACKEND_URL` - Your backend API URL
- `VITE_FRONTEND_URL` - Your Render frontend URL
- `VITE_SOCKET_URL` - Your backend socket URL

### Optional Variables
- `VITE_CLOUDINARY_CLOUD_NAME` - For file uploads
- `VITE_CLOUDINARY_UPLOAD_PRESET` - For file uploads
- `VITE_ENABLE_NOTIFICATIONS` - Feature flags
- `VITE_ENABLE_SOCKETS` - Feature flags

## Build Process

### Automatic Builds
- Render automatically builds on every push to your main branch
- Build logs are available in the dashboard
- Failed builds are retried automatically

### Build Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output goes to 'dist' directory
```

## Custom Domains

### Adding Custom Domain
1. Go to your service in Render dashboard
2. Click "Settings" > "Custom Domains"
3. Add your domain
4. Update DNS records as instructed

### SSL Certificate
- Render automatically provides SSL certificates
- HTTPS is enabled by default
- No additional configuration needed

## Performance Optimization

### Built-in Features
- Global CDN
- Automatic compression
- Static asset caching
- Edge caching

### Additional Optimizations
- Code splitting (already configured)
- Lazy loading components
- Optimized bundle size
- Image optimization

## Monitoring & Analytics

### Render Analytics
- Built-in analytics dashboard
- Performance metrics
- Error tracking
- Uptime monitoring

### Custom Analytics
- Google Analytics
- Vercel Analytics
- Custom tracking scripts

## Troubleshooting

### Build Failures
```bash
# Test build locally
npm run build

# Check for missing dependencies
npm install

# Verify environment variables
echo $VITE_BACKEND_URL
```

### Common Issues
1. **Build Timeout**: Increase build timeout in settings
2. **Memory Issues**: Optimize bundle size
3. **Environment Variables**: Check variable names and values
4. **Routing Issues**: Verify `_redirects` file

### Debugging
- Check build logs in Render dashboard
- Test locally with production build
- Verify environment variables
- Check browser console for errors

## Cost & Limits

### Free Tier
- 750 hours/month
- Automatic sleep after 15 minutes of inactivity
- 100GB bandwidth/month
- Custom domains supported

### Paid Plans
- Always-on instances
- More bandwidth
- Priority support
- Advanced features

## Migration from Vercel

### Key Differences
- Render uses `render.yaml` instead of `vercel.json`
- Different environment variable syntax
- Slightly different build process
- Different dashboard interface

### Migration Steps
1. Create `render.yaml` configuration
2. Set up environment variables
3. Deploy to Render
4. Update DNS if using custom domain
5. Test thoroughly
6. Update documentation

## Support & Resources

### Documentation
- [Render Documentation](https://render.com/docs)
- [Static Site Hosting](https://render.com/docs/static-sites)
- [Environment Variables](https://render.com/docs/environment-variables)

### Community
- [Render Community](https://community.render.com)
- [GitHub Discussions](https://github.com/render-oss/render)

## Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Build completes successfully
- [ ] All routes work properly
- [ ] Static assets load correctly
- [ ] Authentication flow works
- [ ] Real-time features work
- [ ] File uploads work
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] SSL certificate active
- [ ] Custom domain configured (if needed)
