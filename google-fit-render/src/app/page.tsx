import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "@/components/LoginPage";

export default async function Home() {
  const session = await auth();

  // Only redirect to dashboard if the session has a valid access token.
  // If the session exists but accessToken is missing/expired, show the login
  // page so the user can re-authenticate and get a fresh token.
  if (session?.accessToken) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
