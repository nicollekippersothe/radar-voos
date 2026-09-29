# Radar de voos

Procura passagens baratas no Google Voos e avisa por issue quando aparece alguma abaixo do limite.

Hoje ele vigia **São Paulo (GRU, CGH e VCP) → Florianópolis**, só ida, nos próximos 14 dias, com limite de **R$ 500**. A busca roda sozinha a cada 3 horas pelo GitHub Actions.

## Como o aviso chega

Quando acha voo no limite, o radar abre uma issue com o label `alerta-sao-fln`. O GitHub manda e-mail pra quem acompanha o repositório (o dono acompanha por padrão). Enquanto a issue estiver aberta, voos novos entram como comentário, sem repetir os que já foram avisados. Feche a issue pra zerar o alerta.

## Rodar na mão

Pelo GitHub: aba **Actions** → **Radar de voos** → **Run workflow**. Dá pra trocar o preço e a quantidade de dias.

No terminal (só imprime, não abre issue):

```sh
PRECO_MAX=800 DIAS=7 python3 radar.py
```

## Trocar o trecho

Edite `ORIGEM` e `DESTINO` em `.github/workflows/radar.yml` com os códigos IATA (ex.: `SAO`, `FLN`, `RIO`, `POA`). Para vigiar mais de um trecho, copie o job `sp-floripa` e mude os códigos.

## Limitações

- Os dados vêm da página pública do Google Voos, lida sem navegador. Se o Google mudar o formato da página, a Action falha e o GitHub avisa por e-mail.
- A consulta sai de servidores do GitHub fora do Brasil. O preço pode diferir um pouco do que aparece no app. Confira antes de comprar.
- O GitHub pausa Actions agendadas em repositórios sem nenhuma atividade por 60 dias. Se isso acontecer, é só reativar na aba Actions.
