# InspiraNet Frontend

A React-based alumni networking platform built with Vite, TypeScript, and Tailwind CSS.

## 🚀 Deployment on Vercel

### Prerequisites
- Node.js 18+ installed
- Vercel account
- Backend API deployed and accessible

### Environment Variables

Before deploying, you need to set the following environment variables in your Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:

```
VITE_BACKEND_URL=https://your-backend-api-url.com
VITE_FRONTEND_URL=https://your-frontend-url.vercel.app
VITE_SOCKET_URL=https://your-backend-api-url.com
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

### Deployment Steps

1. **Connect to Vercel:**
   - Install Vercel CLI: `npm i -g vercel`
   - Login: `vercel login`

2. **Deploy:**
   ```bash
   # From the frontend directory
   vercel
   
   # Or for production
   vercel --prod
   ```

3. **Automatic Deployments:**
   - Connect your GitHub repository to Vercel
   - Push to main branch for automatic deployments

### Build Commands

- `npm run build` - Build for production
- `npm run dev` - Start development server
- `npm run preview` - Preview production build

### Important Notes

- The app uses client-side routing with React Router
- All routes are configured to fallback to `index.html` for SPA behavior
- Static assets are cached for optimal performance
- Make sure your backend CORS settings allow your Vercel domain

### Troubleshooting

1. **Build Failures:**
   - Check that all environment variables are set
   - Ensure all dependencies are in `package.json`

2. **Routing Issues:**
   - Verify `vercel.json` is in the root directory
   - Check that the rewrite rule is working

3. **API Connection Issues:**
   - Verify backend URL is correct and accessible
   - Check CORS configuration on backend
