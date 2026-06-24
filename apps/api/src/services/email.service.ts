import { Resend } from "resend";
import { config } from "../config";

const resend = new Resend(config.RESEND_API_KEY || "re_placeholder");

export const emailService = {
  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    clinicName: string;
    trialDays: number;
  }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Boas-vindas para ${params.to} — trial: ${params.trialDays} dias`);
      return;
    }

    const dashboardUrl = `${config.WEB_URL}/dashboard`;

    const { error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: `Bem-vindo ao ClinicAI — ${params.trialDays} dias gratuitos começaram agora`,
      html: `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Bem-vindo ao ClinicAI</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f6f8f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- preview text -->
<div style="display:none;max-height:0;overflow:hidden;color:#f6f8f5;font-size:1px;">
  Sua conta está pronta — ${params.trialDays} dias de acesso gratuito ativados.&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f6f8f5">
  <tr>
    <td align="center" style="padding:48px 16px 40px;">

      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid rgba(15,23,20,0.08);box-shadow:0 4px 20px rgba(15,23,20,0.07);">

        <!-- Top accent bar -->
        <tr>
          <td bgcolor="#0e9f6e" height="4"
              style="font-size:0;line-height:0;background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:16px 16px 0 0;">
            <!--[if mso]>&nbsp;<![endif]-->
          </td>
        </tr>

        <!-- Header: logo -->
        <tr>
          <td align="center" style="padding:44px 48px 36px;background-color:#ffffff;">
            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td align="center" style="padding-bottom:16px;">
                  <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                    <tr>
                      <td width="54" height="54" bgcolor="#0e9f6e" align="center" valign="middle"
                          style="width:54px;height:54px;background:linear-gradient(135deg,#0fae74,#14b8a6);border-radius:14px;">
                        <span style="font-family:Georgia,'Palatino Linotype',serif;font-size:26px;font-weight:700;color:#ffffff;line-height:54px;">C</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <span style="font-family:Georgia,'Palatino Linotype','Book Antiqua',serif;font-size:22px;font-weight:700;color:#0f1714;letter-spacing:-0.4px;">ClinicAI</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr><td height="1" bgcolor="#0f1714" style="font-size:0;line-height:0;opacity:0.07;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 48px 36px;">
            <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:#0e9f6e;text-transform:uppercase;letter-spacing:2px;">
              Boas-vindas
            </p>
            <h1 style="margin:0 0 20px;font-family:Georgia,'Palatino Linotype',serif;font-size:30px;font-weight:700;color:#0f1714;line-height:1.22;letter-spacing:-0.5px;">
              Olá, ${params.name}!
            </h1>
            <p style="margin:0 0 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.75;color:#4d5a53;">
              Sua conta para <strong style="color:#0f1714;font-weight:600;">${params.clinicName}</strong> foi criada com sucesso. Estamos felizes em ter você a bordo — a sua atendente virtual está pronta para começar.
            </p>

            <!-- Trial pill -->
            <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td bgcolor="#0e9f6e" align="center"
                    style="background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:100px;padding:10px 22px;">
                  <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff;white-space:nowrap;letter-spacing:0.2px;">
                    ✦&nbsp; ${params.trialDays} dias de acesso gratuito — ativos agora
                  </span>
                </td>
              </tr>
            </table>

            <!-- Access card -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:36px;">
              <tr>
                <td bgcolor="#f6f8f5" style="background-color:#f6f8f5;border-radius:12px;border:1px solid rgba(14,159,110,0.18);padding:22px 24px;">
                  <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;color:#8a978f;text-transform:uppercase;letter-spacing:2px;">
                    Acesso ao painel
                  </p>
                  <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;">E-mail</p>
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#0e9f6e;">
                    ${params.to}
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <td bgcolor="#0e9f6e" align="center"
                    style="background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:10px;mso-padding-alt:0;">
                  <a href="${dashboardUrl}"
                     style="display:inline-block;padding:15px 36px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
                    Acessar meu painel&nbsp;&nbsp;→
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr><td height="1" bgcolor="#0f1714" style="font-size:0;line-height:0;opacity:0.07;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#fafbf9" style="background-color:#fafbf9;padding:28px 48px;border-radius:0 0 16px 16px;">
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;line-height:1.65;">
              Não criou esta conta? Ignore este e-mail com segurança — nenhuma ação é necessária.
            </p>
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;line-height:1.65;">
              © ${new Date().getFullYear()} ClinicAI · Atendimento inteligente via WhatsApp
            </p>
          </td>
        </tr>

        <!-- Bottom accent bar -->
        <tr>
          <td bgcolor="#0e9f6e" height="3"
              style="font-size:0;line-height:0;background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:0 0 16px 16px;">
            <!--[if mso]>&nbsp;<![endif]-->
          </td>
        </tr>

      </table>

      <p style="margin:20px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;text-align:center;">
        Dúvidas? Responda este e-mail — estamos aqui para ajudar.
      </p>

    </td>
  </tr>
