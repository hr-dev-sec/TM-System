import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ 
      status: "ok", 
      endpoint: "/api/send-email",
      description: "POST to this endpoint with JSON payload: { recipientEmail, ccEmail, subject, message }"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const { recipientEmail, ccEmail, subject, message } = body;

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

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
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
            <h2 style="color: #2dd4bf; margin: 0; font-size: 18px; font-weight: 800;">AJINOMOTO INDONESIA</h2>
            <span style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase;">Succession Suite</span>
          </div>
          <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">
            ${(message || "").replace(/\\n/g, '<br/>')}
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

      return res.status(200).json({
        success: true,
        delivered: true,
        messageId: info.messageId,
        response: info.response,
        statusText: "Berhasil dikirim langsung via SMTP Server Gateway"
      });
    } else {
      return res.status(200).json({
        success: true,
        delivered: false,
        simulated: true,
        statusText: "Berhasil dicatat di Server Log (SMTP Belum Dikonfigurasi)",
        notice: "Server siap mengirim email asli langsung ke inbox. Silakan masukkan SMTP_HOST, SMTP_USER, dan SMTP_PASS di Environment Variables untuk pengiriman nyata."
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Gagal mengoneksikan ke Server SMTP",
      details: err?.toString()
    });
  }
}
