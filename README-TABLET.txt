Versão tablet baseada na app PC.

Esta versão usa as mesmas coleções Firebase da app PC:
- stock
- historico
- pcs
- manutencoes
- printers

Formato esperado na coleção printers:
{
  ip: "192.168.10.178",
  toner: { black: 20, cyan: 60, magenta: 70, yellow: 50 },
  waste: 30
}

No tablet:
- Impressoras e Dashboard leem a coleção printers
- Stock, Histórico, Computadores e Manutenção continuam a ler as coleções já existentes
- Pistolas, Portas e Users continuam com os dados locais da app base
