# Fontes de dados

Levantamento feito em 30/09/2026. Situação de cada fonte, custo e se serve pro caso de última hora. As seções "Dados públicos da ANAC" e "Ferramentas de raspagem genéricas" serão completadas com o resultado da segunda pesquisa (ver `04-benchmark.md`).

## Como o preço de passagem é publicado (o "cru")

Antes de falar de fonte, vale entender de onde o preço vem, porque isso explica por que ele cai de repente.

1. **A companhia divide cada voo em classes de reserva** (letras como Y, B, M, H, K, L, Q...). Cada classe tem um preço e uma quantidade de assentos. As classes baratas têm poucos assentos.
2. **O sistema de gestão de receita (revenue management) abre e fecha classes** o tempo todo, comparando a ocupação real com a prevista. Se o voo está vendendo abaixo do esperado, ele reabre uma classe barata. Se está vendendo bem, fecha.
3. **Perto da partida, dois movimentos opostos.** O padrão é subir, porque quem compra na véspera costuma ser executivo e paga mais. Mas se o voo está vazio, o sistema pode liberar assentos por preço baixo pra não voar com cadeira vazia. É essa segunda situação que produz a "Gol por R$ 300".
4. **As tarifas são publicadas via ATPCO** (o intermediário mundial de tarifas) e distribuídas por GDS (Sabre, Amadeus, Travelport) e por conexões diretas (NDC ou API própria). No Brasil, a LATAM tem NDC; Gol e Azul distribuem por conexão direta com agências.
5. **Tarifas exclusivas do site ou app da companhia** não passam por GDS. Elas só aparecem lá. Isso explica por que um buscador pode mostrar R$ 1.000 enquanto o site da Gol mostra R$ 300.
6. **Buscadores guardam preço em cache.** Google Voos e Skyscanner mostram o último preço que viram, que pode ter minutos ou horas. A companhia sempre está na frente.

Conclusão prática: o preço "verdadeiro" só existe no site da companhia, na hora. Todo o resto é cópia com atraso. O radar precisa (a) ler com frequência e (b) sempre mandar o usuário confirmar na companhia.

## Fontes avaliadas

### APIs oficiais de busca

| Fonte | Situação em set/2026 | Custo | Última hora? |
|---|---|---|---|
| Amadeus Self-Service | Encerrado em 17/07/2026. Só contrato empresarial | Sob consulta | Não |
| Kiwi Tequila | Só por convite desde 2024 | n/d | Não |
| Skyscanner API | Exige 100 mil usuários/mês | Grátis pra aprovados | Não pra app novo |
| Kayak API | Só parceiros aprovados, depende de tráfego | n/d | Não pra app novo |
| Duffel | Cobre Gol, LATAM e Azul via Travelport | US$ 3 por pedido + 1% + US$ 0,005 por busca acima de 1.500 buscas por venda | Só pra confirmar preço antes de alertar. Cobra de quem busca muito e vende pouco |
| Travelpayouts / Aviasales | Aceita afiliado do Brasil. Dados são cache de até 48h | Grátis, comissão de 1,1% a 1,3% | Não. Serve pra busca por orçamento com antecedência |
| Moblix (BR) | Diz cobrir Gol, LATAM, Azul e milhas | Sob consulta | A avaliar. Site fora do ar na consulta |

### Leitura do Google Voos (o que o radar usa hoje)

| Fonte | O que é | Custo | Risco |
|---|---|---|---|
| Leitura direta da página (`radar.py` atual) | Baixa o HTML e extrai os voos com expressão regular | Zero | Quebra quando o Google muda a página. Bloqueio por volume. Contra os termos do Google |
| `fli` (open source) | Chama os endpoints internos do Google Voos (`GetShoppingResults`, `GetCalendarGraph`) imitando o Chrome. Tem calendário de preços por mês | Zero | Mesmo do acima, mas mais rápido e mais estável. Limite de 10 req/s |
| `fast-flights` (open source) | Monta a URL do Google Voos e extrai os dados. Integra com Bright Data e SearchApi | Zero | Mesmo do acima. O próprio autor avisa "prepare-se pra ser bloqueado" |
| SearchApi | API paga que devolve o Google Voos em JSON | US$ 1 a US$ 4 por mil buscas, mínimo US$ 40/mês | Transfere o risco técnico pra eles. Jurídico fica com eles também |
| SerpApi | Idem | US$ 25 por mil. A partir de US$ 150/mês inclui cobertura jurídica de até US$ 2 milhões | O Google processa a SerpApi desde dez/2025. Caso aberto, sem liminar, e a SerpApi opera normalmente |

