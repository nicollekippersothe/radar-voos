# Benchmark

Pesquisa feita em 30/09/2026. Cada linha diz o que o produto faz hoje, como ganha dinheiro e o que falta pra atender o caso do radar (orçamento + janela de datas + última hora + Brasil doméstico).

## Quadro geral

| Produto | Foco | Receita | Previsão? | Busca por orçamento? | Última hora? | Brasil doméstico? |
|---|---|---|---|---|---|---|
| Google Voos | Busca ampla | Anúncios e links | "Preço baixo, típico ou alto" com histórico. Sem "comprar ou esperar" | Sim, no Explorar, com controle de preço máximo | Não tem foco | Sim, com preço em cache |
| Skyscanner | Busca ampla | Metabusca, afiliados | Não | "Qualquer lugar" e "mês mais barato", sem valor máximo como entrada principal | Categoria "Last Minute" no Explorar, rasa | Sim |
| Kayak | Busca ampla | Metabusca | Price Forecast, só nos EUA e Reino Unido | Explorar com controle de orçamento | Não | Sim, sem previsão |
| Hopper | Previsão e venda | Venda + produtos financeiros (congelar preço, seguro), ~40% da receita | Sim. Diz acertar 95%, número próprio, sem verificação independente | Não encontrado | Bom pra curto prazo, segundo terceiros | Só via Nu Viagens ou app em inglês cobrando em dólar |
| Kiwi.com | OTA | Venda | Não | "Anywhere" e Nomad (multi-cidades) | Não | Parcial |
| Going, Dollar Flight Club, Jack's Flight Club | Clube de ofertas | Assinatura, US$ 49 a 199 por ano | Não | Não | Não | Não, foco em saídas dos EUA e Reino Unido |
| Skiplagged | Tarifa "hidden city" | Taxa por reserva (~US$ 10 ou 10%) | Não | Não | Não | Não encontrado |
| Melhores Destinos | Ofertas curadas | Afiliados e cupons | Não | Não | Não, ofertas são pra viagens futuras | Sim |
| Passagens Imperdíveis, PromoPassagens, Passageiro de Primeira, Estevam Pelo Mundo, Safe Milhas | Grupos de alerta (Telegram, WhatsApp) | Afiliados, grátis pro usuário | Não | Não | Não | Sim |
| Voopter, Vai de Promo | Metabusca brasileira | Afiliados | Não | Não | Não | Sim |
| Azul "Buscador de Preços" | Busca por orçamento | Venda própria | Não | Sim, em reais ou pontos | Não | Só Azul |
| Smiles "Explorar o mundo" | Busca por milhas | Venda própria | Não | Sim, em milhas | Não | Só Gol |
| MaxMilhas, 123milhas | Milhas | Venda | Não | Não | Não | Em recuperação judicial. Não usar |

## O que cada um faz bem

- **Google Voos** tem a melhor interface de calendário e o "Preço baixo / típico / alto" educa o usuário sobre o normal da rota. É a referência de clareza.
- **Hopper** provou que gente paga por previsão e por "congelar o preço". A receita de produtos financeiros é maior que a comissão de venda. Isso mostra que a inteligência vale mais que a intermediação.
- **Kayak Explore** e **Skyscanner "Qualquer lugar"** provaram a busca aberta por destino. Mas partem de um mapa, não de um orçamento e uma janela de datas.
- **Going** e os clubes de oferta provaram assinatura anual por alerta (US$ 49 a 199), com curadoria humana.
- **Melhores Destinos** e os grupos de Telegram são o hábito atual do brasileiro: gratuito, manual, com muita oferta que não serve pra você.
- **Azul Buscador de Preços** é o mais perto do "pra onde vou com R$ X" no Brasil, mas só olha a Azul.

## O que ninguém faz (as lacunas)

1. **Previsão em português, em reais, pro doméstico.** O Kayak só prevê nos EUA e no Reino Unido. O Hopper chega ao Brasil de forma indireta. Nenhum produto brasileiro tem "comprar ou esperar".
2. **Última hora no doméstico brasileiro.** Não existe. As companhias vendem antecipação de voo (Gol R$ 100, Azul R$ 150), o que é outra coisa. As promoções-relâmpago (MadruGOL, Anoiteceu Azul, Happy Hour LATAM) são pra viagens futuras. Os grupos de alerta também.
3. **Orçamento + janela + todas as companhias.** A busca por orçamento existe partida: Azul em reais ou pontos, Smiles em milhas, Google e Kayak em reais sem milhas. Ninguém junta Gol, Azul e LATAM com "sair hoje, amanhã ou até terça".
4. **Linha de base de "preço justo" por rota usando dados públicos.** A ANAC publica tarifa média por rota e mês de venda, ocupação por rota e mês, e a malha diária com assentos por voo (SIROS). Ninguém mostra isso ao consumidor. Dá pra dizer "essa rota tem 14 voos hoje com 2.100 assentos e ocupação média de 78% em setembro", o que ajuda a explicar por que o preço pode cair.
5. **Alerta personalizado pago no Brasil.** Os grupos são grátis e genéricos. O modelo de assinatura dos clubes americanos não existe aqui. Fica a pergunta se o brasileiro paga por alerta filtrado por rota, valor e janela curta. O radar vai descobrir.

