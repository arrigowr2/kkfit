import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const fileName = "kkfit-deployment.zip";
  
  // Try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), "public", fileName),
    path.join(process.cwd(), "..", "public", fileName),
    path.join(process.cwd(), "..", "..", "public", fileName),
  ];

  let fileBuffer: Buffer | null = null;

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
        console.log("Found file at:", filePath);
        break;
      }
    } catch (e) {
      console.log("Error checking path:", filePath, e);
    }
  }

  if (!fileBuffer) {
    // Try to list what's in public
    try {
      const publicDir = path.join(process.cwd(), "public");
      const files = fs.readdirSync(publicDir);
      console.log("Files in public:", files);
    } catch (e) {
      console.log("Could not read public dir");
    }
    
    return NextResponse.json(
      { error: "File not found", tried: possiblePaths },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
