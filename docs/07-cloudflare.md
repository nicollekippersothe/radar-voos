# Cloudflare: agendador, banco SQL e API

A coleta continua no GitHub Actions (funciona, e o Google responde bem de lá). A Cloudflare entra
em três coisas que o GitHub faz mal ou não faz:

| Peça | O que faz | Por que ali |
|---|---|---|
| Cron do Worker | A cada 30 min manda o GitHub rodar o coletor | O cron do GitHub atrasa horas. O da Cloudflare não |
| Banco D1 (SQLite) | Guarda os preços e responde em SQL | Consulta por trecho e data em milissegundos, sem baixar 27 mil linhas |
| API do Worker | Entrega os dados prontos pro site | O site deixa de ler CSV |

```
Cloudflare cron ──(a cada 30 min)──▶ GitHub Actions: coletor.py ──▶ CSV no repositório (arquivo)
                                              │
                                              └──▶ d1.py: só o que mudou ──▶ D1 (SQL)
Vercel (site) ◀── API do Worker ◀────────────────────────────────────────────┘
```

O CSV no repositório continua sendo o arquivo de segurança. Se o D1 cair, nada se perde, e o
site volta a ler os CSV se você tirar a variável `RADAR_API`.

## Custo e limites (plano gratuito)

Conferido na documentação da Cloudflare em 03/10/2026.

| Limite | Gratuito | O que muda no desenho |
|---|---|---|
| Escritas no D1 | 100 mil linhas por dia, e cada índice conta a mais | O banco guarda o preço só quando ele **muda**. Uso estimado: 55 a 75 mil por dia |
| Leituras no D1 | 5 milhões por dia | Cálculo pesado roda 1 vez por dia e fica salvo em tabela |
| Tamanho do banco | 500 MB | Dá mais de um ano nesse ritmo |
| CPU do Worker | 10 ms por execução | Worker só dispara e consulta. Não raspa o Google |
| Chamadas por execução | 50 | Idem: a raspagem de 90 páginas fica no GitHub |
| Agendamentos | 5 por conta | Usamos 2 |

O `d1.py` tem uma trava (`D1_LIMITE_DIARIO`, padrão 90 mil). Chegando perto, ele adia o resto pra
rodada seguinte, em vez de estourar a cota. Se um dia o ritmo passar disso, o plano pago do Workers
(US$ 5 por mês) tira o limite na prática.

## Passo a passo

Você faz tudo isso uma vez, em uns 20 minutos. Precisa de Node 20 ou mais no computador.

**1. Criar a conta.** Em https://dash.cloudflare.com/sign-up. Plano gratuito, sem cartão. (Prefere não instalar nada? Veja "Fazer pela nuvem" mais abaixo.)

**2. Instalar e entrar.**

```bash
git clone https://github.com/nicollekippersothe/radar-voos
cd radar-voos/cloudflare
npm install
npx wrangler login        # abre o navegador pra autorizar
```

**3. Criar o banco.**

```bash
npx wrangler d1 create radar
```

O comando imprime um `database_id` (uma sequência de letras e números). Copie e cole em
`cloudflare/wrangler.jsonc`, no lugar de `COLE_AQUI_O_ID_DO_BANCO`. Guarde também esse id, ele
volta no passo 8.

**4. Criar as tabelas e as visões.**

```bash
npm run esquema
```

Confira em
Cloudflare > Storage & Databases > D1 > radar > Tables: tem que aparecer `voos`, `precos`,
`queda_voo`, `curva_trecho`, `referencia`, `trechos`, `faixas` e `meta`.

**5. Criar o token do GitHub que o Worker usa pra disparar o coletor.**
GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate.

- Repository access: só `radar-voos`
- Permissions > Repository permissions > **Actions: Read and write**
- Validade: 1 ano (anote no calendário pra renovar)

Copie o token e guarde no Worker:

```bash
npx wrangler secret put GITHUB_TOKEN     # cole o token quando pedir
```

**6. Publicar o Worker.**

```bash
npm run deploy
```

Na primeira vez ele pede pra escolher um subdomínio. No fim imprime o endereço, algo como
`https://radar-voos.SEU-USUARIO.workers.dev`. Anote.

**7. Criar o token da Cloudflare que o GitHub usa pra gravar no banco.**
Cloudflare > Perfil (canto superior direito) > API Tokens > Create Token > Create Custom Token.

- Permissions: **Account** > **D1** > **Edit**
- Account Resources: Include > sua conta

