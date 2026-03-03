import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "kkfit-deployment.zip");
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Arquivo não encontrado" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Get file stats for size
    const stats = fs.statSync(filePath);
    const fileSizeInKB = Math.round(stats.size / 1024);

    // Return the file with proper headers for download
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="kkfit-deployment.zip"`,
        "Content-Length": stats.size.toString(),
        "X-File-Size-KB": fileSizeInKB.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving download:", error);
    return NextResponse.json(
      { error: "Erro ao processar download" },
      { status: 500 }
    );
  }
}