### Sites das companhias

Gol, LATAM e Azul usam Akamai Bot Manager. Em teste de 30/09/2026, LATAM e Azul bloquearam a primeira requisição fora de navegador (403). A Gol respondeu, mas plantou os cookies de detecção.

Raspar os sites das companhias está descartado. Motivos:

- Bloqueio técnico imediato.
- Risco de concorrência desleal: há precedente no TJSP (Curriculum x Catho) de condenação por extração de dados.
- Os termos de uso das companhias provavelmente proíbem (não verificado).

O que dá pra fazer com as companhias é **deep link**: um link que abre o site delas com origem, destino e data preenchidos. É legal, é o que os afiliados fazem, e é o botão "Conferir na Gol" do radar.

### Programas de afiliado (receita)

| Programa | Rede | Comissão | Exige |
|---|---|---|---|
| Gol | Awin | 2,5% por venda, validada depois do voo | CNPJ |
| Azul | Awin (também Lomadee) | 2% por venda | CNPJ. Proíbe anúncio em buscador |
| Decolar | Awin (também Lomadee) | 2,5% por venda | CNPJ. Proíbe anúncio pago em buscador |
| LATAM | Indoleads | Não pública | n/d |
| MaxMilhas | Admitad | Só sobre o valor em milhas | Aprovação |
| Aviasales | Travelpayouts | ~1,2% da passagem | Aceita PF do Brasil |
| Skyscanner | Impact | n/d | Aprovação |

123milhas segue em recuperação judicial. Não usar.

### Milhas (fase 2)

- seats.aero: cobre Smiles e Azul Fidelidade, não cobre LATAM Pass. API do plano Pro (US$ 9,99/mês) é só pra uso não comercial e só cache. Uso comercial exige acordo.
- LATAM Pass tem portal de API, mas não confirmei se serve pra buscar passagem com milhas ou só pra parceiros de acúmulo.
- Smiles e Azul Fidelidade: sem API pública.

## Decisão pra cada fase

**Fase 0 (agora, validação, sem usuários):** `fli` ou a leitura atual do `radar.py`, rodando do GitHub Actions ou de uma máquina pequena, com intervalo de 30 minutos pra voos das próximas 48 horas e 1 vez por dia pros próximos 30 dias. Custo zero. Objetivo: acumular histórico e descobrir com que frequência a queda de última hora acontece.

**Fase 1 (produto com usuários):** trocar pra SearchApi (mais barato) ou SerpApi (com cobertura jurídica). Conta de custo: 15 rotas × 2 sentidos × 48h em janelas de 30 min = 96 leituras por rota por dia = cerca de 2.900 buscas por dia, ou 87 mil por mês. Na SearchApi fica em torno de US$ 90 a US$ 350 por mês. Dá pra reduzir consultando mais devagar de madrugada.

**Fase 2:** Duffel só pra confirmar o preço no momento do alerta (poucas buscas, alta precisão). Travelpayouts pra busca por orçamento com antecedência. Avaliar Moblix pra milhas.

## Sobre "contornar" a SerpApi

Não é questão de contornar, e sim de escolher quem assume o risco. As opções são:

1. **Ler o Google Voos direto** (`fli`, `fast-flights`, `radar.py`): custo zero, risco todo seu, quebra sem aviso. Certo pra validar, errado pra produto com usuário pagante.
2. **Pagar um intermediário** (SearchApi, SerpApi): custo previsível, risco deles, estabilidade.
3. **Fonte oficial** (Duffel, Travelpayouts): sem risco, mas não cobre última hora bem.

O radar vai usar a opção 1 pra validar e a 2 pra operar. E, seja qual for a fonte, o histórico que o radar acumula é dele. Esse é o ativo que nenhum intermediário pode tirar.
