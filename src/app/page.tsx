import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "@/components/LoginPage";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginPage />;
}
