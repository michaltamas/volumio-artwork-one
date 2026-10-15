/**
 * Volumio's Android app shows the interface in a WebView between its own top bar ("Playing on …") and the
 * phone's navigation bar, yet on recent Android (edge-to-edge) that WebView reports the status and navigation
 * bars as safe-area insets — the theme then left an empty band above its head and below the mini player.
 * An Android WebView names itself with "; wv)" in its user agent; Chrome, and the theme added to the home
 * screen, do not, and keep the insets. iOS reports them correctly in the app and needs nothing.
 */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
export const ANDROID_APP = /Android/i.test(ua) && /;\s*wv\)/.test(ua);
if (ANDROID_APP) { document.documentElement.classList.add('aw-android-app'); }
