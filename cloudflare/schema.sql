-- Esquema do banco do Radar de Voos (Cloudflare D1, que é SQLite).
--
-- Desenho pensado no limite gratuito do D1: 100 mil linhas escritas por dia, e
-- cada índice conta como escrita extra. Por isso o banco guarda um preço só
-- quando ele MUDA, e não uma linha por leitura. O preço de um voo num instante
-- é o último registro anterior a esse instante. Preço 0 significa que o voo
-- saiu da lista (esgotou ou o Google parou de mostrar).

CREATE TABLE IF NOT EXISTS voos (
  id           INTEGER PRIMARY KEY,   -- hash de 48 bits da chave do voo (ver d1.py)
  origem       TEXT    NOT NULL,      -- código da cidade: SAO, FLN, RIO
  destino      TEXT    NOT NULL,
  data_voo     TEXT    NOT NULL,      -- AAAA-MM-DD
  h_saida      TEXT    NOT NULL,      -- HH:MM, horário de Brasília
  h_chegada    TEXT,
  companhia    TEXT    NOT NULL,
  paradas      INTEGER NOT NULL,
  duracao_min  INTEGER,
  ultimo_preco INTEGER NOT NULL       -- preço vigente agora, 0 se saiu da lista
);
-- Um índice só, porque cada índice custa uma escrita por voo novo. É por trecho primeiro
-- e data depois: toda consulta (estado da sincronização, tela do melhor dia, destinos)
-- procura um trecho e uma faixa de datas, e assim lê só as linhas que precisa. Com a data
-- na frente, cada consulta leria o mês inteiro de todos os trechos e gastaria a cota de
-- 5 milhões de leituras por dia em poucas centenas de visitas.
CREATE INDEX IF NOT EXISTS idx_voos_trecho ON voos (origem, destino, data_voo);

-- Lista dos trechos acompanhados (~30 linhas). Permite consultar "todos os destinos de uma
-- origem" com uma busca por trecho em vez de varrer a tabela de voos.
CREATE TABLE IF NOT EXISTS trechos (
  origem  TEXT NOT NULL,
  destino TEXT NOT NULL,
  PRIMARY KEY (origem, destino)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS precos (
  voo_id  INTEGER NOT NULL,
  lido_em INTEGER NOT NULL,           -- segundos desde 1970, UTC
  preco   INTEGER NOT NULL,           -- 0 = voo saiu da lista
  PRIMARY KEY (voo_id, lido_em)
) WITHOUT ROWID;

-- Segunda fonte: o menor preço que outro buscador viu pra cada trecho e dia.
-- Não é série de preço de um voo, é uma referência pra conferir o Google.
CREATE TABLE IF NOT EXISTS referencia (
  fonte     TEXT    NOT NULL,         -- travelpayouts
  origem    TEXT    NOT NULL,
  destino   TEXT    NOT NULL,
  data_voo  TEXT    NOT NULL,
  preco     INTEGER NOT NULL,
  companhia TEXT,
  paradas   INTEGER,
  link      TEXT,
  lido_em   INTEGER NOT NULL,
  PRIMARY KEY (fonte, origem, destino, data_voo)
) WITHOUT ROWID;

-- Controle: escritas do dia (trava de cota), última sincronização.
CREATE TABLE IF NOT EXISTS meta (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
) WITHOUT ROWID;

-- Faixas de antecedência usadas na curva "quando comprar".
-- de_dias e ate_dias em dias antes da decolagem; a faixa vale de [de_dias, ate_dias).
CREATE TABLE IF NOT EXISTS faixas (
  i        INTEGER PRIMARY KEY,
  de_dias  INTEGER NOT NULL,
  ate_dias INTEGER NOT NULL,
  rotulo   TEXT    NOT NULL
);
INSERT OR REPLACE INTO faixas (i, de_dias, ate_dias, rotulo) VALUES
  (0, 0, 1,  'no dia'),
  (1, 1, 2,  '1 dia antes'),
  (2, 2, 3,  '2 dias antes'),
  (3, 3, 7,  '3 a 6 dias antes'),
  (4, 7, 14, '7 a 13 dias antes'),
  (5, 14, 31, '14 a 30 dias antes');

-- Resultados já calculados, pra API não reler a história inteira a cada requisição.
-- O Worker atualiza uma vez por dia (cron) com materializar.sql.

-- Uma linha por voo que decolou: o que aconteceu com o preço nas últimas 48 h.
CREATE TABLE IF NOT EXISTS queda_voo (
  id                INTEGER PRIMARY KEY,
  origem            TEXT    NOT NULL,
  destino           TEXT    NOT NULL,
  data_voo          TEXT    NOT NULL,
  h_saida           TEXT    NOT NULL,
  companhia         TEXT    NOT NULL,
  paradas           INTEGER NOT NULL,
  faixa             TEXT    NOT NULL,   -- madrugada, manha, tarde, noite
  partida           INTEGER NOT NULL,
  preco_ref         INTEGER NOT NULL,
  min_48h           INTEGER NOT NULL,
  queda_48h         REAL    NOT NULL,
  horas_antes_do_min REAL
);
CREATE INDEX IF NOT EXISTS idx_queda_trecho ON queda_voo (origem, destino);

-- Curva de preço por antecedência. origem = '*' e destino = '*' é a curva geral.
CREATE TABLE IF NOT EXISTS curva_trecho (
  origem   TEXT    NOT NULL,
  destino  TEXT    NOT NULL,
  i        INTEGER NOT NULL,
  rotulo   TEXT    NOT NULL,
  de_dias  INTEGER NOT NULL,
  ate_dias INTEGER NOT NULL,
  n        INTEGER NOT NULL,
  rel      REAL    NOT NULL,
  preco_medio_voo REAL NOT NULL,
  PRIMARY KEY (origem, destino, i)
) WITHOUT ROWID;
