# 🚀 TestFlight Deployment Guide for Baron

## Prerequisites

### 1. Apple Developer Account
- **Cost**: $99/year
- **Sign up**: https://developer.apple.com/programs/
- **Required for**: App Store and TestFlight

### 2. Expo Account
- **Free**: https://expo.dev/signup
- **Required for**: EAS Build service

## Step-by-Step TestFlight Deployment

### Step 1: Login to Expo
```bash
cd "/Users/remiperrichon1/Desktop/BARON CODE/Baron"
eas login
```

### Step 2: Configure EAS Build
```bash
eas build:configure
```

### Step 3: Update Bundle Identifier
Edit `app.json` and change the bundle identifier to something unique:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourname.gravitymario"
    }
  }
}
```

### Step 4: Build for TestFlight
```bash
# Build for internal testing (TestFlight)
eas build --platform ios --profile preview
```

### Step 5: Submit to TestFlight
```bash
# Submit the build to TestFlight
eas submit --platform ios
```

## Alternative: Direct App Store Connect Upload

If you prefer to upload manually:

### 1. Download the .ipa file
After `eas build` completes, download the .ipa file from the provided URL.

### 2. Upload via App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to "TestFlight" tab
4. Click "+" to add a new build
5. Upload the .ipa file

## TestFlight Setup

### 1. Add Test Users
- Go to App Store Connect → TestFlight
- Add internal testers (up to 100)
- Add external testers (up to 10,000)

### 2. Test Information
- **App Name**: Baron
- **Version**: 1.0.0
- **What to Test**: 
  - Touch controls for gravity flipping
  - Score progression
  - Level difficulty scaling
  - Game over and restart functionality

### 3. Beta App Review
- Apple reviews TestFlight apps (usually 24-48 hours)
- Provide clear testing instructions
- Include screenshots and description

## Build Profiles Explained

### Development Build
```bash
eas build --platform ios --profile development
```
- For development testing
- Includes debugging tools
- Larger file size

### Preview Build (Recommended for TestFlight)
```bash
eas build --platform ios --profile preview
```
- Optimized for testing
- No debugging overhead
- Perfect for TestFlight

### Production Build
```bash
eas build --platform ios --profile production
```
- Final App Store version
- Maximum optimization
- Smallest file size

## Troubleshooting

### Common Issues

1. **Bundle ID conflicts**
   - Use a unique bundle identifier
   - Format: `com.yourname.appname`

2. **Code signing errors**
   - EAS handles this automatically
   - Make sure you're logged into Expo

3. **Build failures**
   - Check `eas.json` configuration
   - Ensure all dependencies are installed

4. **TestFlight upload issues**
   - Verify bundle ID matches App Store Connect
   - Check version number increments

### Build Status Check
```bash
# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]
```

## Cost Breakdown

- **Apple Developer Account**: $99/year
- **EAS Build**: Free for public projects
- **TestFlight**: Free (included with Developer Account)
- **App Store**: Free (included with Developer Account)

## Timeline

- **Build time**: 10-20 minutes
- **TestFlight review**: 24-48 hours
- **Total time to TestFlight**: 1-2 days

## Next Steps After TestFlight

1. **Gather feedback** from testers
2. **Fix any issues** found during testing
3. **Submit to App Store** when ready
4. **Marketing preparation** for launch

## Quick Commands Summary

```bash
# Setup
eas login
eas build:configure

# Build for TestFlight
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios

# Check status
eas build:list
```

## Support

- **Expo Docs**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **TestFlight**: https://developer.apple.com/testflight/
- **Apple Developer**: https://developer.apple.com/support/
