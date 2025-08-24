# InspiraNet Frontend

A modern React-based frontend for the KEC Alumni Network platform, built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+ or yarn 1.22+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd InspiraNet/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8083`

## 🏗️ Build & Deployment

### Development Build
```bash
npm run build:dev
```

### Production Build
```bash
npm run build
```

### Using the Build Script
```bash
# Full build with verification
./build.sh

# Build with preview server
./build.sh --preview
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Environment
VITE_ENVIRONMENT=development

# Backend URLs
VITE_BACKEND_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_MEETING_URL=http://localhost:5000

# Frontend URL
VITE_FRONTEND_URL=http://localhost:8083

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
```

### Production Configuration

For production deployment, update the URLs to point to your production backend:

```env
VITE_ENVIRONMENT=production
VITE_BACKEND_URL=https://your-backend-domain.com
VITE_SOCKET_URL=https://your-backend-domain.com
VITE_MEETING_URL=https://your-backend-domain.com
VITE_FRONTEND_URL=https://your-frontend-domain.com
```

## 🐛 Troubleshooting

### Common Issues

#### 1. SPA Routing Issues

**Problem**: Page refreshes return 404 errors

**Solution**: 
- Ensure you're using HashRouter (already configured)
- Verify `_redirects` file is copied to build output
- Check hosting platform supports SPA routing

#### 2. Authentication Issues

**Problem**: Users get logged out unexpectedly

**Solution**:
- Check token expiration settings
- Verify backend token refresh endpoint is working
- Check CORS configuration

#### 3. Socket Connection Issues

**Problem**: Real-time features not working

**Solution**:
- Verify WebSocket URL configuration
- Check firewall/proxy settings
- Ensure backend Socket.io is running

#### 4. Build Failures

**Problem**: Build process fails

**Solution**:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

#### 5. Performance Issues

**Problem**: Slow loading or poor performance

**Solution**:
- Check bundle size with `npm run build`
- Verify lazy loading is working
- Check network requests in browser dev tools

### Debug Mode

Enable debug mode for detailed logging:

```env
VITE_ENABLE_DEBUG_MODE=true
```

### Error Reporting

The application includes comprehensive error boundaries that:
- Catch and display user-friendly error messages
- Generate error reports for debugging
- Provide recovery options

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── auth/           # Authentication components
│   ├── posts/          # Post-related components
│   └── ...
├── pages/              # Page components
├── services/           # API and external services
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

The project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

### Component Guidelines

1. **Use TypeScript** for all components
2. **Implement error boundaries** for complex components
3. **Use lazy loading** for large components
4. **Follow the component structure** in existing components

## 🔒 Security

### Authentication

- JWT-based authentication
- Automatic token refresh
- Session timeout handling
- Secure token storage

### CORS

- Configured for specific origins
- Supports development and production environments
- Handles WebSocket connections

## 📊 Performance

### Optimizations

- Code splitting with lazy loading
- Bundle optimization
- Image optimization
- Caching strategies
- Service worker (disabled by default)

### Monitoring

- Core Web Vitals tracking
- API response time monitoring
- Error tracking and reporting

## 🚀 Deployment

### Supported Platforms

- **Netlify**: Use `netlify.toml` configuration
- **Vercel**: Use `vercel.json` configuration
- **Render**: Use `render.yaml` configuration
- **GitHub Pages**: Requires HashRouter (already configured)

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Backend URL updated
- [ ] Build script executed successfully
- [ ] Critical files copied to build output
- [ ] SPA routing configured
- [ ] CORS settings updated
- [ ] Error monitoring enabled

### Build Verification

After building, verify:
1. `dist/index.html` exists
2. `dist/_redirects` exists (for SPA routing)
3. All assets are properly bundled
4. No console errors in browser

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the troubleshooting section
2. Review the error logs
3. Create an issue with detailed information
4. Include error IDs from error boundaries

---

**Built with ❤️ for the KEC Alumni Network**
