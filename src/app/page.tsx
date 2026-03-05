import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "@/components/LoginPage";

export default async function Home() {
  let session = null;
  
  try {
    session = await auth();
  } catch (error) {
    console.error("[Home] Auth error:", error);
    // If auth fails (e.g., missing env vars), show login page
    return <LoginPage />;
  }

  // Only redirect to dashboard if the session has a valid access token.
  // If the session exists but accessToken is missing/expired, show the login
  // page so the user can re-authenticate and get a fresh token.
  if (session?.accessToken) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
