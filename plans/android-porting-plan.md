# Android Porting Plan - NSW NAPLAN Prep App

## Executive Summary

This document outlines the options, changes required, and cost implications for porting the existing NSW NAPLAN Prep web application to work on Android mobile devices. The **simplest approach** is a Progressive Web App (PWA), which requires minimal changes and preserves the existing web app functionality.

---

## 1. Current Application Analysis

### Technology Stack
- **Framework**: Vanilla ES Modules (no framework)
- **Deployment**: Static site (Vercel)
- **Storage**: localStorage
- **Routing**: Client-side SPA router
- **Build**: Simple copy command (`cp -r src public`)
- **Testing**: Jest + Playwright

### Key Files to Modify
- `src/index.html` - Entry point
- `src/main.js` - App router
- `src/storage.js` - LocalStorage abstraction
- `src/styles/main.css` - Has partial mobile styles
- `src/styles/responsive.css` - Empty (ready for mobile optimization)

---

## 2. Porting Options

### Option 1: Progressive Web App (PWA) - RECOMMENDED ⭐

**Description**: Convert the web app to a PWA that can be installed on Android devices via browser or Google Play Store.

**Pros**:
- ✅ Minimal changes required (~2-4 hours)
- ✅ Single codebase for web + Android
- ✅ Works offline after first visit
- ✅ No app store approval needed for basic version
- ✅ Can be published to Google Play via Trusted Web Activity (TWA)
- ✅ No additional hosting costs
- ✅ Automatic updates

**Cons**:
- ❌ Cannot access some native device features (camera, contacts)
- ❌ Requires Chrome on Android for full PWA support
- ❌ Play Store publication requires $25 one-time developer account fee

**Complexity**: LOW

---

### Option 2: Capacitor (Hybrid Wrapper)

**Description**: Wrap the web app using Capacitor to create a native Android APK that can be published to Play Store.

**Pros**:
- ✅ Native Android app experience
- ✅ Access to native device APIs if needed
- ✅ Can be distributed via Play Store
- ✅ App icon on home screen (not just PWA shortcut)

**Cons**:
- ❌ Requires additional tooling (Node.js, Android SDK)
- ❌ Slightly larger app size
- ❌ More complex build process
- ❌ Separate build pipeline from web version

**Complexity**: MEDIUM

---

### Option 3: Trusted Web Activity (TWA)

**Description**: Package the PWA as a TWA for Google Play Store distribution. This is essentially Option 1 + Play Store publication.

**Pros**:
- ✅ All PWA benefits
- ✅ Official Play Store presence
- ✅ No app review required (automated)
- ✅ Smaller than full native app

**Cons**:
- ❌ $25 Google Play Console one-time fee
- ❌ Must meet Play Store policies
- ❌ Limited to Chrome-based WebView

**Complexity**: LOW-MEDIUM

---

### Option 4: Native Android (Kotlin)

**Description**: Complete rewrite in Kotlin for Android.

**Pros**:
- ✅ Full native performance
- ✅ Access to all Android features
- ✅ Best user experience

**Cons**:
- ❌ 10x+ development time
- ❌ Two separate codebases to maintain
- ❌ Significant ongoing maintenance cost

**Complexity**: VERY HIGH

---

## 3. Recommended Approach: PWA + Optional TWA

The **simplest path** is Option 1 (PWA), with Option 3 (TWA) as an optional enhancement for Play Store distribution.

### Why PWA is Best for This App

1. **No Framework Needed**: Your vanilla JS app is already PWA-ready
2. **Child Safety**: No camera/contacts needed - perfect for PWA
3. **Offline-First**: Students can use without internet
4. **Cost Effective**: No additional hosting or infrastructure needed
5. **Single Source**: One codebase for web + mobile

---

## 4. Required Changes

### For PWA Implementation

#### 4.1 Create Web App Manifest
**File**: `public/manifest.json` (created during build)