</table>
</body>
</html>`,
    });

    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },

  async sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Reset de senha para ${params.to} — link: ${params.resetUrl}`);
      return;
    }
    const { error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: "Redefinição de senha — ClinicAI",
      html: buildEmailHtml({
        previewText: "Recebemos uma solicitação para redefinir a senha da sua conta ClinicAI.",
        eyebrow: "Segurança",
        title: `Olá, ${params.name}!`,
        body: `Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. <strong style="color:#0f1714">O link expira em 1 hora.</strong>`,
        ctaLabel: "Redefinir minha senha  →",
        ctaUrl: params.resetUrl,
        footer: "Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.",
      }),
    });
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },

  async sendTrialExpiringEmail(params: { to: string; name: string; clinicName: string; daysLeft: number }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Trial expirando para ${params.to} — ${params.daysLeft} dia(s)`);
      return;
    }
    const daysText = params.daysLeft === 0 ? "hoje" : params.daysLeft === 1 ? "amanhã" : `em ${params.daysLeft} dias`;
    const { error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: `Seu teste acaba ${daysText} — ClinicAI`,
      html: buildEmailHtml({
        previewText: `Seu período de teste da ${params.clinicName} expira ${daysText}. Assine para continuar sem interrupções.`,
        eyebrow: "Período de teste",
        title: `Seu acesso expira ${daysText}`,
        body: `<strong style="color:#0f1714">${params.clinicName}</strong> está usando o plano de teste do ClinicAI. Para continuar recebendo agendamentos e atendendo pacientes sem interrupção, assine o plano mensal por apenas <strong style="color:#0f1714">R$79,90/mês</strong>.`,
        ctaLabel: "Assinar agora  →",
        ctaUrl: `${config.WEB_URL}/assinar`,
        footer: "Caso não queira continuar, não é necessária nenhuma ação.",
      }),
    });
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },

  async sendPaymentConfirmationEmail(params: { to: string; name: string; clinicName: string; expiresAt: Date }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Pagamento confirmado para ${params.to}`);
      return;
    }
    const expiresFormatted = params.expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const { error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: "Pagamento confirmado ✓ — ClinicAI",
      html: buildEmailHtml({
        previewText: `Seu pagamento foi confirmado. O acesso de ${params.clinicName} está ativo até ${expiresFormatted}.`,
        eyebrow: "Pagamento confirmado",
        title: `Tudo certo, ${params.name}!`,
        body: `O pagamento de <strong style="color:#0f1714">R$79,90</strong> para <strong style="color:#0f1714">${params.clinicName}</strong> foi confirmado com sucesso. Seu acesso está ativo e renovado até <strong style="color:#0f1714">${expiresFormatted}</strong>.`,
        ctaLabel: "Acessar meu painel  →",
        ctaUrl: `${config.WEB_URL}/dashboard`,
        footer: "Guarde este e-mail como comprovante. Em caso de dúvidas, responda esta mensagem.",
      }),
    });
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },

  async sendSuspensionEmail(params: { to: string; name: string; clinicName: string }) {
    if (!config.RESEND_API_KEY) {
      console.log(`📧 [email simulado] Conta suspensa para ${params.to}`);
      return;
    }
    const { error } = await resend.emails.send({
      from: config.FROM_EMAIL,
      to: params.to,
      subject: "Seu acesso foi suspenso — ClinicAI",
      html: buildEmailHtml({
        previewText: `O acesso de ${params.clinicName} ao ClinicAI foi suspenso. Reative agora para retomar o atendimento.`,
        eyebrow: "Acesso suspenso",
        title: `${params.clinicName} está sem acesso`,
        body: `O período de teste de <strong style="color:#0f1714">${params.clinicName}</strong> encerrou e o acesso ao ClinicAI foi suspenso. Para retomar o atendimento via WhatsApp e os agendamentos automáticos, assine o plano mensal por <strong style="color:#0f1714">R$79,90/mês</strong>.`,
        ctaLabel: "Reativar minha conta  →",
        ctaUrl: `${config.WEB_URL}/assinar`,
        footer: "Seus dados estão preservados. Ao reativar, tudo voltará exatamente como estava.",
      }),
    });
    if (error) throw new Error(`Resend: ${error.name} — ${error.message}`);
  },
};

