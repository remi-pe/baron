# Baron iOS App

A React Native/Expo version of the Baron game, converted from Next.js to iOS.

## Features

- **Touch Controls**: Tap to flip gravity and start the game
- **Progressive Difficulty**: Game speed increases with each level
- **Score Tracking**: Local storage of high scores
- **Level System**: Every 20 platforms = new level with increased speed
- **Lives System**: 3 lives with heart collectibles
- **Responsive Design**: Optimized for iOS devices

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for testing) or physical iOS device
- Apple Developer Account (for App Store deployment)

## Installation

1. Navigate to the project directory:
   ```bash
   cd GravityMarioIOS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Running on iOS Simulator

1. Start the development server:
   ```bash
   npm run ios
   ```

2. This will:
   - Start the Expo development server
   - Open iOS Simulator
   - Install and launch the app

### Running on Physical Device

1. Install Expo Go app on your iOS device from the App Store

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with your device's camera or Expo Go app

## Building for Production

### Development Build (for testing)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure the project:
   ```bash
   eas build:configure
   ```

4. Build for iOS:
   ```bash
   eas build --platform ios
   ```

### App Store Build

1. Update `app.json` with your Apple Developer Team ID:
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourcompany.gravitymario",
         "buildNumber": "1.0.0"
       }
     }
   }
   ```

2. Build for App Store:
   ```bash
   eas build --platform ios --profile production
   ```

3. Submit to App Store:
   ```bash
   eas submit --platform ios
   ```

## Game Controls

- **Tap anywhere**: Flip gravity direction
- **Game Over**: Tap to restart
- **Auto-scroll**: Game automatically moves forward

## Game Mechanics

- **Gravity Flipping**: Tap to reverse gravity (up ↔ down)
- **Platform Jumping**: Land on platforms to continue
- **Fire Hazards**: Some platforms have fire - avoid them!
- **Scoring**: Pass platforms and collect coins for points
- **Lives**: Start with 3 lives, lose one when hitting fire
- **Levels**: Every 20 platforms = new level with increased speed

## Customization

### Changing Game Difficulty

Edit `SimpleGravityGame.tsx`:
- `gravityBase`: Controls gravity strength (default: 0.42)
- `gameSpeed`: Base movement speed (default: 1.0)
- `getFireProbability()`: Adjust fire spawn rate

### Adding Sound Effects

1. Add audio files to `assets/sounds/`
2. Update the audio functions in `SimpleGravityGame.tsx`
3. Use `expo-av` for audio playback

### Styling Changes

Modify the `styles` object in `SimpleGravityGame.tsx` to customize:
- Colors
- Fonts
- Layout
- Button styles

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **iOS Simulator not opening**: Check Xcode installation
3. **Build failures**: Ensure all dependencies are installed
4. **Performance issues**: Reduce game complexity or optimize rendering

### Debug Mode

Enable debug mode by adding to your device:
- Shake device → "Debug Remote JS"
- Or use `npx expo start --dev-client`

## Deployment Options

### Option 1: Expo Go (Easiest)
- Publish to Expo: `eas update`
- Share link with users
- Limited to Expo Go app

### Option 2: Development Build
- Create custom development build
- Test on devices without Expo Go
- Good for beta testing

### Option 3: App Store
- Full native iOS app
- Available in App Store
- Requires Apple Developer Account ($99/year)

## Performance Optimization

1. **Reduce re-renders**: Use `useCallback` and `useMemo`
2. **Optimize game loop**: Limit update frequency
3. **Memory management**: Clean up unused objects
4. **Asset optimization**: Compress images and sounds

## Next Steps

1. **Add Canvas Rendering**: Implement proper 2D canvas for better graphics
2. **Sound Effects**: Add audio feedback for actions
3. **Animations**: Smooth character and platform animations
4. **Multiplayer**: Add online leaderboards
5. **Achievements**: Unlock system for milestones

## Support

For issues or questions:
- Check Expo documentation: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/
- iOS development: https://developer.apple.com/
