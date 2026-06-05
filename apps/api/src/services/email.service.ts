import { Resend } from "resend";
import { config } from "../config";

const resend = new Resend(config.RESEND_API_KEY || "re_placeholder");

export const emailService = {
  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    clinicName: string;
    password: string;
    trialDays: number;
  }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Boas-vindas para ${params.to} — trial: ${params.trialDays} dias`);
      return;
    }

    const dashboardUrl = `${config.WEB_URL}/dashboard`;

    await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: `Bem-vindo ao ClinicAI — seu trial de ${params.trialDays} dias começou!`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #0d1520;">
          <div style="background: #080d12; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #00d2c8; margin: 0; font-size: 24px;">ClinicAI</h1>
          </div>
          <div style="background: #0f1a28; padding: 32px; border-radius: 0 0 12px 12px; color: #e8f4f3;">
            <p style="margin: 0 0 16px;">Olá, <strong>${params.name}</strong>!</p>
            <p style="margin: 0 0 16px; color: #94b4b2;">
              Sua conta para <strong style="color: #e8f4f3;">${params.clinicName}</strong> foi criada com sucesso.
              Você tem <strong style="color: #00d2c8;">${params.trialDays} dias</strong> de trial gratuito.
            </p>
            <div style="background: #0d1520; border: 1px solid #1a3040; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #5a7a78; text-transform: uppercase; letter-spacing: 1px;">Seus dados de acesso</p>
              <p style="margin: 0 0 4px; font-size: 14px;"><strong>Email:</strong> <span style="color: #00d2c8;">${params.to}</span></p>
              <p style="margin: 0; font-size: 14px;"><strong>Senha:</strong> <span style="color: #00d2c8;">${params.password}</span></p>
            </div>
            <div style="text-align: center; margin: 32px 0 0;">
              <a href="${dashboardUrl}"
                style="background: #00e5dc; color: #080d12; font-weight: 700; padding: 14px 32px;
                       border-radius: 8px; text-decoration: none; font-size: 15px; display: inline-block;">
                Acessar painel →
              </a>
            </div>
          </div>
        </div>
      `,
    });
  },
};
