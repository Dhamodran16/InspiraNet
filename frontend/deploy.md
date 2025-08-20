# Vercel Deployment Guide for InspiraNet

## Quick Deployment Steps

### 1. Prepare Your Repository
- Ensure all changes are committed to your Git repository
- Make sure you're in the `frontend` directory

### 2. Install Vercel CLI
```bash
npm install -g vercel
```

### 3. Login to Vercel
```bash
vercel login
```

### 4. Deploy to Vercel
```bash
# From the frontend directory
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? [Select your account]
# - Link to existing project? N
# - What's your project's name? inspiranet-frontend
# - In which directory is your code located? ./
# - Want to override the settings? N
```

### 5. Set Environment Variables
After deployment, go to your Vercel dashboard:

1. Navigate to your project
2. Go to Settings > Environment Variables
3. Add the following variables:

```
VITE_BACKEND_URL=https://your-backend-api-url.com
VITE_FRONTEND_URL=https://your-frontend-url.vercel.app
VITE_SOCKET_URL=https://your-backend-api-url.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

### 6. Redeploy with Environment Variables
```bash
vercel --prod
```

## Alternative: GitHub Integration

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Vite
   - Root Directory: frontend
   - Build Command: npm run build
   - Output Directory: dist

### 3. Set Environment Variables
Add the same environment variables as mentioned above.

## Important Configuration Notes

### CORS Configuration
Make sure your backend allows requests from your Vercel domain:
```
https://your-app-name.vercel.app
```

### Build Optimization
The app is configured with:
- Code splitting for better performance
- Static asset caching
- Client-side routing support

### Troubleshooting

#### Build Failures
- Check that all dependencies are in `package.json`
- Verify environment variables are set correctly
- Check the build logs in Vercel dashboard

#### Routing Issues
- The `vercel.json` file handles client-side routing
- All routes fallback to `index.html`

#### API Connection Issues
- Verify backend URL is accessible
- Check CORS settings on backend
- Ensure HTTPS is used for production

## Post-Deployment Checklist

- [ ] Environment variables are set
- [ ] Backend API is accessible
- [ ] CORS is configured correctly
- [ ] All routes work properly
- [ ] Static assets load correctly
- [ ] Authentication flow works
- [ ] Real-time features (socket) work
- [ ] File uploads work (Cloudinary)

## Performance Optimization

The app includes:
- Lazy loading for components
- Code splitting for vendor libraries
- Optimized bundle size
- Static asset caching
- Service worker ready (can be added later)