```json
{
  "name": "NAPLAN Mission - Year 3 Prep",
  "short_name": "NAPLAN Prep",
  "description": "Safe, child-friendly NAPLAN preparation app for NSW Year 3 students",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Changes**: Create new file - ~30 minutes

#### 4.2 Create Service Worker
**File**: `public/sw.js`

- Cache static assets (HTML, CSS, JS)
- Enable offline functionality
- Handle version updates

**Changes**: Create new file - ~1 hour

#### 4.3 Update index.html
**File**: `src/index.html`

Add manifest link and service worker registration:

```html
<head>
  <!-- Existing meta tags -->
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#667eea">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="NAPLAN Prep">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
</head>
<body>
  <!-- Existing body content -->
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  </script>
</body>
```

**Changes**: Modify 5 lines - ~15 minutes

#### 4.4 Create App Icons
**Files**: 
- `public/icons/icon-192.png` (192x192)
- `public/icons/icon-512.png` (512x512)

**Changes**: Create 2 icon files - ~30 minutes (or use existing assets)

#### 4.5 Enhance Mobile Styles
**File**: `src/styles/responsive.css`

Complete the responsive.css with:
- Touch-friendly button sizes (min 48px)
- Mobile viewport optimizations
- Safe area insets for notched devices
- Improved form inputs for mobile

**Changes**: Add ~100 lines CSS - ~1 hour

#### 4.6 Add Touch Interactions (Optional)
**Files**: Various view files

Add touch-friendly feedback:
- Ripple effects on buttons
- Swipe gestures for navigation (optional)

**Changes**: Modify CSS/JS as needed - ~1-2 hours

#### 4.7 Update Build Script
**File**: `package.json`

Ensure manifest and service worker are included in build:

```json
{
  "scripts": {
    "build": "cp -r src public && cp src/index.html public/index.html && cp public/manifest.json public/manifest.json 2>/dev/null || true"
  }
}
```

**Changes**: Modify build script - ~15 minutes

### For TWA (Play Store) Implementation

#### 4.8 Create TWA Asset Links
**File**: `.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.naplan.prep",
      "sha256_cert_fingerprints": ["YOUR_FINGERPRINT"]
    }
  }
]
```

#### 4.9 Generate Signed APK/AAB
Using Bubblewrap or PWABuilder to create Android App Bundle for Play Store submission.

---

## 5. Token/Cost Implications

### Option 1: PWA Only

| Item | Cost | Notes |
|------|------|-------|
| Development Time | ~4-6 hours | Internal development |
| Hosting | $0 | Use existing Vercel |
| Icons/Assets | $0 | Can use existing or create |
| **Total** | **~$0** | If done internally |

### Option 3: PWA + TWA (Play Store)

| Item | Cost | Notes |
|------|------|-------|
| Development Time | ~6-8 hours | Internal development |
| Google Play Console | $25 | One-time fee |
| Hosting | $0 | Use existing Vercel |
| **Total** | **~$25** | One-time |

### Option 2: Capacitor

| Item | Cost | Notes |
|------|------|-------|
| Development Time | ~15-20 hours | Setup + configuration |
| Google Play Console | $25 | One-time fee |
| Android SDK | $0 | Free download |
| Build infrastructure | $0 | Local or GitHub Actions |
| **Total** | **~$25 + time** | |

### Option 4: Native Android

| Item | Cost | Notes |
|------|------|-------|
| Development Time | ~80-120 hours | Complete rewrite |
| Google Play Console | $25 | One-time fee |
| Developer | $5,000-15,000 | Estimated contract cost |
| **Total** | **~$5,000-15,000+** | Not recommended |

---

## 6. Maintaining Both Web and Android Versions

### The Good News: Single Codebase Strategy

By using PWA, you can maintain **one codebase** that works for both web and Android:

```
┌─────────────────────────────────────────┐
│           Single Source Code            │
│  ┌───────────────────────────────────┐  │
│  │  src/                             │  │
│  │  ├── views/*.js (all views)      │  │
│  │  ├── styles/*.css (all styles)   │  │
│  │  ├── storage.js                  │  │
│  │  ├── curriculum.js               │  │
│  │  └── ... (all app logic)         │  │
│  └───────────────────────────────────┘  │
│                    │                     │
│          ┌────────┴────────┐            │
│          ▼                 ▼            │
│  ┌───────────────┐  ┌───────────────┐  │
│  │   Web Build   │  │    PWA Build   │  │
│  │   (Vercel)    │  │  (Vercel/PWA)  │  │
│  └───────────────┘  └───────────────┘  │
│          │                 │            │
│          ▼                 ▼            │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Web Browser  │  │ Android Device │  │
│  │   (Desktop)   │  │ (PWA or TWA)   │  │
│  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────┘
```

### How Feature Changes Work

#### Scenario: Add New Quiz Feature

1. **Make changes in `src/`** - Single location for all code
2. **Run `npm run build`** - Builds to `public/`
3. **Deploy to Vercel** - One deployment serves both web and PWA
4. **Changes reflect immediately** on:
   - Desktop web app
   - Mobile web app
   - Installed PWA
   - TWA (if configured)

#### No Duplication Needed

```javascript
// All these use the SAME source code:
// - https://naplan-prep.vercel.app (web)
// - https://naplan-prep.vercel.app (mobile browser)
// - Installed PWA on Android
// - TWA in Play Store (if published)
```

### Best Practices for Shared Code

1. **Avoid Platform-Specific Code**: Use standard web APIs
2. **Responsive CSS First**: Mobile-first styling in `responsive.css`
3. **Feature Detection**: Use `if ('serviceWorker' in navigator)` for PWA features
4. **Unified Build**: Single build process for all platforms

---

## 7. Implementation Roadmap

### Phase 1: Core PWA (Week 1)
- [ ] Create `public/manifest.json`
- [ ] Create `public/sw.js` (Service Worker)
- [ ] Update `src/index.html` with PWA meta tags
- [ ] Create app icons (192px, 512px)
- [ ] Test PWA installation on Android

### Phase 2: Mobile Optimization (Week 1-2)
- [ ] Complete `src/styles/responsive.css`
- [ ] Add touch-friendly interactions
- [ ] Test on various Android screen sizes
- [ ] Verify offline functionality

### Phase 3: Play Store (Optional, Week 2-3)
- [ ] Set up Google Play Console account ($25)
- [ ] Generate signing keys
- [ ] Create assetlinks.json
- [ ] Use Bubblewrap/PWABuilder to create AAB
- [ ] Submit to Play Store

---

## 8. Testing Checklist

### PWA Testing
- [ ] Install on Android Chrome
- [ ] Works offline (airplane mode)
- [ ] App icon appears on home screen
- [ ] Splash screen displays correctly
- [ ] All features work identical to web

### Mobile UI Testing
- [ ] All buttons touchable (min 48px)
- [ ] No horizontal scrolling
- [ ] Text readable without zoom
- [ ] Forms work with mobile keyboard

---

## 9. Summary

| Aspect | Details |
|--------|---------|
| **Recommended Option** | PWA (Option 1) |
| **Complexity** | Low |
| **Time to Complete** | 4-6 hours |
| **Ongoing Cost** | $0 |
| **One-time Cost** | $0 (or $25 for Play Store) |
| **Code Changes** | Single codebase |
| **Web App Impact** | None (non-breaking) |

### Next Steps

1. **Approve this plan** - Confirm PWA approach
2. **Begin Phase 1** - Create manifest and service worker
3. **Test on Android** - Verify PWA works on target devices
4. **Optional**: Proceed to Phase 3 for Play Store publication

---

*Document Version: 1.0*  
*Created: 2026-02-22*  
*For: NSW NAPLAN Prep App*
