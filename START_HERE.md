Inventory Tracker — Start Here

What’s Ready
- .env configured with Supabase URL and anon key.
- Router warning fixed; concrete auth routes registered.
- Supabase client hardened (URL + crypto polyfills, RN auth options).
- Auth screen includes a “Run network check” button.

Next Session — Quick Start
Option A: Real device via Expo Go (fastest)
- Terminal: `npx expo start --tunnel`
- On phone: install Expo Go, scan the QR (or tap the tunnel URL).
- In the app: Auth screen → tap “Run network check”. Expect 200/204.
- Sign in via OTP, then test a scan on the Scanner tab.

Option B: Android emulator
- In Android Studio: install SDK Platform, Platform‑Tools, and Emulator.
- Create and start an AVD (e.g., Pixel 6, Android 14).
- Easiest path: install Expo Go in the emulator’s Play Store, then paste the tunnel URL from `expo start --tunnel`.
- Optional (press “a” from WSL): set Windows SDK path in WSL shell:
  - `export ANDROID_HOME=/mnt/c/Users/<YOU>/AppData/Local/Android/Sdk`
  - `export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"`
  - Start the AVD in Android Studio, then `npx expo start` and press `a`.

Validation Checklist
- Auth screen → “Run network check” shows:
  - Auth health: 200 (or 204)
  - REST reachability: 200/401 (any HTTP status proves reachability)
- Send OTP → receive code → Verify → lands on tabs.
- Scan a barcode → toast “Scan saved”.
- Inventory tab shows new row.
- Supabase Table Editor: public.scans row has your user_id.
- Signed out → “Clear scans” prompts/blocks as expected.

Troubleshooting
- “Network request failed”: ensure device/emulator has internet and correct date/time; try opening https://oochzioylnzjoaztnrru.supabase.co in the device browser; check VPN/firewall.
- OTP issues: Supabase Dashboard → Auth → Email → ensure magic link/OTP enabled; check Auth logs.
- If router loops: fully restart bundler and Expo Go (clear cache).

Nice‑to‑Have (later)
- Optionally gate scanning behind auth with a clearer unsigned message.
- Consider pruning unused shipment columns or adding enrichment via a shipment_items table + trigger.

WSL Android SDK Wiring (press "a" from WSL)
- Auto-detect Windows SDK from WSL (copy-paste):
  - `SDK_WIN=$(cmd.exe /c "echo %LOCALAPPDATA%\\Android\\Sdk" | tr -d '\r')`
  - `export ANDROID_HOME="$(wslpath -u "$SDK_WIN")"`
  - `export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"`
- Or set explicitly for your Windows user:
  - If your user folder is `C:\\Users\\Michelle Cruse`:
    - `export ANDROID_HOME="/mnt/c/Users/Michelle Cruse/AppData/Local/Android/Sdk"`
    - `export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"`
- Persist for future shells: add the lines above to `~/.bashrc`, then `source ~/.bashrc`.
- Verify: `adb version` prints a version. Start an AVD in Android Studio, then run `npx expo start` and press `a`.
