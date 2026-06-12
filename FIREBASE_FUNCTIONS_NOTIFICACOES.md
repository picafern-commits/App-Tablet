# App Braga - Cloud Functions Notificacoes

O envio principal das notificacoes e a Firebase Cloud Functions. O PC de casa pode estar desligado; a cloud continua a enviar para os dispositivos registados.

## Configuracao dentro da app

As chaves Web Push sao configuradas na propria app:

1. Abrir `Notificacoes`.
2. Colar a VAPID publica e a VAPID privada.
3. Guardar Cloud.
4. Abrir a mesma pagina em cada dispositivo e carregar em Reparar este dispositivo.
5. Usar Testar Cloud.

A configuracao fica em:

```text
config/notificationCloudSettings
```

Campos principais:

- `enabled`
- `vapidPublicKey`
- `vapidPrivateKey`
- `vapidSubject`
- `alerts`

## Deploy

O GitHub Actions continua a publicar as Cloud Functions, mas ja nao precisa dos secrets VAPID. O unico secret obrigatorio para deploy e:

- `FIREBASE_SERVICE_ACCOUNT`: JSON de uma service account do Google Cloud com permissao para publicar Firebase Functions.

Tambem pode ser lancado manualmente no GitHub em **Actions > Deploy Firebase Functions > Run workflow**.

Deploy manual num PC com Firebase CLI autenticado:

```bash
cd "C:\Users\pica-\Documents\Codex\2026-06-08\files-mentioned-by-the-user-app\work\App-Tablet-main\App-Tablet-main\App-Tablet"
firebase deploy --only functions
```

## Triggers incluidos

- `notificationRequests/{requestId}`: teste remoto pela pagina Notificacoes.
- `printers/{printerId}`: notifica toner a 0%, toner a 25% e toner trocado.
- `stock/{stockId}`: notifica alteracoes de stock.
- `manutencoes/{manutencaoId}`: notifica manutencoes novas/alteradas.
- `radioWeeklyRecords/{recordId}`: notifica novo registo semanal se radios estiver ativo.

## Estado

A funcao escreve o estado em:

```text
config/cloudNotifications
```

Campos uteis:

- `lastRunAt`
- `lastSent`
- `lastFailed`
- `lastError`
- `lastDeviceCount`
- `lastStandardWebPushTargets`
- `standardWebPushReady`
- `credentialSource`
- `provider`
- `region`
