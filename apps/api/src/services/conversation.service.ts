import { prisma } from "../database/prisma";

const MAX_HISTORY = 20; // máximo de mensagens mantidas no contexto

export const conversationService = {
  async getOrCreate(clinicId: string, contactPhone: string) {
    return prisma.conversation.upsert({
      where: { clinicId_contactPhone: { clinicId, contactPhone } },
      create: { clinicId, contactPhone },
      update: {},
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: MAX_HISTORY,
        },
      },
    });
  },

  async addMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ) {
    return prisma.message.create({
      data: { conversationId, role, content },
    });
  },

  async updateContactName(conversationId: string, name: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { contactName: name },
    });
  },

  async getHistory(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: MAX_HISTORY,
    });
    return messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  },
};
