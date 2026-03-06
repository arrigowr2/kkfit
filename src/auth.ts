import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Allow empty strings to be treated as undefined for graceful fallback
const googleClientId = process.env.GOOGLE_CLIENT_ID || undefined;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || undefined;
const authSecret = process.env.AUTH_SECRET || undefined;
const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;

// Handle the URL - remove any existing protocol prefix to avoid duplication
const normalizeUrl = (url: string | undefined) => {
  if (!url) return undefined;
  // Remove http:// or https:// prefix if present
  return url.replace(/^https?:\/\//, '');
};

const normalizedNextAuthUrl = normalizeUrl(nextAuthUrl);
const baseUrl = normalizedNextAuthUrl ? `https://${normalizedNextAuthUrl}` : undefined;

// Validate required environment variables in production
if (!googleClientId || !googleClientSecret || !authSecret) {
  const missing = [];
  if (!googleClientId) missing.push("GOOGLE_CLIENT_ID");
  if (!googleClientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!authSecret) missing.push("AUTH_SECRET");
  
  console.error(`[Auth] Missing environment variables: ${missing.join(", ")}`);
  
  if (process.env.NODE_ENV === "production") {
    console.error("[Auth] Please configure these variables in Vercel Dashboard > Settings > Environment Variables");
  }
}

// Use dummy values if env vars are missing - this allows the app to start
// but authentication won't work without proper credentials
const configSecret = authSecret || "dummy-secret-for-development-only";
const configClientId = googleClientId || "dummy-client-id";
const configClientSecret = googleClientSecret || "dummy-client-secret";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: configSecret,
  trustHost: true,
  providers: [
    Google({
      clientId: configClientId,
      clientSecret: configClientSecret,
      authorization: {
        params: {
          redirect_uri: `${baseUrl}/api/auth/callback/google`,
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/fitness.activity.read",
            "https://www.googleapis.com/auth/fitness.body.read",
            "https://www.googleapis.com/auth/fitness.heart_rate.read",
            "https://www.googleapis.com/auth/fitness.sleep.read",
            "https://www.googleapis.com/auth/fitness.nutrition.read",
            "https://www.googleapis.com/auth/fitness.location.read",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to /dashboard after login
      if (url.startsWith("/")) {
        return `${baseUrl}/dashboard`;
      }
      return baseUrl;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.expiresAtMs = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
      }

      // If token is still valid, return it as-is
      if (token.expiresAtMs && Date.now() < (token.expiresAtMs as number)) {
        return token;
      }

      // Token expired — try to refresh using the refresh token
      if (!token.refreshToken) {
        return { ...token, accessToken: undefined };
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });

        const refreshed = await response.json();

        if (!response.ok) {
          return { ...token, accessToken: undefined };
        }

        return {
          ...token,
          accessToken: refreshed.access_token,
          expiresAtMs: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
        };
      } catch {
        return { ...token, accessToken: undefined };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      return session;
    },
  },
});
