import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "10mb" }));

  // API Route: Check SMTP configuration status
  app.get("/api/email-status", (req, res) => {
    const isConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );
    res.json({
      configured: isConfigured,
      smtpHost: process.env.SMTP_HOST || null,
      smtpUser: process.env.SMTP_USER || null,
      fromAddress: process.env.SMTP_FROM || process.env.SMTP_USER || null
    });
  });

  // API Route: Send Email via Background Server SMTP
  app.post("/api/send-email", async (req, res) => {
    try {
      const { recipientEmail, ccEmail, subject, message } = req.body;

      if (!recipientEmail || !subject) {
        return res.status(400).json({ 
          error: "Recipient email and subject are required" 
        });
      }

      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpPort = Number(process.env.SMTP_PORT) || 587;
      const smtpFrom = process.env.SMTP_FROM || (smtpUser ? `Ajinomoto Succession Suite <${smtpUser}>` : "Ajinomoto Succession <noreply@ajinomoto.com>");

      // If SMTP server credentials exist in environment variables
      if (smtpHost && smtpUser && smtpPass) {
        console.log(`[SMTP Direct] Sending email to ${recipientEmail} via ${smtpHost}:${smtpPort}...`);

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465, // true for 465, false for 587
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="background-color: #0f172a; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
              <h2 style="color: #2dd4bf; margin: 0; font-size: 18px; font-weight: 800; tracking-wide: 1px;">AJINOMOTO INDONESIA</h2>
              <span style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase;">Succession Suite</span>
            </div>
            
            <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">
              ${message.replace(/\n/g, '<br/>')}
            </div>

            <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 24px 0 16px 0;" />
            <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0; font-weight: bold;">Laporan ini dikirim otomatis oleh Sistem HR Succession Suite PT Ajinomoto Indonesia.</p>
              <p style="margin: 4px 0 0 0;">Kerahasiaan data terjamin untuk Dewan Suksesi & Komite Talenta Ajinomoto.</p>
            </div>
          </div>
        `;

        const info = await transporter.sendMail({
          from: smtpFrom,
          to: recipientEmail,
          cc: ccEmail || undefined,
          subject: subject,
          text: message,
          html: htmlBody
        });

        console.log(`[SMTP Direct] Email successfully delivered! Message ID: ${info.messageId}`);

        return res.json({
          success: true,
          delivered: true,
          messageId: info.messageId,
          response: info.response,
          statusText: "Berhasil dikirim langsung via SMTP Server Gateway"
        });
      } else {
        // If SMTP is not yet configured, respond with simulation info and direct instructions
        console.log(`[SMTP Simulated] Email request received for ${recipientEmail}. No SMTP credentials in .env.`);
        
        return res.json({
          success: true,
          delivered: false,
          simulated: true,
          statusText: "Berhasil dicatat di Server Log (SMTP Belum Dikonfigurasi)",
          notice: "Server siap mengirim email asli langsung ke inbox. Silakan masukkan SMTP_HOST, SMTP_USER, dan SMTP_PASS di Settings / file .env untuk pengiriman nyata."
        });
      }
    } catch (err: any) {
      console.error("[SMTP Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Gagal mengoneksikan ke Server SMTP",
        details: err.toString()
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
