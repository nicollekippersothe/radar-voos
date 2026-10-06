# Passagem barata de última hora: o que os dados mostram

Análise de 30/set a 5/out de 2026: 3.178 voos já partidos, 107 leituras. Reproduzível com
`python padrao.py` (também roda todo dia no workflow "Padrão de última hora" e grava
`relatorios/padrao-ultima-hora.json`).

## Floripa nos próximos 3 dias

Conferido: às 22:52 de 5/out, o voo mais barato saindo de Floripa era R$ 831 (para Porto Alegre).
Nenhum ficou abaixo de R$ 500. No histórico, 270 voos de Floripa tiveram preço final (menor das últimas
8 h) entre R$ 790 e R$ 922, e nenhum em R$ 500 ou menos. Hoje só vigiamos 4 destinos a partir de Floripa
(Porto Alegre, Curitiba, Rio e São Paulo).

## O que acontece com o preço perto da partida

- O preço mediano de um voo quase não muda de 48 h até 1 h antes. O que muda é a dispersão.
- **Queda sustentada** (preço estável nas últimas 6 h contra a base de 48 a 12 h antes): 8,1% dos
  voos caem 20% ou mais, 4,6% caem 30% ou mais. Já **12,1% sobem** 30% ou mais. Preço de última hora
  sobe tanto quanto desce.
- Saída à tarde e à noite cai mais (11% dos voos das 15h às 23h, contra 3 a 6% dos voos da manhã).
  Por companhia há pouca diferença (LATAM 8,6%, Gol 8,5%, Azul 6,9%).
- As maiores quedas são de patamares altos (R$ 2.900 a R$ 3.700) para o preço normal da rota (R$ 740 a
  R$ 900). O preço final é normal, o inicial é que era absurdo.
- Achado de verdade, no critério "final a 60% da base ou menos e até R$ 600": 19 voos de 3.393 (0,6%).
  Concentrados em Salvador→São Paulo e Cuiabá↔São Paulo. Exemplo real: São Paulo→Cuiabá, Gol, 23:55 de
  2/out: base R$ 1.102, final R$ 278.
- Preço final nas últimas 8 h: mediana R$ 1.250, só 1% em R$ 500 ou menos, nenhum em R$ 350 ou menos.

Leitura: o caso "R$ 300 pra São Paulo no mesmo dia" existe, mas é raro (menos de 1% dos voos) e, na amostra de 6
dias, não apareceu em Floripa. Seis dias é pouco. Dá pra confirmar que o fenômeno existe, não dá pra
dizer em que rota e horário ele é frequente.

## Problema nos dados que precisa ser resolvido

36,8% dos voos têm ao menos uma leitura acima de 2 vezes a mediana do próprio voo (4,4% das leituras).
O preço de um mesmo voo alterna entre dois patamares, por exemplo R$ 550 e R$ 3.499, às vezes por várias
horas. Pode ser a companhia fechando e reabrindo faixas de tarifa, ou pode ser a leitura pegando outra
tarifa (cabine ou flexibilidade). Não sei qual. Até separar as duas coisas, "queda de preço" calculada
pela última leitura engana: a regra do site ("queda de 30% nas últimas 48 h") deve exigir que o novo nível
se repita em leituras seguidas.

## Fluxo proposto

1. Leitura a cada 30 min (já existe). Os níveis duram horas, então 30 min basta.
2. Limpeza: separar a série de cada voo em patamares e só aceitar mudança que se repita em 2 leituras ou mais.
3. Evento de oportunidade: patamar novo pelo menos 35% abaixo da base do próprio voo e abaixo do
   preço normal da rota naquele horário.
4. Registrar cada evento com contexto: horas até a partida, faixa de horário, companhia, rota, dia da
   semana, quantos voos concorrentes na janela de 3 h e quantos voos da rota sumiram da lista no dia
   (assento esgotado ou cancelado).
5. Medir a recorrência por rota, horário e companhia. A "chance de aparecer uma oportunidade nas próximas 6 h"
   vem daí.
6. Avisar (Telegram) quando o evento acontecer, com o link de compra.
7. Diário de achados: quando você achar um preço bom no site da companhia, anote data, hora, rota e preço. Isso
   é o gabarito pra checar se o nosso dado também enxergou.

## Hipótese a testar

O preço de R$ 300 pode ter vindo do site da Gol e não aparecer no Google Voos. Se o diário de achados mostrar
que sim, vale ler também o preço direto da companhia, pelo menos pras rotas de Floripa.
