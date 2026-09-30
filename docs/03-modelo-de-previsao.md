# Modelo de previsão

O objetivo é responder três perguntas com números, e não com achismo:

1. **Melhor dia:** "Quero voltar de SP pra Floripa entre sábado e terça. Qual dia tende a ser mais barato?"
2. **Chance de queda:** "Esse voo de hoje à noite está R$ 1.200. Qual a chance de cair pra menos de R$ 500 antes de decolar?"
3. **Comprar ou esperar:** "Compro agora ou espero?"

Pra responder, o radar precisa de histórico próprio. Nada disso existe pronto pro doméstico brasileiro.

## O que coletar

Cada leitura é uma linha:

| Campo | Exemplo | Observação |
|---|---|---|
| `lido_em` | 2026-09-30 17:45 | Horário da leitura, em Brasília |
| `origem`, `destino` | SAO, FLN | Código IATA da cidade ou aeroporto |
| `data_voo` | 2026-10-04 | |
| `hora_saida`, `hora_chegada` | 16:50, 18:05 | |
| `companhia` | Gol | |
| `numero_voo` | G3 1234 | Quando disponível. Sem ele, a chave é companhia + hora de saída |
| `paradas` | 0 | |
| `duracao_min` | 75 | |
| `preco` | 1237 | Em reais, inteiro |
| `fonte` | google-voos | Pra saber de onde veio |

Chave do voo: `origem + destino + data_voo + companhia + hora_saida`. Todas as leituras do mesmo voo formam a **série de preço** dele, do primeiro dia visto até a decolagem.

Campos derivados na hora da análise:

- `antecedencia_h`: horas entre a leitura e a partida. É o eixo mais importante.
- `dia_semana_voo`, `hora_do_dia_voo`, `dia_semana_leitura`, `hora_leitura`
- `preco_min_ate_agora`, `preco_max_ate_agora`, `preco_primeira_leitura`

## Frequência de coleta

| Antecedência do voo | Intervalo de leitura | Por quê |
|---|---|---|
| Até 48 h | 15 a 30 min | Aqui acontecem as quedas curtas. É o foco do produto |
| 2 a 7 dias | 2 h | Movimentos mais lentos |
| 7 a 30 dias | 1 vez por dia | Só pra tendência e pra busca por orçamento |

## As três respostas, do mais simples ao mais elaborado

### Resposta 1: melhor dia na janela (não precisa de modelo)

É consulta direta: pra cada dia da janela, o menor preço lido hoje. Já dá pra fazer com o `radar.py` atual.

Exemplo real de 30/09/2026, SP → FLN, voo direto:

| Dia | Menor direto | Companhia, horário |
|---|---|---|
| Qua 30/09 (hoje) | R$ 2.384 | Gol 19:25 |
| Qui 01/10 | R$ 2.384 | Gol 07:45 |
| Sáb 03/10 | R$ 1.338 | Gol 17:15 |
| Dom 04/10 | R$ 1.237 | Gol 16:50 |
| Seg 05/10 | R$ 1.237 | Gol 22:35 |
| Ter 06/10 | R$ 1.340 | LATAM 08:10 |

Resposta do radar: "Domingo e segunda estão empatados no mais barato (R$ 1.237). Sábado custa R$ 100 a mais. Hoje e amanhã, quase o dobro."

Com histórico, a resposta melhora: "Domingo está R$ 1.237. Nos últimos 8 domingos, esse mesmo voo chegou a R$ 890 no dia. Chance de cair abaixo de R$ 1.000 até domingo: 4 em 8."

### Resposta 2: chance de queda (estatística descritiva, sem aprendizado de máquina)

Pergunta: "Voo X está a P reais com A horas de antecedência. Qual a chance de chegar a menos de L reais antes de decolar?"

Método:

