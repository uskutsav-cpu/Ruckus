# Ruckus phone preview

Browser screenshots in `artifacts/phone-preview/` are a fast layout check. They use the live Expo web runtime at phone-sized viewports, but they are not identical to native iOS or Android rendering. Complete the native checks below before release.

## Fast UI review with Expo Go

1. From the project root, run:

   ```sh
   npx expo start --tunnel --clear
   ```

2. Install Expo Go on the iPhone or Android phone you want to review.
3. Scan the terminal QR code. On iPhone, use the Camera app; on Android, scan from Expo Go.
4. Open the project and choose **Try the demo**.
5. Review welcome, authentication, onboarding, discovery, activity details, waitlists, groups, chat, check-in, profile, leaderboard, safety, settings, and account deletion in both light and dark system appearance.

Expo Go is the fastest real-phone check, but it may not include every native capability or production configuration used by a custom development build.

## Accurate native review with a development build

### Sign in to EAS

```sh
npx eas-cli login
```

Confirm the intended Expo account and project before creating a build.

### Create an iOS development build

1. Register the iPhone when prompted:

   ```sh
   npx eas-cli device:create
   ```

2. Build the development client:

   ```sh
   npx eas-cli build --profile development --platform ios
   ```

3. Open the build link on the registered iPhone and install the signed development build. Apple may require Developer Mode and device trust confirmation.

### Create an Android development build

```sh
npx eas-cli build --profile development --platform android
```

Open the build link on the Android phone, allow installation from the selected browser when prompted, and install the APK.

### Start and open the development client

1. Start Metro for a development build:

   ```sh
   npx expo start --dev-client --tunnel --clear
   ```

2. Open the installed Ruckus development client on the phone.
3. Scan the new QR code, or select the project from the development-client launcher.
4. Enter demo mode and repeat the full screen review in light and dark appearance.

For release-quality QA, check camera permission and QR scanning, keyboard avoidance in chat and forms, safe areas, system text scaling, long names, offline states, haptics, notifications, and app resume behavior on both physical platforms.

## Regenerate the browser contact sheet

Keep the credential-free Expo web server running at `http://localhost:8081`, then run:

```sh
npm run preview:phones
```

Use `RUCKUS_PREVIEW_URL` to target a different local URL. The command refreshes the iPhone and Android captures and `artifacts/phone-preview/index.html`.
