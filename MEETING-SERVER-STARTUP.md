# 🚀 Meeting System Startup Guide (Integrated)

## 🎯 **NEW: Meeting System is Now Integrated!**

The meeting system has been **fully integrated** into the main backend server. You now only need **ONE server** running on port 5000!

## 🔧 **Quick Start (Windows)**

### **Option 1: One-Click Start (Recommended)**
```bash
# Double-click this file:
start-meeting-system.bat
```

### **Option 2: Manual Start**
```bash
# Terminal 1 - Backend Server (Includes Meeting Functionality)
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🎯 **What the Integrated Server Does**

### **Backend Server (Port 5000)**
- ✅ User authentication
- ✅ Database operations
- ✅ File uploads
- ✅ General API endpoints
- ✅ **WebRTC video/audio calls** (NEW!)
- ✅ **Socket.IO connections** (NEW!)
- ✅ **Meeting room management** (NEW!)
- ✅ **Real-time communication** (NEW!)

## ❌ **Common Errors & Solutions**

### **Error: "WebSocket connection failed"**
**Cause**: Backend server not running
**Solution**: Start the backend server with `npm start`

### **Error: "ERR_CONNECTION_REFUSED"**
**Cause**: Port 5000 not accessible
**Solution**: Check if backend server is running on port 5000

### **Error: "Video element not initialized"**
**Cause**: Video ref not ready
**Solution**: Refresh the page and wait for initialization

## 🔍 **Troubleshooting Steps**

### **Step 1: Check Server Status**
```bash
# Check if port 5000 is in use
netstat -an | findstr :5000
netstat -an | findstr :8083
```

### **Step 2: Verify Backend Server**
```bash
# Test backend server endpoint
curl http://localhost:5000/api/health
```

### **Step 3: Verify Meeting Configuration**
```bash
# Test meeting configuration endpoint
curl http://localhost:5000/config
```

**Expected Response:**
```json
{
  "rtcConfig": {
    "iceServers": [
      {"urls": "stun:stun.l.google.com:19302"},
      {"urls": "stun:stun1.l.google.com:19302"}
    ]
  }
}
```

### **Step 4: Check Console Logs**
Look for these messages in the backend server terminal:
```
✅ Connected to MongoDB
✅ Server running on port 5000
🔌 WebSocket server ready for real-time messaging
```

## 🚀 **Advanced Startup Scripts**

### **Windows (start-meeting-system.bat)**
- Checks prerequisites (Node.js, npm)
- Starts backend server with meeting functionality
- Starts frontend development server
- Shows detailed status

### **Linux/Mac (start-meeting-system.sh)**
- Starts services in background
- Automatic cleanup on exit
- Cross-platform compatibility

## 📋 **Startup Checklist**

- [ ] Node.js installed (v16+)
- [ ] npm installed
- [ ] Backend dependencies installed (`npm install` in backend folder)
- [ ] Frontend dependencies installed (`npm install` in frontend folder)
- [ ] **Backend server running on port 5000** (includes meetings!)
- [ ] Frontend running on port 8083
- [ ] Chrome browser with camera/microphone permissions

## 🔧 **Manual Server Commands**

### **Backend Server (Includes Meetings)**
```bash
cd backend
npm install          # Install dependencies
npm start           # Start server with meeting functionality
```

### **Frontend**
```bash
cd frontend
npm install          # Install dependencies
npm run dev         # Start development server
```

## 🌐 **Service URLs**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Backend** | **5000** | **http://localhost:5000** | **Main API + Meetings** |
| Frontend | 8083 | http://localhost:8083 | Web interface |

## 🚨 **Emergency Fixes**

### **If Backend Server Won't Start:**
1. Check if port 5000 is already in use
2. Kill any existing Node.js processes
3. Clear npm cache: `npm cache clean --force`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

### **If WebRTC Not Working:**
1. Ensure HTTPS in production (required for WebRTC)
2. Check browser permissions
3. Verify STUN/TURN server configuration
4. Test with different browsers

### **If Socket Connection Fails:**
1. Check firewall settings
2. Verify CORS configuration
3. Check network connectivity
4. Restart backend server

## 📞 **Support**

If you're still having issues:
1. Check the browser console for errors
2. Verify backend server is running
3. Check the server terminal logs
4. Ensure no other applications are using port 5000

## 🎯 **Success Indicators**

When everything is working correctly, you should see:
- ✅ Backend server: "Server running on port 5000"
- ✅ Backend server: "WebSocket server ready for real-time messaging"
- ✅ Frontend: "Local: http://localhost:8083"
- ✅ Browser: Video calls working correctly
- ✅ Video: Local camera feed displays correctly

## 🆕 **What Changed**

- ❌ **REMOVED**: Separate meeting server on port 3001
- ❌ **REMOVED**: Complex multi-server setup
- ✅ **ADDED**: Meeting functionality integrated into main backend
- ✅ **ADDED**: Single server handles everything
- ✅ **ADDED**: Simplified startup process
- ✅ **ADDED**: Better performance and reliability
