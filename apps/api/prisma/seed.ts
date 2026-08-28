import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIN = 60_000;
const DAY = 86_400_000;

const services = [
  "Avaliação inicial",
  "Consulta de retorno",
  "Limpeza de pele",
  "Procedimento estético",
  "Sessão de acompanhamento",
];

const contacts = [
  { name: "Mariana Alves", phone: "5511990010001" },
  { name: "Rafael Souza", phone: "5511990010002" },
  { name: "Juliana Costa", phone: "5511990010003" },
  { name: "Pedro Henrique", phone: "5511990010004" },
  { name: "Camila Ferreira", phone: "5511990010005" },
  { name: "Lucas Martins", phone: "5511990010006" },
  { name: "Beatriz Lima", phone: "5511990010007" },
  { name: "Gustavo Rocha", phone: "5511990010008" },
  { name: "Aline Ribeiro", phone: "5511990010009" },
  { name: "Thiago Carvalho", phone: "5511990010010" },
  { name: "Patrícia Gomes", phone: "5511990010011" },
  { name: "Fernanda Dias", phone: "5511990010012" },
  { name: "André Barbosa", phone: "5511990010013" },
  { name: "Larissa Mendes", phone: "5511990010014" },
  { name: "Bruno Teixeira", phone: "5511990010015" },
  { name: "Sofia Nunes", phone: "5511990010016" },
];

type Msg = { role: "user" | "assistant"; content: string };

