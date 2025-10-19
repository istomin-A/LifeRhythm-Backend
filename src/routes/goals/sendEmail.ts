import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, text: string) {
  // Настрой почту (пример для Gmail)
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER, // лучше хранить в .env
      pass: process.env.SMTP_PASS,
    },
  });

  // Отправка письма
  const info = await transporter.sendMail({
    from: `"LifeRhythm" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });

  console.log("✅ Email отправлен:", info.messageId);
  return info;
}
