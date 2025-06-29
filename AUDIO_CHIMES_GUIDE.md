# Audio Chimes Guide 🎵

This guide helps you set up and use the audio alerts feature in the CNN Trainer application.

## Quick Setup

1. **Enable Audio Alerts**: Toggle the "Enable Audio Alerts" switch in the Audio Alerts section
2. **Set Volume**: Adjust the volume slider to your preference (recommended: 30-70%)
3. **Add Sound URLs**: Enter URLs for Class 0 and Class 1 chimes
4. **Test**: Use the "Test" buttons to preview your sounds

## Free Sound URL Examples

### 🔔 Notification Sounds
```
# Bell sounds
https://www.soundjay.com/misc/sounds/bell-ringing-05.wav
https://freesound.org/data/previews/316/316847_5123451-lq.mp3

# Chime sounds
https://www.soundjay.com/misc/sounds/chime-sound.wav
https://freesound.org/data/previews/427/427567_6164013-lq.mp3
```

### 🎯 Success/Alert Tones
```
# Success sounds
https://www.soundjay.com/misc/sounds/success-sound.wav
https://freesound.org/data/previews/397/397353_6164013-lq.mp3

# Alert sounds  
https://www.soundjay.com/misc/sounds/alert-sound.wav
https://freesound.org/data/previews/341/341695_2558878-lq.mp3
```

### 🎼 Musical Notes
```
# Piano notes
https://freesound.org/data/previews/448/448274_7037317-lq.mp3
https://freesound.org/data/previews/542/542563_11861866-lq.mp3

# Synthesizer tones
https://freesound.org/data/previews/414/414209_5414388-lq.mp3
https://freesound.org/data/previews/269/269718_4448811-lq.mp3
```

## Supported Audio Formats

- **MP3** - Best compatibility across browsers
- **WAV** - High quality, larger file size
- **OGG** - Good compression, modern browser support
- **M4A** - Good for shorter sounds

## Audio Requirements

### URL Requirements
- Must be publicly accessible (HTTPS preferred)
- CORS-enabled (allows cross-origin requests)
- File size: Recommended < 1MB for quick loading
- Duration: 0.5-3 seconds for best UX

### Browser Compatibility
- Chrome/Edge: All formats supported
- Firefox: MP3, WAV, OGG recommended
- Safari: MP3, WAV, M4A recommended

## Finding Your Own Sounds

### Free Sound Libraries
1. **Freesound.org** - Large community library (registration required)
   - Search for "chime", "bell", "notification"
   - Download and host on your own server

2. **Zapsplat.com** - Professional sound effects (free tier available)
   - High-quality notification sounds
   - Multiple format options

3. **AudioMicro** - Royalty-free sounds
   - Professional quality
   - Commercial use allowed

### Creating Custom URLs
If you have sound files, you can host them using:
- **GitHub Pages** - Upload to repository, use raw file URL
- **Google Drive** - Share file publicly, use direct link
- **Dropbox** - Share with direct link
- **Your own website** - Upload and reference directly

## Configuration Examples

### Example 1: Bell and Chime
```
Class 0 (e.g., "Circle"): https://www.soundjay.com/misc/sounds/bell-ringing-05.wav
Class 1 (e.g., "Square"): https://www.soundjay.com/misc/sounds/chime-sound.wav
Volume: 50%
```

### Example 2: High/Low Tones
```
Class 0: https://freesound.org/data/previews/448/448274_7037317-lq.mp3 (High C)
Class 1: https://freesound.org/data/previews/542/542563_11861866-lq.mp3 (Low C)
Volume: 40%
```

### Example 3: Distinct Alerts
```
Class 0: https://freesound.org/data/previews/397/397353_6164013-lq.mp3 (Success)
Class 1: https://freesound.org/data/previews/341/341695_2558878-lq.mp3 (Alert)
Volume: 60%
```

## How It Works

### Trigger Conditions
- **Confidence Threshold**: Only plays when prediction confidence ≥ 70%
- **Class Change**: Only triggers when prediction changes from previous
- **Audio Enabled**: Master switch must be ON
- **Valid URLs**: Both class sounds must be properly configured

### Behavior
- Sounds play immediately when a high-confidence prediction is made
- Won't repeat the same class sound until prediction changes
- Volume is user-controllable from 0-100%
- Works in both drawing and live camera modes

## Troubleshooting

### Sound Not Playing?
1. **Check URL**: Use "Test" button to verify sound loads
2. **Check Volume**: Ensure system and app volume are up
3. **Check Browser**: Some browsers block autoplay - interact with page first
4. **Check CORS**: Ensure sound URL allows cross-origin requests
5. **Check Format**: Try MP3 format for best compatibility

### Common Issues
- **403 Forbidden**: Sound URL doesn't allow external access
- **CORS Error**: Host doesn't allow cross-origin requests
- **Slow Loading**: File too large, use shorter/compressed sounds
- **No Audio**: Browser autoplay policies - click in app first

### Testing Tips
1. Always use "Test" buttons before live use
2. Test with live camera mode for realistic experience
3. Adjust volume to comfortable level
4. Consider using distinct sounds that are easily distinguishable

## Advanced Tips

### Performance Optimization
- Use shorter sound files (0.5-2 seconds)
- Prefer compressed formats (MP3, OGG)
- Host sounds on fast CDNs for quick loading
- Test on mobile devices for different audio handling

### User Experience
- Choose sounds that won't be annoying with repetition
- Consider using musical intervals for pleasant distinction
- Test volume levels in your typical environment
- Have distinct but complementary sounds for each class

### Accessibility
- Ensure sounds are distinguishable for hearing-impaired users
- Consider visual indicators alongside audio
- Provide clear volume controls
- Allow easy disable/enable toggle

## Privacy & Legal

### Sound Usage Rights
- Only use sounds you have rights to use
- Check licensing for commercial use if applicable
- Freesound.org sounds often require attribution
- Create your own sounds for full control

### Browser Permissions
- Modern browsers may require user interaction before playing audio
- Audio alerts respect browser autoplay policies
- No microphone access required - only playback

---

## Quick Reference Card

| Setting | Recommended Value | Purpose |
|---------|------------------|---------|
| Volume | 30-70% | Audible but not jarring |
| Confidence | ≥70% (fixed) | High-confidence predictions only |
| File Size | <1MB | Fast loading |
| Duration | 0.5-3 seconds | Quick, clear notification |
| Format | MP3 | Best browser compatibility |

**Need Help?** Check the browser console for detailed error messages if sounds aren't working as expected.