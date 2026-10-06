# Publicar, monetizar e melhorar o rastreio

Plano em ordem de execução. Itens marcados com (você) dependem de conta ou decisão sua.

## Como a solução roda (o que "roda quando é chamada")

| Camada | Quando roda | Custo de cada execução |
|---|---|---|
| Coleta de preço do Google | Cron da Cloudflare a cada 30 min chama o GitHub Actions | Alto: 10 a 15 min na leitura de 30 dias |
| Referência do Aviasales | Junto da leitura de 30 dias, uma vez a cada 20 h | Baixo: ~60 pedidos |
| Modelo ("de quanto pra quanto", probabilidade de queda) | Uma vez por dia, 6h10 de Brasília | Médio |
| Site e API | Quando alguém abre a página. Lê o que já está no banco, com cache de 2 min | Quase zero |

Só o site e a API rodam por chamada do visitante, e só leem. Buscar preço nunca depende de visita.

## 1. Mais destinos

Basta incluir pares em `rotas.py` e o nome da cidade em `site/lib/dados.js`. O que limita:

- Tempo do coletor: a leitura de 30 dias com 30 rotas leva 10 a 15 min e o job tem teto de 20 min.
  A execução #93 foi cancelada aos 15 min por motivo não identificado. Antes de dobrar as rotas,
  dividir a leitura longa em partes (matriz no workflow) ou reduzir a janela.
- Cota do D1 gratuito (100 mil linhas escritas por dia). A leitura longa de hoje já escreveu ~25 mil.
  O plano pago da Cloudflare (a partir de US$ 5/mês) tem limites bem maiores. Confira no painel.
- Primeiro lote sugerido, saindo de SAO e RIO: Natal (NAT), Maceió (MCZ), Vitória (VIX),
  Foz do Iguaçu (IGU), Belém (BEL), Manaus (MAO). Roda em ~30 min de coleta a mais.

## 2. Tornar público

Antes de divulgar:
1. Páginas de Termos e Privacidade (LGPD) e um e-mail de contato. Já há o aviso de afiliado e o aviso de preço.
2. Domínio próprio (você).
3. Vercel: o plano Hobby é de uso pessoal e não comercial. Site que ganha comissão deve ir pro Pro
   (US$ 20/mês). Confira os termos vigentes.
4. Medir cliques de saída. Criar uma rota `/ir` no Worker que registra o clique (rota, data, fonte, canal)
   e redireciona. Sem isso não dá pra saber o que converte.
5. Risco do Google: a leitura é automatizada e os termos do Google restringem isso. Pra uso pessoal e volume
   baixo é tolerável. Com o produto monetizado, diminuir a dependência: o Google vira conferência e o preço
   principal vem de fonte com acesso permitido (Aviasales e as que entrarem).

## 3. Monetizar, em camadas

1. Afiliado de passagem: Aviasales (ligado, ~1,1% do valor, confirme no painel). Pedir aprovação no
   Kayak e no Skyscanner (via CJ) e comparar a comissão real.
2. Outros produtos no mesmo funil: hotel, aluguel de carro e seguro viagem (Travelpayouts tem marcas de cada).
3. Alerta: canal de Telegram e de WhatsApp com as oportunidades, cada uma com link de afiliado.
4. Depois, com público: alertas personalizados por rota num plano pago.

Atribuição: o Travelpayouts aceita um identificador por link (sub_id). Usar um por canal
(site, Telegram, Instagram) pra saber de onde vêm as vendas.

## 4. Divulgação

- Páginas por rota geradas do banco ("passagem barata São Paulo Florianópolis"), pro Google achar.
- Telegram automático pós-coleta, com deduplicação.
- Vídeo curto com o achado do dia ("São Paulo a Cuiabá por R$ 260 hoje").

## 5. Rastreio de dados e SQL

O SQL já é o centro do projeto: série de preço por voo, tabela de quedas, curva por antecedência.
O que acrescentar:

- Guardar o histórico do Aviasales. Hoje a tabela `referencia` é sobrescrita a cada leitura
  (`INSERT OR REPLACE`). Criar `referencia_hist` com um registro por dia.
- Registrar cada oportunidade emitida e o que aconteceu depois (preço 6 h e 24 h depois, se o voo sumiu
  da lista). Isso calibra o modelo e dá credibilidade ("acertamos X% das oportunidades").
- Sumiço do voo como sinal de escassez (pode indicar que esgotou). Medir antes de usar.
- Saúde dos dados: cobertura por rota, falhas por execução e alerta quando o coletor falhar.
- Consultas novas: mínimo histórico de 30 e 90 dias por rota, preço contra a mediana do dia da semana,
  volatilidade por rota.

## 6. Oportunidade imperdível, de forma confiável

Regra objetiva, pra não publicar erro de leitura:
- Preço no máximo no 20º percentil da própria rota e faixa de antecedência, e pelo menos 30% abaixo da mediana.
- Confirmado em duas leituras seguidas (30 min de intervalo).
- Conferido contra o Aviasales: se estiver até 15% de diferença, selo de confiança alta.
- Mostrar a hora da leitura e remover o aviso quando o preço sair da lista.
- Preço abaixo de 50% da mediana vai como "confira antes", não como garantia.

## 7. APIs públicas de afiliado

Pelo que confirmei, a única fonte de preço aberta a pessoa física é a API de dados do Travelpayouts.
Kiwi (Tequila) fechou o acesso aberto em 2024. Skyscanner e Kayak têm afiliado (links), mas API de preço
costuma exigir parceria comercial. Amadeus Self-Service tem pouca cobertura de Gol e Azul. Redes como
CJ, Awin e Lomadee dão link e relatório, não preço de passagem.
