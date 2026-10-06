-- Atualização diária dos resultados calculados. Rodada pelo Worker (cron das 6h10 em Brasília)
-- e também à mão: npx wrangler d1 execute radar --remote -y --file=materializar.sql
-- Seguro repetir: usa INSERT OR REPLACE.

-- 1) Voos que decolaram desde a última vez (com 1 h de folga pra voo atrasado).
INSERT OR REPLACE INTO queda_voo
  (id, origem, destino, data_voo, h_saida, companhia, paradas, faixa, partida,
   preco_ref, min_48h, queda_48h, horas_antes_do_min)
SELECT id, origem, destino, data_voo, h_saida, companhia, paradas,
       CASE WHEN CAST(substr(h_saida, 1, 2) AS INTEGER) < 6  THEN 'madrugada'
            WHEN CAST(substr(h_saida, 1, 2) AS INTEGER) < 12 THEN 'manha'
            WHEN CAST(substr(h_saida, 1, 2) AS INTEGER) < 18 THEN 'tarde'
            ELSE 'noite' END,
       partida, preco_ref, min_48h, queda_48h, horas_antes_do_min
FROM v_queda_voo
WHERE partida >  COALESCE((SELECT CAST(valor AS INTEGER) FROM meta WHERE chave = 'queda_ate'), 0)
  AND partida <= CAST(strftime('%s', 'now') AS INTEGER) - 3600;

INSERT INTO meta (chave, valor)
VALUES ('queda_ate', CAST(CAST(strftime('%s', 'now') AS INTEGER) - 3600 AS TEXT))
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;

-- Total geral, usado como ponto de partida da suavização da chance por trecho.
INSERT INTO meta (chave, valor)
SELECT 'queda_geral', COUNT(*) || ',' || COALESCE(SUM(queda_48h >= 0.3), 0) FROM queda_voo WHERE true
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;

-- Trechos acompanhados.
INSERT OR IGNORE INTO trechos (origem, destino) SELECT DISTINCT origem, destino FROM voos;

-- 2) Curva por antecedência: recalculada inteira, porque voos abertos mudam todo dia.
DELETE FROM curva_trecho;
INSERT INTO curva_trecho (origem, destino, i, rotulo, de_dias, ate_dias, n, rel, preco_medio_voo)
SELECT origem, destino, i, rotulo, de_dias, ate_dias, n, rel, preco_medio_voo
FROM v_curva_tudo WHERE n >= 8;

-- 3) Contagens pro /api/saude: contar tabela inteira a cada chamada gasta a cota de leitura do plano gratuito.
INSERT INTO meta (chave, valor) SELECT 'cont_voos', COUNT(*) FROM voos WHERE true
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;
INSERT INTO meta (chave, valor) SELECT 'cont_precos', COUNT(*) FROM precos WHERE true
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;
INSERT INTO meta (chave, valor) SELECT 'cont_referencia', COUNT(*) FROM referencia WHERE true
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;