Copie o token (só aparece uma vez). O **Account ID** está em Workers & Pages, na barra lateral direita.

**8. Guardar os segredos no GitHub.**
Repositório > Settings > Secrets and variables > Actions > New repository secret. Crie três:

| Nome | Valor |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | o Account ID do passo 7 |
| `CLOUDFLARE_API_TOKEN` | o token do passo 7 |
| `D1_DATABASE_ID` | o id do passo 3 |

**9. Carregar o histórico.** Repositório > Actions > "Carregar histórico no D1" > Run workflow.
Deixe o teto em 40000. Se terminar dizendo "Parou no teto de escritas", rode de novo amanhã.

**10. Primeira atualização dos resultados calculados.**

```bash
npm run materializar
```

Depois disso o cron das 6h10 faz sozinho todo dia.

**11. Conferir.**

```bash
curl https://radar-voos.SEU-USUARIO.workers.dev/api/saude
```

Tem que mostrar milhares de `voos` e `precos`. Dentro de uns 30 minutos o campo `ultima_coleta`
passa a ter data: é o sinal de que o cron da Cloudflare disparou o GitHub e o GitHub gravou no banco.

**12. Ligar o site.** Vercel > projeto > Settings > Environment Variables:

| Nome | Valor |
|---|---|
| `RADAR_API` | o endereço do passo 6, sem barra no final |

Faça Redeploy. Pra voltar aos CSV, apague a variável e faça Redeploy de novo.

**13. Desligar o remendo.** Com o `ultima_coleta` andando de 30 em 30 minutos, a rotina horária
que criei na sessão do Claude Code (`trig_01ArA6n6vUNs2ZwYbGVTyqYP`) não é mais necessária.

## Fazer pela nuvem, sem terminal no seu computador

Os passos 2, 3, 4, 6 e 10 rodam numa sessão do Claude Code na nuvem. Não precisa de Node nem de
nada instalado no seu computador. O que não dá pra fazer de lá é criar a conta, criar tokens no
painel e cadastrar segredos no GitHub. Isso fica com você, no navegador (ou com a extensão).

**No navegador, antes:**

1. Crie a conta na Cloudflare. Abra Workers & Pages uma vez: ele pede pra escolher o subdomínio
   `workers.dev`. Sem isso o primeiro deploy falha.
2. Crie um token em Perfil > API Tokens > Create Custom Token, com três permissões na sua conta:
   **Workers Scripts: Edit**, **D1: Edit** e **Account Settings: Read**. Copie o token e o Account ID.
