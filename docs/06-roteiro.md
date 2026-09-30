# Roteiro

## Fase 0: provar que a queda de última hora existe (4 semanas)

Custo: zero. Sem tela, sem usuário.

- [x] `coletor.py`: lê as 15 rotas nos dois sentidos (`rotas.py`) a cada 30 min pra hoje, amanhã e depois, e às 6h pros próximos 30 dias. Grava em `dados/leituras/AAAA-MM-DD/HHMM.csv.gz`, dentro do próprio repositório (sem banco externo, sem conta nova).
- [x] `analise.py`: todo dia às 7h15 monta a série de cada voo decolado, mede a queda nas últimas 48 h e escreve `relatorios/ultimo.md` com quedas ≥ 30/50/70% por rota, companhia, horário, dia da semana, quanto tempo a queda durou e as 20 maiores.
- [ ] Juntar o branch ao `main` pra as automações começarem a rodar (o GitHub só agenda no branch principal).
- [ ] Adicionar `fli` como segunda fonte, pra comparar estabilidade com a leitura direta.
- [ ] Baixar microdados de tarifas e SIROS da ANAC pra ter o "preço normal" e a oferta de assentos por rota.
- [ ] Manter o alerta pessoal SP → FLN funcionando enquanto isso (é o primeiro usuário do produto).

Critério pra seguir: quedas de 50% em pelo menos 5% dos voos em alguma rota. Se for menos de 1% em todas, o produto vira "melhor dia + pra onde ir" sem a promessa de última hora.

## Fase 1: uso pessoal e de amigos (4 a 6 semanas)

- [ ] Tela "Perguntar" e "Resultados" nos dois modos, lendo do banco da fase 0.
- [ ] Resposta 1 (melhor dia) e resposta 2 (chance de queda por estatística descritiva).
- [ ] Login por link mágico, salvar radar, alerta por e-mail.
- [ ] Deep link pro site da companhia.
- [ ] Testar com 10 pessoas que viajam com frequência. Perguntar: entendeu o número? Confiou? Comprou?

## Fase 2: abrir ao público (depois)

- [ ] Abrir CNPJ (exigido por Gol, Azul e Decolar na Awin).
- [ ] Trocar a fonte pra SearchApi ou SerpApi. Manter `fli` como reserva.
- [ ] Links de afiliado.
- [ ] Alerta por WhatsApp no plano pago, cobrança via Mercado Pago.
- [ ] Modelo de previsão (resposta 3) se a fase 0 mostrou padrão claro.
- [ ] Milhas: avaliar Moblix e seats.aero.

## O que não fazer agora

- Não fazer tela antes de ter dado.
- Não raspar site de companhia aérea.
- Não prometer preço.
- Não começar por app nativo.
- Não usar 123milhas como parceiro.

## Pendência imediata

O alerta SP → FLN, o coletor e a análise estão no branch `claude/gallant-hopper-lfkqif` e só passam a rodar quando forem juntados ao `main`.