1. Pegar todos os voos já encerrados da mesma rota, mesma companhia e mesma faixa de horário (manhã, tarde, noite), com preço parecido na mesma antecedência (P ± 20%).
2. Contar em quantos deles o preço mínimo entre aquela antecedência e a partida ficou abaixo de L.
3. A proporção é a resposta. Mostrar junto o tamanho da amostra e o menor preço já visto.

Exemplo de saída: "Em 31 voos parecidos, 9 caíram abaixo de R$ 500 nas últimas 24 h (29%). O menor preço já visto nesse voo foi R$ 312, numa terça às 15h."

Regra de honestidade: com menos de 10 voos na amostra, o radar diz "ainda não tenho dados suficientes pra essa rota".

Isso é o que o Hopper faz na essência, só que com dados próprios e focado no Brasil.

### Resposta 3: comprar ou esperar (modelo, mais pra frente)

Depois de 2 ou 3 meses de coleta, treinar um classificador simples (regressão logística ou gradient boosting, com scikit-learn ou LightGBM) pra prever se o preço vai cair mais de X% nas próximas N horas.

Variáveis de entrada: rota, companhia, antecedência, dia da semana do voo, hora do voo, preço atual dividido pela mediana da rota, variação nas últimas 6 h, número de voos concorrentes no mesmo dia, feriado ou véspera, dia da semana e hora da leitura.

Saída: probabilidade de queda ≥ X% nas próximas N horas, e o valor esperado do menor preço.

Avaliar com separação temporal (treina em julho e agosto, testa em setembro). Só liberar pra usuário se acertar bem mais que a regra boba "o preço vai subir".

O modelo não é o primeiro passo. A resposta 2 já entrega valor e é fácil de explicar.

## Por que o preço cai tanto, e como o modelo vai enxergar isso

Três padrões que o histórico deve revelar, e que viram regras no produto:

1. **Voo vazio de horário ruim.** Voos de madrugada, de meio de tarde em dia de semana, ou em rota com muita oferta (SP ↔ Rio, SP ↔ Floripa fora da temporada) tendem a liberar classe barata na véspera. Variável: horário do voo + número de voos concorrentes no dia.
2. **Reabertura de classe depois de cancelamento ou no-show.** Grupos que cancelam ou remarcações liberam assentos em classe baixa. Aparece como queda brusca e curta, geralmente no dia. Variável: variação nas últimas horas.
3. **Promoção do canal próprio.** Tarifa que só existe no site ou app da companhia. Pode não aparecer na fonte do radar. Por isso, todo alerta de "voo parecido caiu antes" leva pro site da companhia, mesmo que a fonte do radar não mostre a queda.

## O que medir antes de qualquer tela

A pergunta que decide se o produto existe: **com que frequência um voo doméstico cai mais de 50% nas últimas 24 horas?**

Plano: coletar 15 rotas por 4 semanas na frequência acima e calcular, por rota:

- Quantos voos caíram ≥ 30%, ≥ 50% e ≥ 70% em relação ao preço de 48 h antes.
- Em que horário do dia as quedas acontecem.
- Quanto tempo a queda dura (importa pra saber o intervalo de leitura e o tempo de reação do usuário).
- Quais companhias e horários concentram as quedas.

Se as quedas de 50% acontecem em pelo menos 5% dos voos, o produto tem base. Se é menos de 1%, o foco muda pra busca por orçamento e melhor dia, que funcionam sem última hora.

## Rotas da coleta inicial

SP ↔ FLN, SP ↔ RIO, SP ↔ POA, SP ↔ CWB, SP ↔ BHZ, SP ↔ BSB, SP ↔ SSA, SP ↔ REC, FLN ↔ RIO, FLN ↔ POA, FLN ↔ CWB, RIO ↔ BHZ, SP ↔ FOR, SP ↔ CGB, SP ↔ GYN.

Critério: rotas com muitos voos por dia (mais chance de assento sobrando) e que interessam ao público (Floripa, litoral, capitais com custo de vida baixo).