3. Nas configurações do ambiente da sessão (menu do ambiente na barra de título, depois Edit),
   crie as variáveis `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. **Não cole o token no chat.**
   Abra uma sessão nova: o ambiente só é lido quando a sessão começa.

**A sessão nova roda (é o que ela deve executar):**

```bash
cd cloudflare && npm install
npx wrangler d1 create radar
ID=$(npx wrangler d1 list --json | python3 -c "import sys,json;print(next(d['uuid'] for d in json.load(sys.stdin) if d['name']=='radar'))")
sed -i "s/COLE_AQUI_O_ID_DO_BANCO/$ID/" wrangler.jsonc
npm run esquema
npm run deploy
npm run materializar
git add wrangler.jsonc && git commit -m "D1: id do banco" && git push
echo "database_id: $ID"
```

O `database_id` não é segredo, pode ficar no repositório.

**No navegador, depois:**

4. Worker > Settings > Variables and Secrets > Add, com **Type: Secret**, nome `GITHUB_TOKEN` e o
   token do GitHub do passo 5. Tem que ser Secret: variável comum some a cada deploy.
5. Crie os três segredos no GitHub (passo 8). Pra esses, o ideal é um segundo token da Cloudflare só com
   **D1: Edit**, porque o do deploy tem poder demais pra ficar guardado no GitHub. Depois do deploy
   você pode apagar o primeiro.
6. Rode "Carregar histórico no D1" em Actions.

## Segunda fonte (Aviasales, via Travelpayouts)

1. Crie a conta em https://www.travelpayouts.com (grátis). É a mesma conta de afiliado.
2. Em Programs, ative o Aviasales. Pegue o **API token** e o **Marker**.
3. No GitHub, crie os segredos `TRAVELPAYOUTS_TOKEN` e `TRAVELPAYOUTS_MARKER`.
4. Teste no seu computador antes de confiar:

```bash
TRAVELPAYOUTS_TOKEN=seu_token python referencia.py SAO FLN
```

Se voltar uma lista de dias e preços, a cobertura do trecho existe. Se voltar vazio, o Aviasales não
tem dado desse trecho. Voo doméstico brasileiro é a parte que mais precisa dessa conferência.

O que essa fonte é: o **menor preço que usuários do Aviasales viram nas últimas 48 h** pra cada
dia, em cache. Não é leitura ao vivo e não dá série de preço por voo. Por isso entra numa tabela
à parte (`referencia`) e serve pra conferir o Google e pra gerar link de afiliado. A comparação
está na consulta 7 de `cloudflare/consultas.sql` e na rota `/api/fontes`.

Outras fontes avaliadas e descartadas por enquanto:

| Fonte | Motivo |
|---|---|
| Skyscanner, Kayak, Decolar (raspagem) | Bloqueiam robô, proíbem nos termos e quebram a cada mudança de página |
| Sites das companhias | Mesmo problema, e cada uma é um código diferente |
| Amadeus Self-Service | Pouco conteúdo de Gol e Azul, que são o grosso do voo doméstico |
| ANAC (dados abertos) | Útil pra preço médio histórico por trecho, não pra última hora. Fica pra depois |

## SQL: o que tem no banco

`cloudflare/consultas.sql` tem 11 consultas prontas pra colar no console do D1. As principais:

| Quero saber | Consulta |
|---|---|
| Destinos mais baratos agora | 1 |
| Histórico de preço de um voo | 2 |
| Maiores quedas | 3 |
| Chance de queda por trecho, horário e companhia | 4 e 5 |
| Preço esperado por antecedência | 6 |
| Google contra a segunda fonte | 7 |
| Quanto da cota já usei hoje | 9 |

Como o banco guarda só mudanças, o preço de um voo num instante é o último registro anterior a
esse instante, e preço 0 quer dizer que o voo saiu da lista. As visões em `cloudflare/views.sql`
já fazem essa conta (`v_seg` junta cada preço ao próximo) e dão o mesmo resultado do `analise.py`
em 99,6% dos voos. Os 0,4% restantes são voos atrasados: o SQL ignora leituras depois do horário
previsto de saída.

## API do Worker

Só leitura (GET), aberta, sem dado pessoal.

| Rota | Devolve |
|---|---|
| `/api/destinos?origem=SAO&valor=500&dias=3` | O voo mais barato de cada destino |
| `/api/dias?origem=SAO&destino=FLN&diretos=0` | Menor preço por dia |
| `/api/voos?origem=SAO&destino=FLN&data=2026-10-05` | Voos de um dia, do mais barato |
| `/api/serie?id=...` | Histórico de preço de um voo |
| `/api/trecho?origem=SAO&destino=FLN&cia=Gol&faixa=noite` | Chance de queda, de quanto pra quanto e curva por antecedência |
| `/api/fontes?origem=SAO&destino=FLN` | Google ao lado da segunda fonte |
| `/api/trechos` | Trechos acompanhados |
| `/api/saude` | Contagens e hora da última coleta |

## Quando algo dá errado

| Sintoma | Causa provável |
|---|---|
| `ultima_coleta` fica vazio | `GITHUB_TOKEN` do Worker errado ou sem permissão de Actions. Veja os logs em Workers > radar-voos > Logs |
| Coletor roda mas o banco não muda | Segredos do passo 8 ausentes ou token sem permissão D1 Edit. O log do coletor mostra "D1: não sincronizou" |
| Log diz "cota do dia quase no fim" | Normal na carga inicial. O resto entra na rodada seguinte, ou no dia seguinte |
| Site mostra "Não consegui ler as leituras" | A API não respondeu. Teste `/api/saude` no navegador |
| `/api/destinos` volta vazio | `trechos` ainda vazia: rode `npm run materializar` |

## Rodar tudo no seu computador, sem gastar nada

```bash
cd cloudflare
npm run esquema:local
python ../d1.py backfill --tudo --max-escritas 1000000000 --saida historico.local.sql
npx wrangler d1 execute radar --local --file=historico.local.sql
npx wrangler d1 execute radar --local --file=materializar.sql
npx wrangler dev --local --test-scheduled
```

A API sobe em `http://localhost:8787`. Pra o site usar: `RADAR_API=http://localhost:8787 npm run dev`
dentro de `site/`. Pra testar os agendamentos:
`curl "localhost:8787/__scheduled?cron=10+9+*+*+*"` roda a atualização diária.
