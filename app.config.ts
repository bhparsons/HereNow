import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT !== "production";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "HereNow (Dev)" : "HereNow",
  slug: "herenow",
  version: "1.0.0",
  orientation: "portrait",
  icon: IS_DEV ? "./assets/icon-light-dev.png" : "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  scheme: "herenow",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/4a90c503-a2bd-428c-aca4-25d0976e2edb",
  },
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0B0E13",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV
      ? "com.bhparsons.herenow.dev"
      : "com.bhparsons.herenow",
    appleTeamId: "CJV4T7G5Z9",
    usesAppleSignIn: true,
    googleServicesFile: "./GoogleService-Info.plist",
    entitlements: {
      "aps-environment": "production",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: IS_DEV
        ? "./assets/android-icon-foreground-dev.png"
        : "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    package: IS_DEV
      ? "com.bhparsons.herenow.dev"
      : "com.bhparsons.herenow",
    permissions: ["android.permission.CAMERA"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    [
      "expo-notifications",
      {
        icon: IS_DEV
          ? "./assets/icon-light-dev.png"
          : "./assets/icon-light.png",
      },
    ],
    "expo-image-picker",
    "expo-updates",
    "expo-build-properties",
    [
      "expo-camera",
      {
        cameraPermission:
          "HereNow needs camera access to scan QR codes for adding friends.",
      },
    ],
  ],
  extra: {
    router: {},
    eas: {
      projectId: "4a90c503-a2bd-428c-aca4-25d0976e2edb",
    },
  },
  owner: "herenow-org",
});
