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

As VAPID keys locais ficam em `.env.push.local.ps1`, que nao vai para o GitHub.
Guarda o ficheiro `service-account.json` do Firebase em:

```text
C:\Minhas Apps\AppBragaDesktop\service-account.json
```

Depois usa:

```powershell
npm run push:watch:local
```

Ele le alteracoes na Firestore e envia FCM/Web Push standard para os dispositivos registados em `notificationTokens`.

Teste manual para todos os dispositivos registados:

```powershell
npm run push:test:local
```

No Electron, as notificacoes nativas funcionam enquanto o processo estiver aberto ou minimizado para a tray. No iPhone/Android, a app deve estar instalada como PWA e o dispositivo deve aparecer em `Configuracoes > Dispositivos ativos` como `Web Push standard` ou `FCM`.

## Backup local automatico

O backup local automatico funciona no Electron porque precisa de permissao para escrever em disco.

- Horario: dias uteis as 18:30.
- A app tem de estar aberta ou minimizada para segundo plano/tray.
- Os ficheiros sao guardados na pasta `local-backups` dentro de `userData` do Electron.
- O estado, temporizador e botao de backup manual aparecem em `Configuracoes > Backup local automatico`.
