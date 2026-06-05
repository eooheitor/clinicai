import Groq from "groq-sdk";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export const transcriptionService = {
  async transcribe(audioBase64: string, mimetype: string): Promise<string> {
    const base64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const ext = mimetype.includes("ogg") ? "ogg"
      : mimetype.includes("mp4") ? "mp4"
      : mimetype.includes("mpeg") ? "mp3"
      : mimetype.includes("webm") ? "webm"
      : "ogg";

    const file = new File([buffer], `audio.${ext}`, { type: mimetype });

    const result = await getGroq().audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      language: "pt",
    });

    return result.text.trim();
  },
};
