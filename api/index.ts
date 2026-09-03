import sendEmailHandler from "./send-email";
import emailStatusHandler from "./email-status";

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "";

  if (url.includes("send-email")) {
    return sendEmailHandler(req, res);
  }

  if (url.includes("email-status")) {
    return emailStatusHandler(req, res);
  }

  return res.status(200).json({ 
    status: "ok", 
    app: "Ajinomoto Succession API Gateway",
    endpoints: ["/api/send-email", "/api/email-status"] 
  });
}
