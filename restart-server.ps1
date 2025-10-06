# Restart Server Script
Write-Host "🔄 Stopping existing Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "⏳ Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Set-Location "backend"
Start-Process powershell -ArgumentList "-Command", "npm start" -WindowStyle Normal

Write-Host "✅ Backend server started!" -ForegroundColor Green
Write-Host "📊 Health check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "🔐 Test auth: http://localhost:5000/api/test-auth" -ForegroundColor Cyan
