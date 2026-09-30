# Roteiro

## Fase 0: provar que a queda de última hora existe (4 semanas)

Custo: zero. Sem tela, sem usuário.

- [ ] Evoluir o `radar.py` pra coletor: guardar cada leitura no Supabase (tabela `leituras`) em vez de só comparar com o limite.
- [ ] Adicionar `fli` como segunda fonte, pra comparar estabilidade com a leitura direta.
- [ ] Rodar 15 rotas (lista em `03-modelo-de-previsao.md`) com intervalo de 30 min pra voos das próximas 48 h e 1 vez por dia pros próximos 30 dias.
- [ ] No fim de cada semana, gerar um relatório automático: quedas ≥ 30%, 50% e 70% por rota, horário, companhia e duração da queda.
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

O alerta SP → FLN (R$ 500, 14 dias, a cada 3 h) está no branch `claude/gallant-hopper-lfkqif` e só passa a rodar quando for juntado ao `main`.
