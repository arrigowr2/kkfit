import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download — KKFit Deployment",
  description: "Download the KKFit deployment package",
};

export default function DownloadPage() {
  const fileName = "kkfit-deployment.zip";
  const fileSize = "158 KB";
  // Try API route first (more reliable), fall back to static file
  const downloadUrl = "/api/download";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to Home</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Download KKFit
          </h1>
          <p className="text-slate-400">
            Get the deployment package for your project
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* File Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          {/* File Info */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white mb-2">{fileName}</h2>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                {fileSize}
              </span>
              <span className="w-1 h-1 bg-slate-600 rounded-full" />
              <span>ZIP Archive</span>
            </div>
          </div>

          {/* Download Button */}
          <a
            href={downloadUrl}
            download={fileName}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Now</span>
          </a>

          {/* Direct Link */}
          <p className="mt-4 text-center">
            <a
              href={downloadUrl}
              download={fileName}
              className="text-blue-400 hover:text-blue-300 underline text-sm"
            >
              Click here if the download does not start
            </a>
          </p>

          {/* Additional Info */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Click the button above to download the deployment package. 
            Extract the ZIP file and follow the instructions in the README.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-500 text-sm">
          Having issues?{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            Return to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
