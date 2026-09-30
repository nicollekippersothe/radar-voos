# Produto e UX

## Princípio

Uma pergunta, uma resposta. A pessoa não preenche formulário de busca. Ela diz o que tem (origem, dinheiro, janela) e o radar devolve o que dá pra fazer com isso.

## Login

Sem senha. Código por WhatsApp ou link mágico por e-mail (Supabase Auth faz os dois). Pra um app que a pessoa abre de vez em quando, senha é o motivo número um de abandono.

O login só é exigido pra salvar radar e receber alerta. Buscar é livre, pra que o link de um resultado possa ser compartilhado em grupo de Telegram e trazer gente nova.

## As três telas

### Tela 1: Perguntar

Uma frase editável, com cada parte clicável:

> Saindo de **São Paulo**, com até **R$ 500**, entre **sábado** e **terça**, pra **qualquer lugar**.

- **Origem:** cidade ou aeroporto. "São Paulo" cobre GRU, CGH e VCP.
- **Valor:** campo numérico com atalhos (R$ 300, 500, 800, 1.200).
- **Janela:** "hoje", "amanhã", "essa semana", "fim de semana", "próximos 10 dias" ou duas datas no calendário.
- **Destino:** "qualquer lugar" por padrão, ou uma cidade.

Dois modos, trocados por uma aba:

- **Pra onde ir:** destino aberto, resposta é lista de destinos.
- **Melhor dia:** destino fixo, resposta é comparação por dia.

Botão único: "Ver opções".

### Tela 2: Resultados

**Modo "Pra onde ir":** cartões ordenados por "quanto vale a pena" (preço em relação ao normal da rota), não só por preço.

```
Recife                             R$ 576
sáb 03/10 · Gol · direto · 3h10
sai 16:55, chega 20:05
▼ 38% abaixo do normal dessa rota
Menor já visto: R$ 412 (12 vezes em 60 dias)

[Ver na Gol]   [Vigiar essa rota]
```

Cada cartão tem: destino, preço, dia e horário, companhia, direto ou com parada, comparação com o normal, menor preço já visto, e dois botões.

Filtros rápidos no topo: só diretos, só de manhã, sem chegada de madrugada, capitais, praia.

**Modo "Melhor dia":** uma barra por dia da janela, com o menor preço. A mais baixa é destacada. Abaixo, a lista de voos do dia escolhido.

```
sáb 03  ████████████  R$ 1.338
dom 04  ██████████    R$ 1.237  ← mais barato
seg 05  ██████████    R$ 1.237
ter 06  ███████████   R$ 1.340

Nos últimos 8 domingos, esse trecho chegou a R$ 890 no dia.
Chance de cair abaixo de R$ 1.000 até domingo: 4 em 8.
```

### Tela 3: Radar (voo ou rota vigiada)

Gráfico de linha do preço ao longo do tempo, com o limite do usuário marcado. Embaixo:

- **Agora:** R$ 1.237, lido às 17:45
- **Menor visto:** R$ 890, há 12 dias
- **Chance de cair abaixo do seu limite:** 4 em 8 voos parecidos (50%)
- **Recomendação:** "Espere até sexta à tarde. Se não cair, compre." Sempre com o motivo em uma linha.

Botões: "Ver na companhia", "Mudar limite", "Parar de vigiar".

## Alerta

Chega por e-mail (grátis) ou WhatsApp (pago). Texto curto, com preço, horário de leitura e link direto:

> SP → Floripa caiu pra R$ 390 (Gol, hoje 21:10, direto). Estava R$ 1.240 há 2 h. Preço lido às 15:32, confira antes de comprar: [link]

O link é deep link pro site da companhia com origem, destino e data preenchidos, ou link de afiliado quando existir.

Regra: no máximo 1 alerta por radar a cada 2 horas, exceto se o preço cair ainda mais.

## Linguagem

- Sempre em português, sem termo técnico. "Direto", não "non-stop". "Com parada", não "com conexão" (o público leigo entende melhor).
- Preço sempre inteiro, em reais, sem centavos.
- Nunca "garantido", "vai cair", "imperdível". Sempre "caiu em 7 de 10 vezes", "menor já visto", "lido às".
- Todo número de previsão vem com a amostra.

## Formato de entrega

Aplicativo web instalável no celular (PWA), feito com Next.js na Vercel. Loja de aplicativos só depois de validar. O público é de celular, então tudo é desenhado primeiro pra tela pequena.

## Tecnologia

- Interface: Next.js, Tailwind.
- Banco, login e tarefas agendadas: Supabase (Postgres, Auth, pg_cron ou Edge Functions).
- Coletor: Python (evolução do `radar.py`), rodando no GitHub Actions na validação e num servidor pequeno (Fly.io, Railway ou VPS) depois.
- Alerta por WhatsApp: API oficial do WhatsApp Business (cobra por mensagem) ou Evolution API com número próprio (mais barato, mais frágil).
- Cobrança: Mercado Pago (fase 2).

## Aviso legal fixo no rodapé

"O radar mostra preços lidos em buscadores e sites públicos, com horário de leitura. Os preços mudam a qualquer momento e a compra é feita no site da companhia ou agência. O radar não vende passagens e pode receber comissão de parceiros."
