-- Visões de análise. Reaplicar este arquivo é seguro (apaga e recria as visões).
-- Tudo em segundos desde 1970, UTC. Brasília é UTC-3, daí o +10800.

DROP VIEW IF EXISTS v_curva_tudo;
DROP VIEW IF EXISTS v_base_trecho;
DROP VIEW IF EXISTS v_curva_geral;
DROP VIEW IF EXISTS v_curva_trecho;
DROP VIEW IF EXISTS v_curva_voo;
DROP VIEW IF EXISTS v_queda_voo;
DROP VIEW IF EXISTS v_seg;
DROP VIEW IF EXISTS v_voo;

-- Voo com o instante da partida.
CREATE VIEW v_voo AS
SELECT id, origem, destino, data_voo, h_saida, h_chegada, companhia, paradas,
       duracao_min, ultimo_preco,
       CAST(strftime('%s', data_voo || ' ' || h_saida || ':00') AS INTEGER) + 10800 AS partida
FROM voos;

-- Segmentos: cada registro de preço vale até o registro seguinte do mesmo voo.
-- O último segmento fica com prox NULL (vale até a partida ou até agora).
-- Feito com subconsulta correlacionada, e não com LEAD(), de propósito: a subconsulta
-- usa a chave primária (voo_id, lido_em) e deixa o SQLite filtrar por voo antes de
-- calcular, enquanto uma janela força ler a tabela inteira a cada consulta.
CREATE VIEW v_seg AS
SELECT p.voo_id, p.lido_em AS ini, p.preco,
       (SELECT MIN(q.lido_em) FROM precos q WHERE q.voo_id = p.voo_id AND q.lido_em > p.lido_em) AS prox
FROM precos p;

-- Uma linha por voo que já decolou e tinha preço nas últimas 48 h.
--   preco_ref  menor preço entre 7 dias e 48 h antes (ou o primeiro das 48 h)
--   min_48h    menor preço nas últimas 48 h
--   queda_48h  1 - min_48h / preco_ref
-- É o mesmo critério do analise.py, só que sobre segmentos em vez de leituras.
CREATE VIEW v_queda_voo AS
WITH s AS (
  SELECT v.id, v.origem, v.destino, v.companhia, v.h_saida, v.paradas, v.data_voo, v.partida,
         g.ini, COALESCE(g.prox, v.partida) AS fim, g.preco
  FROM v_voo v
  JOIN v_seg g ON g.voo_id = v.id
  WHERE g.preco > 0
    AND v.partida <= CAST(strftime('%s', 'now') AS INTEGER)
),
u48 AS (  -- segmentos que tocam as últimas 48 h
  SELECT * FROM s WHERE fim > partida - 172800 AND ini < partida
),
ref AS (  -- segmentos que tocam a janela de 7 dias a 48 h antes
  SELECT id, MIN(preco) AS preco_ref
  FROM s
  WHERE ini < partida - 172800 AND fim > partida - 604800
  GROUP BY id
),
mn AS (
  SELECT id, MIN(preco) AS min_48h FROM u48 GROUP BY id
)
SELECT v.id, v.origem, v.destino, v.data_voo, v.h_saida, v.companhia, v.paradas, v.partida,
       COALESCE(ref.preco_ref,
                (SELECT x.preco FROM u48 x WHERE x.id = v.id ORDER BY x.ini LIMIT 1)) AS preco_ref,
       mn.min_48h,
       1.0 - 1.0 * mn.min_48h / COALESCE(ref.preco_ref,
                (SELECT x.preco FROM u48 x WHERE x.id = v.id ORDER BY x.ini LIMIT 1)) AS queda_48h,
       ROUND((v.partida - MAX(
         (SELECT x.ini FROM u48 x WHERE x.id = v.id AND x.preco = mn.min_48h ORDER BY x.ini LIMIT 1),
         v.partida - 172800)) / 3600.0, 1) AS horas_antes_do_min
FROM v_voo v
JOIN mn  ON mn.id  = v.id
LEFT JOIN ref ON ref.id = v.id;

