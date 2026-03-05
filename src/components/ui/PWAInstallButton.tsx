'use client';

import { usePWA } from '@/lib/hooks/usePWA';
import { Download, Check, WifiOff } from 'lucide-react';

export function PWAInstallButton() {
  const { canInstall, isInstalled, isOffline, install } = usePWA();

  // Don't show if already installed
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
        <Check className="w-4 h-4" />
        <span>App instalado</span>
      </div>
    );
  }

  // Show offline indicator
  if (isOffline) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">
        <WifiOff className="w-4 h-4" />
        <span>Offline</span>
      </div>
    );
  }

  // Show install button if available
  if (canInstall) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 text-sm text-slate-200 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </button>
    );
  }

  return null;
}