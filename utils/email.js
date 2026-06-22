const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,

  port: Number(process.env.SMTP_PORT) || 587,

  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Verify Error:", error);
  } else {
    console.log("SMTP Server is ready.");
  }
});

const baseStyles = `
  body { margin:0; padding:0; background:#0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width:580px; margin:40px auto; background:#111111; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; }
  .header { background:#111111; padding:36px 40px 28px; border-bottom:1px solid rgba(255,255,255,0.06); text-align:center; }
  .logo-text { font-size:22px; font-weight:700; color:#ffffff; letter-spacing:-0.02em; }
  .logo-dot { color:#8b5cf6; }
  .body { padding:40px; }
  h1 { color:#ffffff; font-size:24px; font-weight:700; margin:0 0 12px; letter-spacing:-0.02em; }
  p { color:#9a9a9a; font-size:15px; line-height:1.7; margin:0 0 20px; }
  .code-box { background:#0a0a0a; border:1px solid rgba(139,92,246,0.3); border-radius:12px; padding:28px; text-align:center; margin:28px 0; }
  .code { font-size:42px; font-weight:700; letter-spacing:0.18em; color:#ffffff; font-family:monospace; }
  .btn { display:inline-block; background:#8b5cf6; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:100px; font-size:14px; font-weight:600; letter-spacing:0.04em; margin:8px 0; }
  .footer { padding:24px 40px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; }
  .footer p { font-size:12px; color:#5a5a5a; margin:0; }
  .highlight { color:#8b5cf6; }
`;

const sendVerificationEmail = async (email, username, code) => {
  const html = `
    <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo-text">Axiom<span class="logo-dot">.</span>Cloud</div>
        </div>
        <div class="body">
          <h1>Verify Your Email</h1>
          <p>Hi <strong style="color:#fff">${username}</strong>, welcome to Axiom Cloud. Enter the verification code below to activate your account.</p>
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          <p>This code expires in <strong style="color:#fff">15 minutes</strong>. If you did not create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Axiom Cloud. Think. Research. Build. Deploy.</p>
        </div>
      </div>
    </body></html>
  `;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `${code} is your Axiom Cloud verification code`,
    html,
  });
};

const sendWelcomeEmail = async (email, username) => {
  const html = `
    <!DOCTYPE html><html><head><style>${baseStyles}</style></head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo-text">Axiom<span class="logo-dot">.</span>Cloud</div>
        </div>
        <div class="body">
          <h1>Welcome to Axiom Cloud</h1>
          <p>Hi <strong style="color:#fff">${username}</strong>, your account is now active. You're ready to research ideas, learn concepts, build projects, and challenge assumptions.</p>
          <p>Your workspace is ready. Start by researching an idea, or dive straight into the AI Builder.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${process.env.APP_URL}/dashboard" class="btn">Enter Your Workspace →</a>
          </div>
          <p style="font-size:13px;color:#5a5a5a">Think. Research. Build. Deploy.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Axiom Cloud. All rights reserved.</p>
        </div>
      </div>
    </body></html>
  `;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to Axiom Cloud — your workspace is ready',
    html,
  });
};

module.exports = { sendVerificationEmail, sendWelcomeEmail };
