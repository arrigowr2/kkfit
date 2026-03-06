import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getStoredCredentials, getAccessTokenFromRefreshToken, generateWeeklyReport, generateCSV, storeCredentials } from "@/lib/weekly-export";

// Configure email transporter
function createTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER or EMAIL_PASS not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

// POST /api/fitness/export - Store credentials or trigger export
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, refreshToken, email } = body;

    if (action === "store") {
      // Store credentials for automated exports
      if (!refreshToken || !email) {
        return NextResponse.json(
          { error: "refreshToken and email are required" },
          { status: 400 }
        );
      }

      storeCredentials(refreshToken, email);
      console.log("[Export] Credentials stored for:", email);

      return NextResponse.json({ 
        success: true, 
        message: "Credentials stored successfully. Weekly exports will be sent to " + email 
      });
    }

    if (action === "send") {
      // Manual trigger to send report
      const credentials = getStoredCredentials();

      if (!credentials) {
        return NextResponse.json(
          { error: "No credentials stored. Please authenticate first." },
          { status: 400 }
        );
      }

      const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
      const report = await generateWeeklyReport(accessToken);

      if (report.data.length === 0) {
        return NextResponse.json(
          { error: "No data available for the past week" },
          { status: 400 }
        );
      }

      const csvContent = generateCSV(report.data);
      const jsonContent = JSON.stringify(report.data, null, 2);

      // Create email transporter
      const transporter = createTransporter();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: credentials.email,
        subject: `📊 Relatório Semanal FitDashboard - ${report.startDate} a ${report.endDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">📊 Relatório Semanal de Fitness</h1>
            <p style="color: #666;">Período: <strong>${report.startDate}</strong> a <strong>${report.endDate}</strong></p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1f2937;">Resumo da Semana</h2>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;">🚶 <strong>Passos:</strong> ${report.summary.totalSteps.toLocaleString()}</li>
                <li style="padding: 8px 0;">🔥 <strong>Calorias:</strong> ${report.summary.totalCalories.toLocaleString()}</li>
                <li style="padding: 8px 0;">❤️ <strong>FC Média:</strong> ${report.summary.avgHeartRate} bpm</li>
                <li style="padding: 8px 0;">⚖️ <strong>Peso Média:</strong> ${report.summary.avgWeight} kg</li>
                <li style="padding: 8px 0;">😴 <strong>Sono Total:</strong> ${Math.round(report.summary.totalSleepHours)}h</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Os dados completos estão nos anexos (CSV e JSON).
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              Enviado automaticamente pelo FitDashboard
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `fitness_report_${report.startDate}_${report.endDate}.csv`,
            content: "\ufeff" + csvContent,
          },
          {
            filename: `fitness_report_${report.startDate}_${report.endDate}.json`,
            content: jsonContent,
          },
        ],
      };

      await transporter.sendMail(mailOptions);

      console.log("[Export] Weekly report sent successfully to:", credentials.email);

      return NextResponse.json({
        success: true,
        message: `Report sent to ${credentials.email}`,
        summary: report.summary,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'store' or 'send'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("[Export] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET /api/fitness/export - Cron job endpoint (triggered by Vercel Cron)
export async function GET(request: Request) {
  // Verify cron secret for security
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    console.log("[Export] Unauthorized cron attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Export] Cron job triggered - starting weekly export");

    const credentials = getStoredCredentials();

    if (!credentials) {
      console.log("[Export] No credentials stored, skipping weekly export");
      return NextResponse.json({
        message: "No credentials stored. Please authenticate to enable weekly exports.",
        exported: false,
      });
    }

    const accessToken = await getAccessTokenFromRefreshToken(credentials.refreshToken);
    const report = await generateWeeklyReport(accessToken);

    if (report.data.length === 0) {
      console.log("[Export] No data available for the past week");
      return NextResponse.json({
        message: "No data available for the past week",
        exported: false,
      });
    }

    const csvContent = generateCSV(report.data);
    const jsonContent = JSON.stringify(report.data, null, 2);

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: credentials.email,
      subject: `📊 Relatório Semanal FitDashboard - ${report.startDate} a ${report.endDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">📊 Relatório Semanal de Fitness</h1>
          <p style="color: #666;">Período: <strong>${report.startDate}</strong> a <strong>${report.endDate}</strong></p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">Resumo da Semana</h2>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 8px 0;">🚶 <strong>Passos:</strong> ${report.summary.totalSteps.toLocaleString()}</li>
              <li style="padding: 8px 0;">🔥 <strong>Calorias:</strong> ${report.summary.totalCalories.toLocaleString()}</li>
              <li style="padding: 8px 0;">❤️ <strong>FC Média:</strong> ${report.summary.avgHeartRate} bpm</li>
              <li style="padding: 8px 0;">⚖️ <strong>Peso Média:</strong> ${report.summary.avgWeight} kg</li>
              <li style="padding: 8px 0;">😴 <strong>Sono Total:</strong> ${Math.round(report.summary.totalSleepHours)}h</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Os dados completos estão nos anexos (CSV e JSON).
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            Enviado automaticamente pelo FitDashboard
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `fitness_report_${report.startDate}_${report.endDate}.csv`,
          content: "\ufeff" + csvContent,
        },
        {
          filename: `fitness_report_${report.startDate}_${report.endDate}.json`,
          content: jsonContent,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    console.log("[Export] Weekly report sent successfully to:", credentials.email);

    return NextResponse.json({
      success: true,
      message: `Weekly report sent to ${credentials.email}`,
      summary: report.summary,
      exported: true,
    });

  } catch (error) {
    console.error("[Export] Cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", exported: false },
      { status: 500 }
    );
  }
}
