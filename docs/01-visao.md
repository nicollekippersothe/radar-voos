# Visão do produto

## Uma frase

Radar de passagens de última hora no Brasil: você diz de onde sai, quanto pode gastar e uma janela de datas, e ele responde pra onde dá pra ir, qual dia tende a ser mais barato e se vale esperar uma queda no mesmo dia.

## O problema

Buscadores como Skyscanner e Google Voos foram feitos pra quem já sabe o destino e a data. Quem tem flexibilidade (nômade digital, freelancer, quem trabalha remoto, quem visita família) faz outra pergunta:

- "Tenho R$ 500 e essa semana livre. Pra onde dá pra ir?"
- "Preciso voltar pra Floripa depois de sábado, mas pode ser domingo, segunda ou terça. Qual dia vai estar mais barato?"
- "Tá caro hoje. Tem chance de cair se eu esperar até de tarde?"

Nenhuma ferramenta do mercado responde as três juntas, e nenhuma olha com atenção a janela de 48 horas antes do voo, onde acontecem as quedas pontuais (o caso real que motivou o projeto: Gol FLN → SP por R$ 300 no mesmo dia, enquanto os buscadores mostravam mais de R$ 1.000).

## Pra quem

Público principal: nômades digitais e trabalhadores remotos no Brasil, que viajam sozinhos ou em dupla, sem data fixa, sensíveis a preço, e que já usam Telegram, WhatsApp e grupos de promoção.

Público secundário: quem visita família com frequência no mesmo trecho (ex.: SP ↔ Floripa toda semana) e quem viaja a trabalho por conta própria.

## Posicionamento

**Ferramenta de inteligência, não loja.** O radar não vende passagem. Ele mostra o preço, a tendência e a chance de queda, e leva a pessoa pro site da companhia ou de uma agência parceira pra comprar. Isso é importante por três motivos:

1. Jurídico: não intermediar a venda reduz responsabilidade sobre a transação.
2. Confiança: a pessoa confere o preço final na companhia, e o radar sempre avisa que o preço pode mudar.
3. Receita: comissão de afiliado no começo, assinatura depois.

## Os três diferenciais

### 1. Busca por orçamento e janela, não por destino

Entrada: origem, valor máximo, intervalo de datas (ou "hoje", "essa semana", "próximos 10 dias"). Saída: lista de destinos que cabem, ordenada por "quanto vale a pena", com o melhor dia dentro da janela.

### 2. Vigilância de última hora

Pra voos que saem nas próximas 48 horas, o radar consulta com frequência alta (a cada 15 ou 30 minutos) e guarda cada leitura. É assim que se pega uma queda que dura duas horas. O Skyscanner varre o mundo inteiro, mas de forma rasa. O radar varre poucas rotas brasileiras, mas fundo.

### 3. Previsão com dados próprios

Com histórico de leituras, o radar responde:

- "Qual o melhor dia pra voltar entre sábado e terça?" (ex. real de 30/09: SP → FLN direto custava R$ 2.384 hoje, R$ 1.338 sábado e R$ 1.237 domingo e segunda)
- "Esse voo tem chance de cair até R$ X?" com uma probabilidade e o menor preço já visto
- "Compre agora ou espere?" com base no comportamento passado da rota naquela antecedência

Ninguém publica como o preço se comporta nas últimas horas antes do voo no doméstico brasileiro. Esse histórico é o patrimônio do projeto. Quanto mais tempo coletando, mais difícil de copiar.

## O que o radar não é

- Não é buscador de todos os voos do mundo.
- Não é agência: não emite passagem, não cuida de reembolso.
- Não promete preço: todo alerta diz "preço visto às 14:32, confira na companhia".
- Não usa milhas na primeira versão (fica pra depois, e é um diferencial forte no Brasil).

## Regras de honestidade com o usuário

- Toda previsão vem com o tamanho da amostra ("baseado em 23 voos nessa rota nos últimos 60 dias").
- Se a amostra é pequena, o radar diz que não sabe em vez de chutar.
- O preço mostrado tem horário de leitura e fonte.
- Nunca dizer "garantido" ou "vai cair". Dizer "caiu em 7 de 10 vezes".

## Receita

Fase 1: afiliados. Gol (2,5% via Awin), Azul (2% via Awin), Decolar (2,5% via Awin). Todos exigem CNPJ. Rende pouco por passagem (uns R$ 10 em R$ 400), então depende de volume.

Fase 2: assinatura via Mercado Pago. Grátis: 1 radar, aviso por e-mail. Pago: radares ilimitados, aviso por WhatsApp, previsão de queda, histórico. A promessa "te aviso da passagem de R$ 300" justifica cobrar.

## Nome

"Radar de Voos" é o nome de trabalho. Vale pensar em algo próprio antes de publicar.
