# App Braga - Cloud Functions Notificacoes

Com Blaze ativo, as notificacoes devem ser enviadas por Firebase Cloud Functions e nao por um PC local.

## Secrets necessarios

No PC com Firebase CLI autenticado:

```bash
firebase functions:secrets:set APP_BRAGA_VAPID_PUBLIC_KEY
firebase functions:secrets:set APP_BRAGA_VAPID_PRIVATE_KEY
```

O assunto VAPID fica por defeito como `mailto:admin@appbraga.pt`.

## Deploy

Automatico pelo GitHub Actions quando houver alteracoes em `functions/**`, desde que estes GitHub Secrets existam:

- `FIREBASE_SERVICE_ACCOUNT`: JSON de uma service account do Google Cloud com permissao para publicar Firebase Functions.
- `APP_BRAGA_VAPID_PUBLIC_KEY`: chave publica Web Push.
- `APP_BRAGA_VAPID_PRIVATE_KEY`: chave privada Web Push.

Tambem pode ser lancado manualmente no GitHub em **Actions > Deploy Firebase Functions > Run workflow**.

Deploy manual num PC com Firebase CLI autenticado:

```bash
cd "C:\Minhas Apps\AppBragaDesktop\AppBragaTeste-main"
firebase deploy --only functions
```

## Triggers incluidos

- `notificationRequests/{requestId}`: teste remoto pela pagina Configuracoes.
- `printers/{printerId}`: notifica quando toner passa de 0% para 95% ou mais.
- `stock/{stockId}`: notifica alteracoes de stock.
- `manutencoes/{manutencaoId}`: notifica manutencoes novas/alteradas.
- `radioWeeklyRecords/{recordId}`: notifica novo registo semanal se `notifyRadios` estiver ativo.

## Estado

A funcao escreve o estado em:

```text
config/cloudNotifications
```

Campos uteis:

- `lastRunAt`
- `lastSent`
- `lastFailed`
- `standardWebPushReady`
- `provider`
- `region`
