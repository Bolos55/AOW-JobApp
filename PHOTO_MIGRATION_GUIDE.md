# Photo Migration Guide

## Current Issue
Photos are stored with local paths (`uploads/photos/...`) instead of Cloudinary URLs, causing 404 errors in production.

## Immediate Solution

### 1. Set Cloudinary Environment Variables in Render.com

Go to your **backend service** in Render.com:
1. Click on your backend service
2. Go to "Environment" tab
3. Add these variables:

```
CLOUDINARY_CLOUD_NAME=dorfwjgzl
CLOUDINARY_API_KEY=935361439869181
CLOUDINARY_API_SECRET=RUStQoFXMZFQqCJtXFhJTeTI8A4
```

### 2. Verify Configuration
After setting the variables and redeploying:
1. Visit: `https://aow-jobapp-backend.onrender.com/api/health`
2. Check the `cloudinary` section:
   ```json
   {
     "cloudinary": {
       "configured": true,
       "cloudName": "✅ Set",
       "apiKey": "✅ Set", 
       "apiSecret": "✅ Set"
     }
   }
   ```

### 3. Test New Photo Uploads
After Cloudinary is configured:
1. Upload a new photo
2. The URL should be: `https://res.cloudinary.com/dorfwjgzl/image/upload/...`
3. Not: `https://aow-jobapp-backend.onrender.com/uploads/...`

## For Existing Photos

### Option 1: Re-upload (Recommended)
Users can simply re-upload their photos and they'll automatically use Cloudinary.

### Option 2: Database Migration (Advanced)
If you have many existing photos, you could create a migration script to:
1. Download existing photos from local storage
2. Upload them to Cloudinary
3. Update the database with new URLs

## Current Status
- ✅ Code supports both Cloudinary and local URLs
- ✅ React errors fixed
- ❌ Cloudinary not configured in production
- ❌ Existing photos have local paths

## Next Steps
1. **URGENT**: Set Cloudinary environment variables in Render.com
2. Redeploy backend service
3. Verify configuration via `/api/health` endpoint
4. Test new photo uploads
5. Inform users they may need to re-upload profile photos