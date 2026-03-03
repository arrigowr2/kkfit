import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get the directory of this file and resolve to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../../");

export async function GET() {
  try {
    // Try multiple possible paths for the file
    const possiblePaths = [
      path.join(projectRoot, "public", "kkfit-deployment.zip"),
      path.join(process.cwd(), "public", "kkfit-deployment.zip"),
      path.join(process.cwd(), "..", "public", "kkfit-deployment.zip"),
    ];
    
    let filePath = "";
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }
    
    if (!filePath) {
      console.error("File not found in any of these paths:", possiblePaths);
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
