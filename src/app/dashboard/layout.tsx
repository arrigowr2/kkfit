import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  
  try {
    session = await auth();
  } catch (error) {
    console.error("[DashboardLayout] Auth error:", error);
    // If auth fails, redirect to login page
    redirect("/");
  }

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardNav user={session.user} />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