-- Preço médio de cada voo em cada faixa de antecedência, ponderado pelo tempo em
-- que o preço ficou vigente. Ponderar pelo tempo (e não contar leituras) evita que
-- a faixa lida a cada 30 min pareça mais barata só por ter mais amostras.
-- rel = preço médio na faixa / preço médio do voo todo.
CREATE VIEW v_curva_voo AS
WITH s AS (
  SELECT v.id, v.origem, v.destino, v.partida, g.ini, g.preco,
         MIN(COALESCE(g.prox, MIN(v.partida, CAST(strftime('%s','now') AS INTEGER))),
             v.partida) AS fim
  FROM v_voo v JOIN v_seg g ON g.voo_id = v.id
  WHERE g.preco > 0 AND g.ini < v.partida
    -- Só os últimos 60 dias: sem esse teto, a conta diária leria o histórico inteiro e
    -- gastaria cada vez mais da cota de leituras conforme o banco cresce.
    AND v.data_voo >= date('now', '-60 days')
),
tot AS (
  SELECT id, SUM(preco * (fim - ini)) * 1.0 / SUM(fim - ini) AS media
  FROM s WHERE fim > ini GROUP BY id
),
fx AS (
  SELECT s.id, s.origem, s.destino, f.i,
         SUM(s.preco * MAX(0, MIN(s.fim, s.partida - f.de_dias * 86400)
                          - MAX(s.ini, s.partida - f.ate_dias * 86400))) * 1.0
         / NULLIF(SUM(MAX(0, MIN(s.fim, s.partida - f.de_dias * 86400)
                          - MAX(s.ini, s.partida - f.ate_dias * 86400))), 0) AS media_faixa
  FROM s CROSS JOIN faixas f
  GROUP BY s.id, f.i
)
SELECT fx.id, fx.origem, fx.destino, fx.i, fx.media_faixa, tot.media,
       fx.media_faixa / tot.media AS rel
FROM fx JOIN tot ON tot.id = fx.id
WHERE fx.media_faixa IS NOT NULL;

-- Curva por trecho e curva geral numa consulta só, pra calcular v_curva_voo uma vez
-- (as partes MATERIALIZED são avaliadas uma única vez). Linhas com origem = '*' são o geral.
--   rel              média (com corte em 0,3 e 3) das razões preço-na-faixa / preço-médio-do-voo,
--                    só de voos com pelo menos duas faixas observadas
--   n                voos na faixa
--   preco_medio_voo  MEDIANA do preço médio dos voos do trecho. Mediana, e não média, porque
--                    poucos voos muito caros puxam a média pra um valor que ninguém paga.
--                    SQLite não tem MEDIAN(), então pega a(s) linha(s) do meio com ROW_NUMBER.
CREATE VIEW v_curva_tudo AS
WITH cv AS MATERIALIZED (SELECT * FROM v_curva_voo),
multi AS (SELECT id FROM cv GROUP BY id HAVING COUNT(*) >= 2),
u AS MATERIALIZED (SELECT c.* FROM cv c JOIN multi m ON m.id = c.id),
vb AS (SELECT DISTINCT id, origem, destino, media FROM u),
rt AS (
  SELECT origem, destino, media,
         ROW_NUMBER() OVER (PARTITION BY origem, destino ORDER BY media) AS rn,
         COUNT(*)     OVER (PARTITION BY origem, destino) AS c
  FROM vb
),
bt AS (SELECT origem, destino, AVG(media) AS base FROM rt WHERE rn IN ((c + 1) / 2, (c + 2) / 2) GROUP BY origem, destino),
rg AS (SELECT media, ROW_NUMBER() OVER (ORDER BY media) AS rn, COUNT(*) OVER () AS c FROM vb),
bg AS (SELECT AVG(media) AS base FROM rg WHERE rn IN ((c + 1) / 2, (c + 2) / 2))
SELECT u.origem, u.destino, u.i, f.rotulo, f.de_dias, f.ate_dias - 1 AS ate_dias,
       COUNT(*) AS n, AVG(MIN(3.0, MAX(0.3, u.rel))) AS rel, bt.base AS preco_medio_voo
FROM u
JOIN faixas f ON f.i = u.i
JOIN bt ON bt.origem = u.origem AND bt.destino = u.destino
GROUP BY u.origem, u.destino, u.i
UNION ALL
SELECT '*', '*', u.i, f.rotulo, f.de_dias, f.ate_dias - 1,
       COUNT(*), AVG(MIN(3.0, MAX(0.3, u.rel))), (SELECT base FROM bg)
FROM u JOIN faixas f ON f.i = u.i
GROUP BY u.i;