function buildEmailHtml(p: {
  previewText: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f6f8f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;color:#f6f8f5;font-size:1px;">${p.previewText}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f6f8f5">
  <tr><td align="center" style="padding:48px 16px 40px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
           style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid rgba(15,23,20,0.08);box-shadow:0 4px 20px rgba(15,23,20,0.07);">
      <tr><td bgcolor="#0e9f6e" height="4" style="font-size:0;line-height:0;background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:16px 16px 0 0;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
      <tr><td align="center" style="padding:44px 48px 36px;background-color:#ffffff;">
        <table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr><td align="center" style="padding-bottom:16px;">
            <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
              <td width="54" height="54" bgcolor="#0e9f6e" align="center" valign="middle"
                  style="width:54px;height:54px;background:linear-gradient(135deg,#0fae74,#14b8a6);border-radius:14px;">
                <span style="font-family:Georgia,'Palatino Linotype',serif;font-size:26px;font-weight:700;color:#ffffff;line-height:54px;">C</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td align="center"><span style="font-family:Georgia,'Palatino Linotype','Book Antiqua',serif;font-size:22px;font-weight:700;color:#0f1714;letter-spacing:-0.4px;">ClinicAI</span></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 48px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr><td height="1" bgcolor="#0f1714" style="font-size:0;line-height:0;opacity:0.07;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
      </table></td></tr>
      <tr><td style="padding:40px 48px 36px;">
        <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;color:#0e9f6e;text-transform:uppercase;letter-spacing:2px;">${p.eyebrow}</p>
        <h1 style="margin:0 0 20px;font-family:Georgia,'Palatino Linotype',serif;font-size:28px;font-weight:700;color:#0f1714;line-height:1.22;letter-spacing:-0.5px;">${p.title}</h1>
        <p style="margin:0 0 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.75;color:#4d5a53;">${p.body}</p>
        <table cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr><td bgcolor="#0e9f6e" align="center"
              style="background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:10px;mso-padding-alt:0;">
            <a href="${p.ctaUrl}" style="display:inline-block;padding:15px 36px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">${p.ctaLabel}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 48px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr><td height="1" bgcolor="#0f1714" style="font-size:0;line-height:0;opacity:0.07;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
      </table></td></tr>
      <tr><td bgcolor="#fafbf9" style="background-color:#fafbf9;padding:28px 48px;border-radius:0 0 16px 16px;">
        <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;line-height:1.65;">${p.footer}</p>
        <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;line-height:1.65;">© ${new Date().getFullYear()} ClinicAI · Atendimento inteligente via WhatsApp</p>
      </td></tr>
      <tr><td bgcolor="#0e9f6e" height="3" style="font-size:0;line-height:0;background:linear-gradient(135deg,#0fae74 0%,#0e9f8a 55%,#14b8a6 100%);border-radius:0 0 16px 16px;"><!--[if mso]>&nbsp;<![endif]--></td></tr>
    </table>
    <p style="margin:20px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#8a978f;text-align:center;">Dúvidas? Responda este e-mail — estamos aqui para ajudar.</p>
  </td></tr>
</table>
</body>
</html>`;
}
