# 🚀 Render Deployment Guide

## Overview
This guide will help you deploy the InspiraNet application to Render.com

## Prerequisites
- Render.com account
- MongoDB Atlas database
- Cloudinary account (for image uploads)
- GitHub repository with your code

## 🏗️ Architecture
- **Backend**: Node.js/Express API service
- **Frontend**: React/Vite static site
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary
- **Real-time**: Socket.IO

## 📋 Deployment Steps

### 1. Backend Deployment

#### Create Backend Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

```
Name: inspiranet-backend
Environment: Node
Build Command: cd backend && npm install
Start Command: cd backend && npm start
```

#### Environment Variables
Set these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_long_random_jwt_secret
JWT_REFRESH_SECRET=your_long_random_refresh_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=https://inspiranet.onrender.com
CORS_ORIGIN=https://inspiranet.onrender.com
SESSION_SECRET=your_session_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 2. Frontend Deployment

#### Create Frontend Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure the service:

```
Name: inspiranet
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/dist
```

#### Environment Variables
Set these environment variables in Render dashboard:

```bash
VITE_API_URL=https://inspiranet-backend.onrender.com
VITE_SOCKET_URL=https://inspiranet-backend.onrender.com
VITE_MEETING_URL=https://inspiranet-backend.onrender.com
VITE_FRONTEND_URL=https://inspiranet.onrender.com
NODE_ENV=production
```

## 🔧 Configuration

### MongoDB Atlas Setup
1. Create a MongoDB Atlas cluster
2. Create a database user
3. Get your connection string
4. Add it to backend environment variables

### Cloudinary Setup
1. Create a Cloudinary account
2. Get your cloud name, API key, and secret
3. Add them to backend environment variables

### Email Setup (Optional)
1. Enable 2FA on your Gmail account
2. Generate an App Password
3. Add SMTP credentials to backend environment variables

## 🌐 Domain Configuration

### Custom Domain (Optional)
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain and configure DNS

### SSL Certificate
- Render automatically provides SSL certificates
- No additional configuration needed

## 📊 Monitoring

### Health Checks
- Backend: `https://inspiranet-backend.onrender.com/health`
- Frontend: Automatically served by Render

### Logs
- View logs in Render dashboard
- Monitor for errors and performance issues

## 🔄 Continuous Deployment

### Automatic Deploys
- Render automatically deploys on git push
- Configure branch protection in GitHub
- Use feature branches for development

### Manual Deploys
- Trigger manual deploys from Render dashboard
- Useful for testing before production

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Ensure Node.js version compatibility

#### Environment Variables
- Double-check all environment variables are set
- Verify no typos in variable names
- Test locally with same variables

#### Database Connection
- Verify MongoDB URI is correct
- Check network access in MongoDB Atlas
- Ensure database user has proper permissions

#### CORS Issues
- Verify FRONTEND_URL is set correctly
- Check CORS_ORIGIN matches your frontend URL
- Test API endpoints directly

### Performance Optimization

#### Backend
- Enable gzip compression
- Use Redis for session storage (optional)
- Implement proper caching headers

#### Frontend
- Optimize bundle size
- Use CDN for static assets
- Implement lazy loading

## 📈 Scaling

### Auto-scaling
- Render automatically scales based on traffic
- Monitor resource usage in dashboard
- Upgrade plan if needed

### Manual Scaling
- Adjust instance size in Render dashboard
- Monitor performance metrics
- Scale based on user load

## 🔒 Security

### Environment Variables
- Never commit sensitive data to git
- Use Render's environment variable system
- Rotate secrets regularly

### API Security
- Implement rate limiting
- Use HTTPS for all communications
- Validate all inputs

### Database Security
- Use MongoDB Atlas security features
- Enable network access controls
- Regular security updates

## 📞 Support

### Render Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)

### Application Support
- Check application logs
- Monitor error tracking
- Test functionality regularly

## 🎯 Success Checklist

- [ ] Backend service deployed and running
- [ ] Frontend service deployed and accessible
- [ ] Database connected and working
- [ ] File uploads working with Cloudinary
- [ ] Real-time features working (Socket.IO)
- [ ] Email notifications working (if configured)
- [ ] SSL certificates active
- [ ] Custom domain configured (if needed)
- [ ] Monitoring and logging set up
- [ ] Performance optimized
- [ ] Security measures implemented

## 🚀 Go Live!

Once all steps are completed:
1. Test all features thoroughly
2. Monitor performance and errors
3. Share your application URL
4. Celebrate your deployment! 🎉

---

**Note**: Keep your environment variables secure and never share them publicly. Regularly update dependencies and monitor your application's performance.
