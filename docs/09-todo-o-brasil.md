# Plano: cobrir todo o Brasil

## Resposta curta

Dá, com um desenho em camadas. Varrer todos os pares de aeroportos não faz sentido: com ~100 aeroportos seriam
~10 mil trechos, e a maioria não tem voo. O alvo realista é **46 cidades** (27 capitais e 19 cidades médias
bem servidas, lista em `cobertura.py`), com o Google como base de preço e o Aviasales só onde ele tem dado.

## O que foi medido (5 e 6 de outubro de 2026)

**Aviasales** (teste de todos os pares entre as 46 cidades, `relatorios/cobertura-aviasales.json`):
- Só 25% dos pares têm algum preço (528 de 2.070). Só 28 têm preço em 10 ou mais dos próximos 30 dias.
- 5,6% dos pedidos levaram 429 (limite de ritmo), então os números são um piso. Mesmo assim o quadro é claro:
  o cache do Aviasales é bom nos troncos (São Paulo, Rio, Florianópolis, Fortaleza, Foz) e raso no resto.
- Conclusão: o Aviasales serve de segundo preço e de link nas rotas fortes. Não dá pra ser a base do Brasil todo.

**Google** (coletor rodado em 12 rotas novas, 3 datas): voltaram voos em 11 das 12 (SAO para MAO, NAT, MCZ, IGU,
BPS, JOI, STM, VIX; LDB para SAO; JDO para REC; NAT para REC). Só MAO para BEL veio vazio.
Ritmo medido: ~8 buscas por segundo no coletor (a leitura de 30 dias de 30 rotas, ~930 buscas, levou ~2 min
na execução #99). Execuções anteriores demoraram 10 a 15 min, então manter margem.

## Desenho em camadas

| Camada | Rotas | Janela | Frequência | O que guarda |
|---|---|---|---|---|
| A, quente | ~50 rotas fortes (as 30 de hoje + ~20) | 3 dias, e 30 dias a cada 20 h | 30 min | Cada voo e a série de preço (como hoje) |
| B, cobertura | 46 cidades a partir de 8 hubs (SAO, RIO, BSB, BHZ, SSA, REC, FOR, POA) e de volta | 30 dias | 1 vez por dia, em partes | Só o menor preço por dia e trecho (tabela nova) |
| C, sob demanda | qualquer par que alguém pedir no site | 30 dias | entra na fila e vira B ou A | igual à B |

Por que a B guarda só o menor preço do dia: ~900 trechos × 31 dias × ~20 voos seriam ~560 mil linhas de uma vez.
Com só o menor preço por dia são ~28 mil, e o site responde "pra onde dá pra ir" e "qual dia é mais barato"
igual. A série por voo (necessária pra "Vai cair?") fica só na camada A.

## Limites que mandam no plano

- **D1 gratuito**: 100 mil linhas escritas por dia. A camada A com ~50 rotas cabe. A B cabe se guardar só o
  menor preço por dia. Passar disso exige o plano pago da Cloudflare (a partir de US$ 5/mês, limites muito
  maiores; confira os valores no painel antes de assinar).
- **Tempo do job**: 20 min. A leitura de 30 dias das camadas B e C deve rodar em partes (matriz de jobs no
  workflow, cada um com um grupo de origens).
- **Bloqueio do Google**: o volume sobe de ~3 mil buscas por dia pra ~30 mil. Não sei onde o Google começa a
  recusar. Subir em degraus (50, 150, 300 mil buscas por dia) e vigiar a taxa de buscas vazias.
- **Rastreio de falha**: avisar quando o coletor falhar ou quando a taxa de busca vazia passar de 20%.

## Fases

1. **Fase 0, grátis, 1 dia**: levar a camada A de 30 para ~50 rotas, escolhidas pelos achados do teste
   (SAO para NAT, MCZ, VIX, IGU, MAO, BEL, JOI; RIO para SSA, REC, NAT; BSB para SSA, entre outras) e incluir
   os nomes das cidades no site. Vigiar a cota do D1 e o tempo do job.
2. **Fase 1**: tabela `dia_trecho` (menor preço por dia), job B em matriz, tratar 429 com espera
   (hoje o `referencia.py` repete 3 vezes e desiste).
3. **Fase 2**: site com origem e destino abertos às 46 cidades, mapa ou lista por região, páginas por rota
   pra busca do Google, e a fila da camada C ("não achou seu trecho? vigiamos pra você").
4. **Fase 3**: plano pago da Cloudflare e do Vercel, quando o tráfego justificar.

## Decisões que são suas

- Aprovar a Fase 0 (muda o que o coletor vigia, é reversível).
- Aceitar gastar ~US$ 5/mês na Cloudflare a partir da Fase 1.
- Escolher as 8 cidades-hub da camada B (a sugestão acima é só um começo).

## Camada C no ar: trechos sob demanda (6/out/2026)

Quem abre "Melhor dia" pode escolher qualquer par das 46 cidades. Se o trecho ainda não é vigiado:

1. O site chama o Worker em `/api/pedir`, que valida as cidades, recusa pedido fora da lista e do teto
   de 150 trechos novos, e põe o par na tabela `fila` do D1.
2. Na próxima rodada o coletor lê a `fila`, busca o trecho com 30 dias de uma vez e o move pra `vigiadas`.
   Daí em diante ele entra em todas as rodadas (3 dias a cada 30 min, 30 dias a cada 20 h).
3. O site avisa "entrou na fila" e, quando o trecho já tem dado, mostra os preços normalmente.

Limite do D1 gratuito: se a cota do dia estiver cheia, o trecho passa a ser vigiado mas os voos só
entram no banco depois das 00:00 UTC.

Publicação: o Worker é publicado sozinho pelo Cloudflare (Workers Builds) quando algo muda em `cloudflare/`.
Teste do deploy: `https://radar-voos.nicollesothe.workers.dev/api/versao`.
