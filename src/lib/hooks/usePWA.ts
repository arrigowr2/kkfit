'use client';

import { useEffect, useState, useCallback } from 'react';

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOffline: boolean;
  installPrompt: Event | null;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isOffline: false,
    installPrompt: null
  });

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as unknown as { standalone: boolean }).standalone;
      
      setState(prev => ({ ...prev, isInstalled: isStandalone }));

      // Listen for install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setState(prev => ({ ...prev, canInstall: true, installPrompt: e }));
      };

      // Listen for app installed
      const handleAppInstalled = () => {
        setState(prev => ({ ...prev, isInstalled: true, canInstall: false, installPrompt: null }));
      };

      // Listen for online/offline
      const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
      const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Set initial offline state
      setState(prev => ({ ...prev, isOffline: !navigator.onLine }));

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const install = useCallback(async () => {
    if (state.installPrompt) {
      // Type assertion needed for the prompt API which is not yet standard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promptEvent = state.installPrompt as unknown as { prompt: () => void; userChoice: Promise<{ outcome: string }> };
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      
      if (result.outcome === 'accepted') {
        setState(prev => ({ ...prev, canInstall: false, installPrompt: null }));
      }
    }
  }, [state.installPrompt]);

  return {
    ...state,
    install
  };
}

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((error) => {
          console.log('SW registration failed: ', error);
        });
    });
  }
}