import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStepsData } from "@/lib/google-fit";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  try {
    const data = await getStepsData(session.accessToken, days);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching steps data:", error);
    return NextResponse.json(
      { error: "Failed to fetch steps data" },
      { status: 500 }
    );
  }
}
