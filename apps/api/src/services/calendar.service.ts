import { google } from "googleapis";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";
import { Clinic } from "@prisma/client";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = "America/Sao_Paulo";
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getOAuthClient(clinic: Clinic) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (clinic.googleRefreshToken) {
    oauth2Client.setCredentials({
      refresh_token: clinic.googleRefreshToken,
    });
  }

  return oauth2Client;
}

export type AvailableSlot = {
  start: string;
  end: string;
  label: string; // "Terça, 15 de abril às 14h"
};

export const calendarService = {
  getAuthUrl(clinicId: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: clinicId,
    });
  },

  async getTokensFromCode(code: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  },

  async listCalendars(
    clinic: Clinic
  ): Promise<{ id: string; summary: string; primary: boolean }[]> {
    if (!clinic.googleRefreshToken) return [];
    const auth = getOAuthClient(clinic);
    const calendar = google.calendar({ version: "v3", auth });
    const { data } = await calendar.calendarList.list({ maxResults: 250 });
    return (data.items ?? [])
      .filter((c) => !!c.id && c.accessRole !== "freeBusyReader")
      .map((c) => ({
        id: c.id!,
        summary: c.summaryOverride ?? c.summary ?? c.id!,
        primary: !!c.primary,
      }))
      .sort((a, b) => Number(b.primary) - Number(a.primary));
  },

  async getAvailableSlots(
    clinic: Clinic,
    daysAhead = 7
  ): Promise<AvailableSlot[]> {
    const now = dayjs().tz(TIMEZONE);

    type DayHours = {
      start: string;
      end: string;
      enabled?: boolean;
      lunchStart?: string;
      lunchEnd?: string;
    };

    const workingHours = clinic.workingHours as Record<string, DayHours | null>;

    function isInLunchBreak(slot: dayjs.Dayjs, slotEnd: dayjs.Dayjs, hours: DayHours): boolean {
      if (!hours.lunchStart || !hours.lunchEnd) return false;
      const [lsH, lsM] = hours.lunchStart.split(":").map(Number);
      const [leH, leM] = hours.lunchEnd.split(":").map(Number);
      const lunchStart = slot.hour(lsH).minute(lsM).second(0);
      const lunchEnd = slot.hour(leH).minute(leM).second(0);
      return slot.isBefore(lunchEnd) && slotEnd.isAfter(lunchStart);
    }

    // Sem Google Calendar: gera slots baseados só no horário de funcionamento
    if (!clinic.calendarId || !clinic.googleRefreshToken) {
      const slots: AvailableSlot[] = [];
      const duration = clinic.appointmentDuration;
      const dayNames: Record<string, string> = {
        sunday: "0", monday: "1", tuesday: "2", wednesday: "3",
        thursday: "4", friday: "5", saturday: "6",
      };

      for (let d = 0; d <= daysAhead; d++) {
        const day = now.add(d, "day");
        const dayOfWeek = day.day().toString();
        const dayKey = Object.keys(dayNames).find((k) => dayNames[k] === dayOfWeek);
        if (!dayKey) continue;
        const hours = workingHours[dayKey] as DayHours | null;
        if (!hours || hours.enabled === false) continue;

        const [startH, startM] = hours.start.split(":").map(Number);
        const [endH, endM] = hours.end.split(":").map(Number);
        let slotStart = day.hour(startH).minute(startM).second(0);
        const dayEnd = day.hour(endH).minute(endM).second(0);

        while (slotStart.add(duration, "minute").isBefore(dayEnd) || slotStart.add(duration, "minute").isSame(dayEnd)) {
          const slotEnd = slotStart.add(duration, "minute");
          if (slotStart.isAfter(now) && !isInLunchBreak(slotStart, slotEnd, hours)) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              label: slotStart.locale("pt-br").format("dddd, D [de] MMMM [às] HH[h]mm").replace(/^\w/, (c) => c.toUpperCase()),
            });
          }
          slotStart = slotEnd;
        }
      }
      return slots.slice(0, 20);
    }

    const auth = getOAuthClient(clinic);
    const calendar = google.calendar({ version: "v3", auth });

    const until = now.add(daysAhead, "day").endOf("day");

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: until.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: clinic.calendarId }],
      },
    });

    const busy = (data.calendars?.[clinic.calendarId!]?.busy ?? []).map(
      (b) => ({
        start: dayjs(b.start!),
        end: dayjs(b.end!),
      })
    );

    const slots: AvailableSlot[] = [];
    const duration = clinic.appointmentDuration;

    const dayNames: Record<string, string> = {
      sunday: "0",
      monday: "1",
      tuesday: "2",
      wednesday: "3",
      thursday: "4",
      friday: "5",
      saturday: "6",
    };

    for (let d = 0; d <= daysAhead; d++) {
      const day = now.add(d, "day");
      const dayOfWeek = day.day().toString();

      const dayKey = Object.keys(dayNames).find(
        (k) => dayNames[k] === dayOfWeek
      );
      if (!dayKey) continue;

      const hours = workingHours[dayKey] as DayHours | null;
      if (!hours || hours.enabled === false) continue;

      const [startH, startM] = hours.start.split(":").map(Number);
      const [endH, endM] = hours.end.split(":").map(Number);

      let slotStart = day.hour(startH).minute(startM).second(0);
      const dayEnd = day.hour(endH).minute(endM).second(0);

      while (slotStart.add(duration, "minute").isBefore(dayEnd) || slotStart.add(duration, "minute").isSame(dayEnd)) {
        const slotEnd = slotStart.add(duration, "minute");

        if (slotStart.isAfter(now) && !isInLunchBreak(slotStart, slotEnd, hours)) {
          const overlaps = busy.some(
            (b) => slotStart.isBefore(b.end) && slotEnd.isAfter(b.start)
          );

          if (!overlaps) {
            const label = slotStart
              .tz(TIMEZONE)
              .format("dddd, D [de] MMMM [às] HH[h]mm")
              .replace(/^\w/, (c) => c.toUpperCase());

            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              label,
            });
          }
        }

        slotStart = slotEnd;
      }
    }

    return slots.slice(0, 20);
  },

  async createAppointment(
    clinic: Clinic,
    params: {
      patientName: string;
      patientPhone: string;
      service: string;
      start: string;
      end: string;
      notes?: string;
    }
  ) {
    if (!clinic.calendarId || !clinic.googleRefreshToken) {
      console.warn(`⚠️  [Calendar] Agendamento sem Google Calendar para clínica "${clinic.name}" — calendarId: ${clinic.calendarId ?? "NULL"}, refreshToken: ${clinic.googleRefreshToken ? "OK" : "NULL"}`);
      return null;
    }

    const auth = getOAuthClient(clinic);
    const calendar = google.calendar({ version: "v3", auth });

    try {
      const { data } = await calendar.events.insert({
        calendarId: clinic.calendarId,
        requestBody: {
          summary: `${params.service} - ${params.patientName}`,
          description: `Paciente: ${params.patientName}\nTelefone: ${params.patientPhone}${params.notes ? `\nObservações: ${params.notes}` : ""}`,
          start: { dateTime: params.start, timeZone: TIMEZONE },
          end: { dateTime: params.end, timeZone: TIMEZONE },
        },
      });
      console.log(`📅 [Calendar] Evento criado para "${clinic.name}" — ID: ${data.id}, calendarId: ${clinic.calendarId}`);
      return data;
    } catch (err: any) {
      console.error(`❌ [Calendar] Falha ao criar evento para "${clinic.name}" — calendarId: ${clinic.calendarId} — erro: ${err?.message ?? err}`);
      throw err;
    }
  },

  async cancelAppointment(clinic: Clinic, googleEventId: string) {
    if (!clinic.calendarId || !clinic.googleRefreshToken) return;

    const auth = getOAuthClient(clinic);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: clinic.calendarId,
      eventId: googleEventId,
    });
  },
};
