import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { config } from "../config";

function getClient() {
  return new MercadoPagoConfig({ accessToken: config.MP_ACCESS_TOKEN });
}

export const mpService = {
  // Cria link de pagamento (Checkout Pro) — não exige conta MP do comprador
  async createCheckout(params: {
    clinicId: string;
    clinicName: string;
    backUrl: string;
  }): Promise<string> {
    const client = getClient();
    const preference = new Preference(client);

    const resolvedBackUrl = params.backUrl.startsWith("http://localhost")
      ? "https://example.com/dashboard"
      : params.backUrl;

    const result = await preference.create({
      body: {
        items: [{
          id: "clinicai-mensal",
          title: "ClinicAI — Assinatura Mensal",
          description: params.clinicName,
          quantity: 1,
          unit_price: 79.9,
          currency_id: "BRL",
        }],
        external_reference: params.clinicId,
        back_urls: {
          success: `${resolvedBackUrl}?payment=success`,
          failure:  `${resolvedBackUrl}?payment=failure`,
          pending:  `${resolvedBackUrl}?payment=pending`,
        },
        auto_return: "approved",
        payment_methods: {
          excluded_payment_types: [],
          installments: 1,
        },
      },
    });

    if (!result.init_point) throw new Error("MP não retornou init_point");
    return result.init_point;
  },

  async getPayment(paymentId: string) {
    const client = getClient();
    const payment = new Payment(client);
    return payment.get({ id: paymentId });
  },
};
