# Radar de voos

Procura passagens baratas no Google Voos e avisa por issue quando aparece alguma abaixo do limite. É o primeiro passo de um produto maior: um radar de passagens de última hora no Brasil. A visão, as fontes de dados, o modelo de previsão, o benchmark e o roteiro estão em `docs/`:

- `docs/01-visao.md`: o problema, o público e os diferenciais
- `docs/02-fontes-de-dados.md`: APIs, raspagem, afiliados, o que serve e o que não serve
- `docs/03-modelo-de-previsao.md`: o que coletar e como responder "melhor dia", "chance de queda" e "comprar ou esperar"
- `docs/04-benchmark.md`: Skyscanner, Hopper, Google Voos, grupos brasileiros, dados da ANAC e ferramentas de raspagem
- `docs/05-produto-e-ux.md`: telas, login, alerta e linguagem
- `docs/06-roteiro.md`: fases e o que não fazer agora

Hoje ele vigia **São Paulo (GRU, CGH e VCP) → Florianópolis**, só ida, nos próximos 14 dias, com limite de **R$ 500**. A busca roda sozinha a cada 3 horas pelo GitHub Actions.

## Coletor de padrões (fase 0)

Além do alerta, o repositório coleta o preço de cada voo de 15 rotas nos dois sentidos (`rotas.py`) a cada 30 minutos, pra descobrir com que frequência, onde e quando o preço cai perto da partida. Não usa banco externo: cada leitura vira um arquivo em `dados/leituras/AAAA-MM-DD/HHMM.csv.gz`, gravado pela própria Action.

Todo dia às 7h15, `analise.py` monta a série de preço de cada voo já decolado, mede a queda nas últimas 48 horas e escreve `relatorios/ultimo.md`: quedas de 30%, 50% e 70% por rota, companhia, horário, dia da semana, quanto tempo a queda durou e as 20 maiores. Esse relatório é o que decide se existe produto de última hora (ver `docs/06-roteiro.md`).

Pra rodar na mão:

```sh
python3 coletor.py                       # todas as rotas
ROTAS=SAO-FLN,FLN-SAO python3 coletor.py # só um trecho
python3 analise.py                       # gera relatorios/ultimo.md
```

## Site (Vercel)

A pasta `site/` tem a interface: "Pra onde ir" (origem, valor máximo e janela de dias), "Melhor dia" (menor preço por dia de um trecho) e "Padrões" (o relatório da análise). Ela lê os arquivos `dados/ultimo.csv.gz`, `dados/ultimo-30d.csv.gz` e `relatorios/ultimo.md` direto do GitHub, sem banco.

Pra publicar: em vercel.com, **Add New → Project**, importe este repositório e, em **Root Directory**, escolha `site`. Os commits automáticos do coletor usam a identidade da dona do repositório (o plano Hobby da Vercel bloqueia deploy de commit de outro autor), e o `site/vercel.json` pula o build quando o commit só altera dados. Não precisa de variável de ambiente se o branch de produção for `main`. Pra testar outro branch, crie a variável `RADAR_RAMO` com o nome do branch. Opcional: `GITHUB_TOKEN` (um token de leitura do GitHub) sobe o limite da API de 60 pra 5.000 pedidos por hora, caso o endereço raw falhe.

Pra rodar local:

```sh
cd site && npm install
RADAR_LOCAL=.. npm run dev   # lê os arquivos do disco em vez do GitHub
```

## Como o aviso chega

Quando acha voo no limite, o radar abre uma issue com o label `alerta-sao-fln`. O GitHub manda e-mail pra quem acompanha o repositório (o dono acompanha por padrão). Enquanto a issue estiver aberta, voos novos entram como comentário, sem repetir os que já foram avisados. Feche a issue pra zerar o alerta.

## Rodar na mão

Pelo GitHub: aba **Actions** → **Radar de voos** → **Run workflow**. Dá pra trocar o preço e a quantidade de dias.

No terminal (só imprime, não abre issue):

```sh
PRECO_MAX=800 DIAS=7 python3 radar.py
```

## Trocar o trecho

Edite `ORIGEM` e `DESTINO` em `.github/workflows/radar.yml` com os códigos IATA (ex.: `SAO`, `FLN`, `RIO`, `POA`). Para vigiar mais de um trecho, copie o job `sp-floripa` e mude os códigos.

## Banco SQL, agendador e segunda fonte (Cloudflare)

O coletor grava os CSV no repositório e, se os segredos da Cloudflare existirem, também sincroniza
um banco D1 (SQLite) só com o que mudou. Um Worker da Cloudflare dispara o coletor a cada 30 min
(o cron do GitHub atrasa), atualiza os resultados calculados uma vez por dia e serve uma API de
leitura pro site. Tudo é opcional: sem os segredos, o projeto funciona como antes.

- Passo a passo, limites do plano gratuito e solução de problemas: [`docs/07-cloudflare.md`](docs/07-cloudflare.md)
- Esquema, visões e consultas prontas: `cloudflare/schema.sql`, `cloudflare/views.sql`, `cloudflare/consultas.sql`
- Sincronização com o banco e carga do histórico: `d1.py`
- Segunda fonte de preço (Aviasales, via Travelpayouts): `referencia.py`
- No site, a variável `RADAR_API` liga a leitura pela API. Sem ela, o site lê os CSV.

## Limitações

- Os dados vêm da página pública do Google Voos, lida sem navegador. Se o Google mudar o formato da página, a Action falha e o GitHub avisa por e-mail.
- A consulta sai de servidores do GitHub fora do Brasil. O preço pode diferir um pouco do que aparece no app. Confira antes de comprar.
- O GitHub pausa Actions agendadas em repositórios sem nenhuma atividade por 60 dias. Se isso acontecer, é só reativar na aba Actions.
