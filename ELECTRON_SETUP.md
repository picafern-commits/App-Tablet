# App Braga Electron Setup

## Criar instalador Windows

1. Instalar dependencias:

```powershell
npm install
```

2. Testar a app desktop:

```powershell
npm run electron:dev
```

3. Criar setup `.exe`:

```powershell
npm run setup
```

O instalador fica em `dist`.

## Web Push sem Blaze

Para notificacoes Web Push com a app fechada, precisas de um processo externo a enviar FCM. Este projeto inclui um watcher local gratuito:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\service-account.json"
npm run push:watch
```

Ele le alteracoes na Firestore e envia FCM para os tokens registados em `notificationTokens`.
