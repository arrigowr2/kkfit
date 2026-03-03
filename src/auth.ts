import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const googleClientId = process.env.GOOGLE_CLIENT_ID!;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET!;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          redirect_uri: process.env.NEXTAUTH_URL 
            ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
            : "https://pale-ray-3311.d.kiloapps.io/api/auth/callback/google",
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
      return session;
    },
  },
});
