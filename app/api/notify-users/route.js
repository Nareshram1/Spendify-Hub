import nodemailer from "nodemailer";
import { getAllUserEmails } from "@/lib/database"; 

export async function POST(req) {
  const { data: users, error } = await getAllUserEmails();

  if (error || !users || users.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "No users found" }),
      { status: 500 }
    );
  }

  for (const user of users) {
    if (user.email) {
      await sendEmail(user.email);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

async function sendEmail(to) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlContent = `
    <div style="background-color: #171223; padding: 2rem; font-family: sans-serif; color: #ffffff; border-radius: 10px;">
      <h2 style="color: #0ac7b8;">🚀 New Update Available on Spendify!</h2>
      <p>Hey there,</p>
      <p>We're excited to announce that a new version of <strong>Spendify</strong> is now available!</p>

      <h3 style="color: #0ac7b8;">🌟 What's New:</h3>
      <ul>
        <li>🎨 UI Update - Sleeker, smoother, and cleaner interface</li>
        <li>🛠️ Stability improvements for a more reliable experience</li>
        <li>🌐 <strong>Now available as a full website</strong> for enhanced flexibility and usability</li>
      </ul>

      <a href="https://fuck-playstore.vercel.app" style="display: inline-block; margin-top: 1rem; background-color: #0ac7b8; color: #171223; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Check it Out Now
      </a>

      <p style="margin-top: 2rem;">Thanks for being a part of the Spendify family 💙</p>
      <p style="font-size: 0.9rem; color: #aaaaaa;">You’re receiving this email because you're a valued user of Spendify.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Spendify" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "🚨 Spendify Update Alert - Try the new version now!",
    html: htmlContent,
  });
}