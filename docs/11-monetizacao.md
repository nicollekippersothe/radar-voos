# Plano de monetização

Escrito em 6/out/2026. Números marcados como (hipótese) são suposições pra você trocar; os demais vêm de fontes
citadas em `docs/08` e na conversa. Taxas de comissão mudam: confira no painel de cada programa antes de decidir.

## 1. A conta que manda em tudo

Receita por venda = valor da passagem × comissão.
- Aviasales (Travelpayouts): ~1,1% do valor, cookie de 30 dias na web. Gol (via FlexOffers): 1,12%, cookie de 8 dias.
- Passagem de R$ 800 rende cerca de **R$ 9**.

Receita por mês = visitas × % que clica em comprar × % que compra × passagem × comissão.
Exemplo com hipóteses (10 mil visitas, 15% clicam, 2% compram, R$ 800, 1,1%): 10.000 × 0,15 × 0,02 × 800 × 0,011
= **R$ 264 por mês**. Dobrar qualquer fator dobra o resultado. Conclusão: só com passagem, o projeto
precisa de público grande, ou de outras fontes de receita. O custo fixo é baixo (domínio, e hospedagem
comercial se for necessário), então a meta inicial é cobrir isso e provar que as pessoas clicam.

## 2. Camadas de receita, da mais fácil à mais difícil

| Camada | O que é | Quando | Observação |
|---|---|---|---|
| A. Passagem por afiliado | Link de compra pro Aviasales (White Label pt-BR) e, quando a Gol for a mais barata, link direto | Já | Comissão baixa, mas é o que o produto já gera |
| B. Hotel, carro, seguro | Mesmo clique, outra venda, pelo Travelpayouts ou outra rede | Mês 1 | Verificar a comissão de cada marca no painel |
| C. Cartões e milhas | Ofertas de cartão com milhas em redes brasileiras (Lomadee, Awin) | Mês 2 | Não verifiquei os valores. Costumam pagar por cadastro, não por venda |
| D. Canal de alertas | Telegram e WhatsApp com as oportunidades. Cada aviso leva um link de afiliado | Já (falta o bot) | É o canal de divulgação e de receita ao mesmo tempo |
| E. Radar Pro | Plano pago: alerta imediato por rota e valor, em vez de atrasado | Mês 3+ | Precisa de audiência e de provar que os avisos acertam |
| F. Patrocínio | Marca paga pra aparecer no canal | Com audiência | Só depois de ter número de inscritos e de cliques |
| G. Dados B2B | Relatório de preço pra agências e blogs | Depois | Cuidado: o preço do Google é lido de forma automatizada. Revenda de dado exige fonte permitida |

## 3. Fases

**Fase 0, até a primeira semana: base legal e técnica**
1. Domínio próprio e e-mail de contato.
2. Páginas de Termos e de Privacidade (LGPD). O aviso de afiliado já está nas telas.
3. White Label em português e BRL num subdomínio (hoje o clique cai numa página em inglês e dólar).
4. Hospedagem: o Vercel gratuito é de uso pessoal. Site com comissão deve ir pra um plano comercial, ou migrar pra
   a Cloudflare, que já hospeda o Worker. Confira os termos vigentes.
5. Medir cliques de saída. Rota `/ir` no Worker que registra rota, data, fonte e canal e redireciona.
6. Um `sub_id` por canal (site, Telegram, Instagram) nos links, pra saber de onde vêm as vendas.
7. Bot do Telegram ligado às oportunidades (`oportunidades.json`), com deduplicação.

**Fase 1, semanas 2 a 4: provar que clicam**
- Divulgar o canal de Telegram, e conteúdo curto com o achado do dia ("São Paulo a Cuiabá por R$ 278 hoje").
- Páginas por rota pra o Google achar ("passagem barata São Paulo Florianópolis").
- Meta: ver cliques de saída por dia e por canal. Sem isso, o resto é chute.

**Fase 2, mês 2: converter melhor**
- Mostrar o menor preço entre as fontes, com o selo de cada uma, e levar o clique pra a fonte mais barata.
- Pedir aprovação em Gol (FlexOffers), Kayak e Skyscanner (CJ), e avaliar MaxMilhas depois de checar o risco
  (houve pagamentos bloqueados por recuperação judicial em 2023).
- Testar o texto e a posição do botão "ver oferta".

**Fase 3, mês 3 em diante: ampliar**
- Camadas B e C no mesmo funil. Radar Pro e patrocínio quando o canal tiver público.

## 4. O que medir

Visitas, cliques de saída, vendas e comissão por canal e por rota. O número que decide é a receita por mil
visitas. Sem a rota `/ir` e o `sub_id`, não existe esse número.

## 5. Riscos

- **Fonte do preço.** O Google é lido de forma automatizada, e isso restringe nos termos do Google. Com o produto
  monetizado, o preço principal deve vir de fontes permitidas, e o Google ser conferência.
- **Confiança.** O preço do Aviasales é o menor visto nas últimas 48 h e pode ter mudado no clique. Mostrar sempre
  a hora da leitura e nunca prometer "garantido".
- **Comissão baixa** e cookie curto (Gol, 8 dias). Venda feita depois não conta.
- **Publicidade.** Avisar que há comissão (já avisamos) e seguir as regras de publicidade e a LGPD.
- **Alertas que erram** derrubam o canal. O registro de oportunidades mede quanto duram e quantas acertam
  antes de promover o canal em larga escala.

## 6. Decisões suas

1. Domínio e nome da marca.
2. Se o canal de alertas será gratuito no início (recomendado) e quando entra o plano pago.
3. Hospedagem comercial: plano pago do Vercel ou migrar o site pra Cloudflare.
4. Quais programas de afiliado você aceita pedir (Gol, Kayak, Skyscanner, MaxMilhas).
