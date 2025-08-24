# 🚀 Backend Deployment Guide for InspiraNet

## 🚨 **Current Issue: Backend Not Deployed**

Your frontend is working perfectly on Render, but the backend is not deployed, causing:
- 404 errors for API endpoints
- 503 Service Unavailable errors
- Database connection failures

## 📋 **Backend Deployment Steps**

### 1. **Prepare Backend for Deployment**

1. **Create config.env file** in the backend directory:
   ```bash
   cd backend
   cp config.env.example config.env
   ```

2. **Edit config.env** with your actual values:
   ```env
   # Server Configuration
   PORT=10000
   NODE_ENV=production

   # MongoDB Configuration (REQUIRED)
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database?retryWrites=true&w=majority

   # JWT Configuration (REQUIRED)
   JWT_SECRET=your_very_long_and_random_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_very_long_and_random_refresh_jwt_secret_key_here

   # Frontend URLs
   FRONTEND_URL=https://inspiranet.onrender.com

   # CORS Configuration
   CORS_ORIGIN=https://inspiranet.onrender.com
   ```

### 2. **Deploy Backend on Render**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Set **Root Directory** to: `backend`

3. **Configure Build Settings**:
   - **Name**: `inspiranet-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Set Environment Variables** in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database?retryWrites=true&w=majority
   JWT_SECRET=your_very_long_and_random_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_very_long_and_random_refresh_jwt_secret_key_here
   FRONTEND_URL=https://inspiranet.onrender.com
   CORS_ORIGIN=https://inspiranet.onrender.com
   ```

### 3. **MongoDB Setup (CRITICAL)**

You need a MongoDB database. Options:

#### **Option A: MongoDB Atlas (Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string
4. Add to environment variables

#### **Option B: Local MongoDB**
- Not recommended for production

### 4. **Update Frontend Environment Variables**

Once backend is deployed, update your frontend environment variables in Render:

```
VITE_BACKEND_URL=https://your-backend-name.onrender.com
VITE_SOCKET_URL=https://your-backend-name.onrender.com
VITE_MEETING_URL=https://your-backend-name.onrender.com
VITE_FRONTEND_URL=https://inspiranet.onrender.com
VITE_ENVIRONMENT=production
```

## 🔧 **Troubleshooting**

### **Backend Won't Start**
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check build logs in Render dashboard

### **Database Connection Issues**
- Verify MongoDB Atlas cluster is running
- Check IP whitelist in MongoDB Atlas
- Test connection string locally

### **CORS Errors**
- Ensure FRONTEND_URL is set correctly
- Check CORS_ORIGIN matches frontend URL
- Verify backend is accessible

### **API Endpoints Return 404**
- Check if backend service is running
- Verify routes are properly configured
- Check server logs

## 📊 **Health Check Endpoints**

Once deployed, test these endpoints:

- **Health Check**: `https://your-backend.onrender.com/health`
- **API Health**: `https://your-backend.onrender.com/api/health`
- **Database Health**: `https://your-backend.onrender.com/api/health/db`

## 🎯 **Expected Results**

After successful backend deployment:
- ✅ Backend service starts without errors
- ✅ Database connection established
- ✅ API endpoints respond correctly
- ✅ Frontend can authenticate users
- ✅ Real-time features work
- ✅ No more 503/404 errors

## 🚨 **Critical Checklist**

- [ ] MongoDB Atlas cluster created and running
- [ ] Environment variables set in Render
- [ ] Backend service deployed and running
- [ ] Frontend environment variables updated
- [ ] Health check endpoints working
- [ ] Authentication working
- [ ] No CORS errors

---

**🎉 Once the backend is deployed, your InspiraNet application will work perfectly!**
