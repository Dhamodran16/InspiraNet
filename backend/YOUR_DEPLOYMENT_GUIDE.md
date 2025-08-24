# 🚀 Your InspiraNet Backend Deployment Guide

## ✅ **Your Configuration is Ready!**

Your backend is properly configured with:
- ✅ MongoDB Atlas connection
- ✅ JWT secrets
- ✅ Cloudinary setup
- ✅ Render configuration

## 📋 **Step-by-Step Deployment**

### **Step 1: Deploy Backend to Render**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Dhamodran16/InspiraNet`
   - Set **Root Directory** to: `backend`

3. **Configure Build Settings**:
   - **Name**: `inspiranet-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### **Step 2: Set Environment Variables**

Copy these **exact values** to your Render environment variables:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://dhamodran17:WT_PROJECT@wt-project.zr3ux3r.mongodb.net/infranet
JWT_SECRET=4bfde224b542bc44b76fd9e4e7aec01df02fb521b832d2b2feb8efa2c142487bc1acc15cb5fa611e6052451e2c31790e163391216574400d1554493572e28bec
JWT_REFRESH_SECRET=8c9fde448a643bc88b53fd9e8e8aec02ef03fc622c943c3c3feb9efa3c253598cd2bdd26dc6fb722f7163452f3d42891f274492327584501e2665594683f39cdf
FRONTEND_URL=https://inspiranet.onrender.com
CORS_ORIGIN=https://inspiranet.onrender.com
CLOUDINARY_CLOUD_NAME=infranet-sample
CLOUDINARY_API_KEY=719852686567555
CLOUDINARY_API_SECRET=Vkn7twxST4oU7aNNJUR7mikrXkI
CLOUDINARY_UPLOAD_PRESET=InfraNet
```

### **Step 3: Deploy**

Click "Create Web Service" and wait for deployment to complete.

### **Step 4: Get Your Backend URL**

Once deployed, Render will give you a URL like:
`https://inspiranet-backend-xxxx.onrender.com`

**Save this URL!** You'll need it for the next step.

### **Step 5: Update Frontend Environment Variables**

Go to your **frontend service** in Render and update these environment variables:

```
VITE_BACKEND_URL=https://your-backend-url.onrender.com
VITE_SOCKET_URL=https://your-backend-url.onrender.com
VITE_MEETING_URL=https://your-backend-url.onrender.com
VITE_FRONTEND_URL=https://inspiranet.onrender.com
VITE_ENVIRONMENT=production
```

Replace `your-backend-url.onrender.com` with your actual backend URL.

## 🧪 **Test Your Deployment**

Once both services are deployed, test these endpoints:

1. **Backend Health**: `https://your-backend-url.onrender.com/health`
2. **API Health**: `https://your-backend-url.onrender.com/api/health`
3. **Frontend**: `https://inspiranet.onrender.com`

## 🎯 **Expected Results**

After successful deployment:
- ✅ Backend service starts without errors
- ✅ Database connection established
- ✅ API endpoints respond correctly
- ✅ Frontend can authenticate users
- ✅ No more 503/404 errors
- ✅ Login works properly

## 🚨 **Troubleshooting**

### **If Backend Won't Start:**
- Check all environment variables are set correctly
- Verify MongoDB Atlas cluster is running
- Check build logs in Render dashboard

### **If Frontend Still Shows Errors:**
- Ensure frontend environment variables are updated
- Check that backend URL is correct
- Verify CORS settings

### **If Database Connection Fails:**
- Verify MongoDB Atlas cluster is active
- Check connection string is correct
- Ensure IP whitelist allows Render IPs

## 📞 **Quick Commands**

To check your backend status:
```bash
# Health check
curl https://your-backend-url.onrender.com/health

# API health
curl https://your-backend-url.onrender.com/api/health
```

---

**🎉 Once you complete these steps, your InspiraNet application will work perfectly!**

**Your backend URL will be something like:**
`https://inspiranet-backend-xxxx.onrender.com`

**Make sure to update your frontend environment variables with this URL.**
