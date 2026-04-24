APP BRAGA — NOTIFICAÇÕES TONER 0%

O que já ficou preparado nesta versão:
- PWA base (manifest + service worker)
- pedido de permissão de notificações na página Configurações
- alertas de toner a 0% sincronizados pela coleção Firestore alertas_toner_zero
- no PC, notificação do sistema via Electron
- no tablet/iPhone, notificação do browser/app quando a App Braga estiver aberta e as notificações estiverem autorizadas

Para ficar mais perto de WhatsApp no iPhone/iPad:
1) publicar a app em HTTPS
2) adicionar ao ecrã principal no Safari
3) permitir notificações na primeira vez
4) para push em background verdadeiro, configurar Firebase Cloud Messaging (VAPID key + firebase-messaging-sw.js + envio por servidor/Cloud Function)
