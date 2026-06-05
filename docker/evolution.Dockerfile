FROM atendai/evolution-api:v1.8.7

# Permite envio de mensagens para JIDs @lid (WhatsApp Privacy IDs)
# sem rejeitar pela validação onWhatsApp que retorna exists=false para @lid.
# Patcha tanto o TS fonte quanto o JS compilado (o container não recompila na inicialização).
RUN node -e "\
const fs = require('fs'); \
const files = [ \
  '/evolution/src/api/services/channels/whatsapp.baileys.service.ts', \
  '/evolution/dist/src/api/services/channels/whatsapp.baileys.service.js' \
]; \
const OLD_TS = \"!isWA.jid.includes('@broadcast')\"; \
const NEW_TS = \"!isWA.jid.includes('@broadcast') && !isWA.jid.includes('@lid')\"; \
const OLD_JS = \"!isWA.jid.includes('@broadcast')\"; \
const NEW_JS = \"!isWA.jid.includes('@broadcast') && !isWA.jid.includes('@lid')\"; \
files.forEach(f => { \
  const c = fs.readFileSync(f, 'utf8'); \
  const p = c.split(OLD_TS).join(NEW_TS); \
  fs.writeFileSync(f, p); \
  console.log('Patched', f, ':', c.split(OLD_TS).length - 1, 'occurrences'); \
}); \
"