## Dados públicos da ANAC que entram no radar

| Base | O que tem | Granularidade | Atraso | Uso no radar |
|---|---|---|---|---|
| Microdados de tarifas comercializadas | Empresa, par de aeroportos, cabine, valor da tarifa, assentos vendidos, mês da venda | Mensal, por rota e valor | ~3 semanas | "Preço normal" da rota e distribuição de tarifas (quantos assentos foram vendidos a R$ 300 em SP → FLN em agosto) |
| Dados Estatísticos | Assentos, passageiros, ocupação, por empresa e rota | Mensal | ~1 mês | Ocupação média da rota por mês. Rota com ocupação baixa tem mais chance de queda |
| SIROS (malha) | Empresa, número do voo, equipamento, assentos, horários, dias da semana | Por voo, até 365 dias à frente | Atualização diária | Quantos voos e assentos existem em cada dia da rota (pressão de oferta). Também dá o número do voo pra chavear o histórico |
| VRA | Voos realizados e cancelados, horários previstos e reais | Por voo | ~1 mês | Cancelamentos e remarcações que liberam assento. Só serve pra análise histórica |

Limitação importante: nenhuma base da ANAC tem a data do voo junto com a antecedência da compra. O comportamento do preço nas últimas 48 horas só vai existir no histórico do radar. É por isso que ele é o ativo.

Download: microdados e estatísticas em CSV no portal da ANAC (`sas.anac.gov.br/sas/downloads`), SIROS em `siros.anac.gov.br/siros/registros/` (tem export CSV e uma API não documentada com `/api/voos` e `/api/voosPeriodo`), VRA em `siros.anac.gov.br/siros/registros/diversos/vra/`.

## Ferramentas de raspagem que não são "API de voos"

Pra quem esqueceu o nome: as alternativas mais citadas são Apify, Bright Data, Firecrawl, Browserless, ScrapingBee, Zyte e Crawlee com Playwright.

| Ferramenta | O que é | Preço de entrada | Tem algo pronto pro Google Voos? |
|---|---|---|---|
| Apify | Loja de raspadores ("actors") prontos, rodando na nuvem deles | Grátis com US$ 5 de uso por mês; Starter US$ 19 | Sim, vários de terceiros, de US$ 0,12 a US$ 10 por mil resultados |
| Bright Data | Proxies e APIs de raspagem | 5 mil registros grátis por mês; depois US$ 1,50 por mil | Sim, "Google Flights Scraper API" pronto |
| Firecrawl | Raspagem pensada pra alimentar modelos de linguagem | US$ 19 por mês | Não |
| Browserless | Navegador Chrome hospedado | Grátis até 1 mil unidades; US$ 25 por mês | Não |
| ScrapingBee | API que renderiza a página e devolve o HTML | US$ 49 por mês | Página de exemplo. A própria ScrapingBee avisa que raspar o Google Voos viola os termos do Google |
| Zyte | API de raspagem com proxy e navegador | US$ 0,13 a US$ 16 por mil requisições | Não |
| Crawlee + Playwright | Bibliotecas gratuitas pra escrever o próprio raspador | Só a sua infraestrutura | Não. Você escreve |

Onde cada uma entra:

- **Apify e Bright Data** são as alternativas diretas à SerpApi e à SearchApi. Bright Data tem 5 mil registros grátis por mês, o que cobre boa parte da fase de validação sem custo. Apify tem preço parecido com a SearchApi.
- **Browserless e Playwright** servem se em algum momento for preciso um navegador de verdade (ex.: pra deep link que precise de renderização). Não são fontes de dados.
- **Firecrawl, ScrapingBee e Zyte** não trazem nada específico pra voos. Só valem se o radar for ler páginas genéricas (ex.: páginas de promoção das companhias, que são públicas e não têm proteção anti-robô como as de busca).

Decisão: pra fase 0, `fli` (grátis) com Bright Data como reserva (5 mil grátis). Pra produto, SearchApi ou Bright Data por custo, SerpApi se a cobertura jurídica pesar mais.

## Onde o radar fica

Cruzando as lacunas com as fontes:

| Função | Quem faz hoje | Radar |
|---|---|---|
| "Pra onde vou com R$ 500 entre sábado e terça" | Ninguém junta as três companhias com janela de datas | Modo "Pra onde ir" |
| "Qual dia é mais barato pra voltar" | Google Voos no calendário, sem previsão | Modo "Melhor dia" com histórico |
| "Esse voo pode cair pra R$ 300 até de noite?" | Ninguém no Brasil | Chance de queda com amostra |
| "Me avisa quando cair" | Grupos genéricos, Google Voos por rota | Alerta por rota, valor e janela, com WhatsApp |
| "Por que está caro / barato" | Google Voos ("típico") | Preço normal da ANAC + oferta do dia pelo SIROS |
