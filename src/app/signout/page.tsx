"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * Dedicated sign-out page that immediately triggers signOut.
 * This serves as a reliable escape route if the dashboard error screen
 * buttons are not working correctly.
 */
export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: `${window.location.origin}/` });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p className="text-slate-400">Saindo...</p>
      </div>
    </div>
  );
}
