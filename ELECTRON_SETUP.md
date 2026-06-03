# App Braga Electron Setup

## Criar instalador Windows

O Electron funciona como wrapper da app principal publicada no GitHub Pages:

```text
https://picafern-commits.github.io/App-Tablet/html/index.html
```

Os ficheiros locais ficam no setup apenas como fallback de emergencia se o GitHub Pages estiver indisponivel.

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
$env:APP_BRAGA_VAPID_PUBLIC_KEY="chave-publica-web-push"
$env:APP_BRAGA_VAPID_PRIVATE_KEY="chave-privada-web-push"
$env:APP_BRAGA_VAPID_SUBJECT="mailto:admin@appbraga.pt"
npm run push:watch
```

Ele le alteracoes na Firestore e envia FCM/Web Push standard para os dispositivos registados em `notificationTokens`.

Teste manual para todos os dispositivos registados:

```powershell
npm run push:test
```

No Electron, as notificacoes nativas funcionam enquanto o processo estiver aberto ou minimizado para a tray. No iPhone/Android, a app deve estar instalada como PWA e o dispositivo deve aparecer em `Configuracoes > Dispositivos ativos` como `Web Push standard` ou `FCM`.

## Backup local automatico

O backup local automatico funciona no Electron porque precisa de permissao para escrever em disco.

- Horario: dias uteis as 18:30.
- A app tem de estar aberta ou minimizada para segundo plano/tray.
- Os ficheiros sao guardados na pasta `local-backups` dentro de `userData` do Electron.
- O estado, temporizador e botao de backup manual aparecem em `Configuracoes > Backup local automatico`.