const threads: { kind: "agendou" | "humano" | "info"; msgs: Msg[] }[] = [
  {
    kind: "agendou",
    msgs: [
      { role: "user", content: "Oi! Queria marcar uma avaliação 😊" },
      { role: "assistant", content: "Olá! Claro, eu posso ajudar. Você prefere de manhã ou à tarde?" },
      { role: "user", content: "De manhã, se possível" },
      { role: "assistant", content: "Tenho quinta às 9h ou sexta às 10h. Qual fica melhor pra você?" },
      { role: "user", content: "Quinta às 9h" },
      { role: "assistant", content: "Perfeito! Agendei sua avaliação para quinta às 9h. Te envio um lembrete um dia antes 💚" },
    ],
  },
  {
    kind: "info",
    msgs: [
      { role: "user", content: "Bom dia, vocês aceitam convênio?" },
      { role: "assistant", content: "Bom dia! Trabalhamos com Unimed e Bradesco Saúde. Posso verificar um horário pra você?" },
      { role: "user", content: "Pode sim, pra semana que vem" },
      { role: "assistant", content: "Tenho terça às 14h ou quarta às 16h. Qual prefere?" },
    ],
  },
  {
    kind: "humano",
    msgs: [
      { role: "user", content: "Tive um desconforto depois do procedimento de ontem, é normal?" },
      { role: "assistant", content: "Sinto muito por isso 😟 Vou te encaminhar agora para um atendente da equipe para te orientar com cuidado." },
      { role: "user", content: "Obrigada, fico no aguardo" },
    ],
  },
  {
    kind: "agendou",
    msgs: [
      { role: "user", content: "Quanto custa a limpeza de pele?" },
      { role: "assistant", content: "A limpeza de pele sai por R$ 180 a sessão. Quer que eu já reserve um horário?" },
      { role: "user", content: "Quero, pode ser sexta de tarde" },
      { role: "assistant", content: "Fechado! Sexta às 15h reservado. Qualquer coisa é só me chamar 💚" },
    ],
  },
  {
    kind: "info",
    msgs: [
      { role: "user", content: "Onde fica a clínica?" },
      { role: "assistant", content: "Estamos na Rua das Acácias, 240 — Jardins, São Paulo. Tem estacionamento no local 🚗" },
      { role: "user", content: "Perfeito, obrigado!" },
      { role: "assistant", content: "Disponha! Quer aproveitar e já agendar uma avaliação?" },
    ],
  },
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  const targetSlug = process.argv[2];
  const clinic = targetSlug
    ? await prisma.clinic.findUnique({ where: { slug: targetSlug } })
    : (await prisma.clinic.findUnique({ where: { slug: "clinica-demo" } })) ??
      (await prisma.clinic.findFirst());

  if (!clinic) {
    console.error("❌ Nenhuma clínica encontrada. Crie uma conta antes de rodar o seed.");
    process.exit(1);
  }
  const clinicId = clinic.id;
  console.log(`🌱 Semeando dados para: ${clinic.name} (${clinic.slug})`);

  // Configura a clínica para o painel ficar completo
  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      aiName: "Sofia",
      phone: "5511990000000",
      adminPhone: "5511990000001",
      aiObjective: "agendamento",
      reminderEnabled: true,
      services: services as unknown as object,
      requiredDocs: ["RG", "CPF", "Carteirinha do convênio"] as unknown as object,
      companyInfo:
        "Clínica de estética e saúde integrativa. Endereço: Rua das Acácias, 240 — Jardins, São Paulo/SP. Estacionamento gratuito. Atendemos Unimed e Bradesco Saúde. Primeira avaliação tem duração de 1h.",
      workingHours: {
        monday: { start: "08:00", end: "18:00", enabled: true, lunchStart: "12:00", lunchEnd: "13:00" },
        tuesday: { start: "08:00", end: "18:00", enabled: true },
        wednesday: { start: "08:00", end: "18:00", enabled: true },
        thursday: { start: "08:00", end: "18:00", enabled: true },
        friday: { start: "08:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "13:00", enabled: true },
        sunday: { start: "08:00", end: "18:00", enabled: false },
      } as unknown as object,
    },
  });

  // Limpa dados anteriores desta clínica (idempotente)
  await prisma.message.deleteMany({ where: { conversation: { clinicId } } });
  await prisma.appointment.deleteMany({ where: { clinicId } });
  await prisma.conversation.deleteMany({ where: { clinicId } });

  const now = Date.now();

  // Conversas + mensagens (espalhadas pelos últimos 7 dias para o gráfico)
  let humanCount = 0;
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const thread = pick(threads, i);
    // Distribui pelos últimos 7 dias, com peso para os dias recentes
    const dayOffset = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 0, 1][i] ?? i % 7;
    const base = now - dayOffset * DAY - (9 + (i % 6)) * 60 * MIN;

    let humanMode = false;
    if (thread.kind === "humano" && humanCount < 3) {
      humanMode = true;
      humanCount++;
    }
    const triagemCompleta = thread.kind === "agendou" || (i % 3 === 0 && !humanMode);

    await prisma.conversation.create({
      data: {
        clinicId,
        contactPhone: c.phone,
        contactName: c.name,
        humanMode,
        humanModeActivatedAt: humanMode ? new Date(now - 20 * MIN) : null,
        triagemCompleta,
        triagemCompletaAt: triagemCompleta ? new Date(base + 30 * MIN) : null,
        messages: {
          create: thread.msgs.map((m, j) => ({
            role: m.role,
            content: m.content,
            createdAt: new Date(base + j * 7 * MIN),
          })),
        },
      },
    });
  }

  // Mensagens históricas extras (só pra encorpar o gráfico de 7 dias)
  const someConvos = await prisma.conversation.findMany({
    where: { clinicId },
    select: { id: true },
    take: 8,
  });
  const extraPerDay = [6, 9, 7, 11, 8, 13, 10]; // 6 dias atrás → hoje
  for (let d = 0; d < extraPerDay.length; d++) {
    const dayOffset = 6 - d;
    const count = extraPerDay[d];
    for (let k = 0; k < count; k++) {
      const conv = someConvos[(d + k) % someConvos.length];
      if (!conv) continue;
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "user",
          content: "Mensagem do cliente",
          createdAt: new Date(now - dayOffset * DAY - (8 + k) * 11 * MIN),
        },
      });
    }
  }

  // Agendamentos: hoje + próximos dias
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const duration = clinic.appointmentDuration || 60;

  // "Hoje" — relativo ao horário atual para que apareçam sempre no timeline (endpoint só lista futuros)
  const halfHour = 30 * MIN;
  const nextSlot = Math.ceil((now + 10 * MIN) / halfHour) * halfHour;
  const today: { at: number; contactIdx: number; serviceIdx: number; notes?: string }[] = [
    { at: nextSlot + 0 * 90 * MIN, contactIdx: 0, serviceIdx: 0, notes: "Primeira vez na clínica" },
    { at: nextSlot + 1 * 90 * MIN, contactIdx: 4, serviceIdx: 2 },
    { at: nextSlot + 2 * 90 * MIN, contactIdx: 7, serviceIdx: 1, notes: "Confirmar alergias" },
    { at: nextSlot + 3 * 90 * MIN, contactIdx: 9, serviceIdx: 3 },
  ];

  // Próximos dias — horários fixos
  const future: { dayOffset: number; hour: number; minute: number; contactIdx: number; serviceIdx: number }[] = [
    { dayOffset: 1, hour: 9, minute: 0, contactIdx: 1, serviceIdx: 0 },
    { dayOffset: 1, hour: 11, minute: 0, contactIdx: 5, serviceIdx: 2 },
    { dayOffset: 1, hour: 16, minute: 0, contactIdx: 10, serviceIdx: 1 },
    { dayOffset: 2, hour: 10, minute: 0, contactIdx: 2, serviceIdx: 3 },
    { dayOffset: 2, hour: 14, minute: 30, contactIdx: 13, serviceIdx: 0 },
    { dayOffset: 3, hour: 9, minute: 30, contactIdx: 6, serviceIdx: 1 },
    { dayOffset: 4, hour: 15, minute: 0, contactIdx: 3, serviceIdx: 2 },
    { dayOffset: 5, hour: 11, minute: 30, contactIdx: 8, serviceIdx: 4 },
    { dayOffset: 6, hour: 10, minute: 0, contactIdx: 11, serviceIdx: 0 },
  ];

  const plan = [
    ...today.map((t) => ({ at: t.at, contactIdx: t.contactIdx, serviceIdx: t.serviceIdx, notes: t.notes })),
    ...future.map((f) => {
      const d = new Date(startOfToday.getTime() + f.dayOffset * DAY);
      d.setHours(f.hour, f.minute, 0, 0);
      return { at: d.getTime(), contactIdx: f.contactIdx, serviceIdx: f.serviceIdx, notes: undefined as string | undefined };
    }),
  ];

  for (const p of plan) {
    const scheduledAt = new Date(p.at);
    const endsAt = new Date(scheduledAt.getTime() + duration * MIN);
    const contact = contacts[p.contactIdx];
    await prisma.appointment.create({
      data: {
        clinicId,
        patientName: contact.name,
        patientPhone: contact.phone,
        service: services[p.serviceIdx],
        scheduledAt,
        endsAt,
        status: "CONFIRMED",
        notes: p.notes ?? null,
      },
    });
  }

  const [convs, msgs, appts] = await Promise.all([
    prisma.conversation.count({ where: { clinicId } }),
    prisma.message.count({ where: { conversation: { clinicId } } }),
    prisma.appointment.count({ where: { clinicId } }),
  ]);
  console.log(`✅ Pronto: ${convs} conversas, ${msgs} mensagens, ${appts} agendamentos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
