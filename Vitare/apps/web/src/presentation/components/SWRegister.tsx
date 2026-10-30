import { useRegisterSW } from 'virtual:pwa-register/react';

// Service worker registration component - separate file for React Refresh compatibility
export function SWRegister() {
  useRegisterSW({
    onNeedRefresh() {
      // This will be handled by the InstallPrompt component
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
  
  return null;
}
