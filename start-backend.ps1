# Start Backend Server Script
Write-Host "🔄 Starting backend server..." -ForegroundColor Green

# Navigate to backend directory
Set-Location "backend"

# Start the server
Write-Host "🚀 Starting Node.js server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "npm start" -WindowStyle Normal

Write-Host "✅ Backend server started!" -ForegroundColor Green
Write-Host "📊 Health check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "🔐 Test auth: http://localhost:5000/api/test-auth" -ForegroundColor Cyan
Write-Host "📅 Test meeting: http://localhost:5000/api/create-simple-meeting" -ForegroundColor Cyan

Write-Host "`n💡 To test the server, open a new terminal and run:" -ForegroundColor Yellow
Write-Host "   Invoke-WebRequest -Uri 'http://localhost:5000/api/health' -Method GET" -ForegroundColor White
