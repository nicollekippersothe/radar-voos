-- Consultas úteis. Cole uma por vez no console do D1 (painel da Cloudflare > Storage & Databases >
-- D1 > radar > Console) ou rode com: npx wrangler d1 execute radar --remote --command "SELECT ..."
-- Tudo em horário UTC; o partida de v_voo também. Brasília é UTC-3.

-- 1) O mais barato de cada destino saindo de São Paulo, nos próximos 3 dias, até R$ 500.
SELECT destino, MIN(ultimo_preco) AS preco, data_voo, h_saida, companhia, paradas
FROM v_voo
WHERE origem = 'SAO' AND ultimo_preco BETWEEN 1 AND 500
  AND data_voo <= date('now', '-3 hours', '+3 days')
  AND partida > CAST(strftime('%s', 'now') AS INTEGER)
GROUP BY destino
ORDER BY preco;

-- 2) Histórico de preço de um voo (troque o id; os ids saem da consulta 1 ou de /api/voos).
SELECT datetime(lido_em, 'unixepoch', '-3 hours') AS quando_brasilia, preco
FROM precos
WHERE voo_id = 14058134556580
ORDER BY lido_em;

-- 3) As 20 maiores quedas de última hora.
SELECT origem || '→' || destino AS trecho, data_voo, h_saida, companhia,
       preco_ref AS antes, min_48h AS depois, ROUND(queda_48h * 100) AS queda_pct,
       horas_antes_do_min AS horas_antes
FROM queda_voo
ORDER BY queda_48h DESC
LIMIT 20;

-- 4) Chance de queda de 30% ou mais por trecho (só trechos com 20 voos ou mais).
SELECT origem || '→' || destino AS trecho,
       COUNT(*) AS voos,
       SUM(queda_48h >= 0.3) AS quedas,
       ROUND(100.0 * SUM(queda_48h >= 0.3) / COUNT(*), 1) AS chance_pct
FROM queda_voo
GROUP BY origem, destino
HAVING COUNT(*) >= 20
ORDER BY chance_pct DESC;

-- 5) Chance por horário de saída e por companhia.
SELECT faixa, COUNT(*) AS voos, ROUND(100.0 * SUM(queda_48h >= 0.3) / COUNT(*), 1) AS chance_pct
FROM queda_voo GROUP BY faixa ORDER BY chance_pct DESC;

SELECT companhia, COUNT(*) AS voos, ROUND(100.0 * SUM(queda_48h >= 0.3) / COUNT(*), 1) AS chance_pct
FROM queda_voo GROUP BY companhia HAVING COUNT(*) >= 20 ORDER BY chance_pct DESC;

-- 6) Curva de preço por antecedência de um trecho: rel abaixo de 1 é mais barato que a média do voo.
SELECT rotulo, n AS voos, ROUND(rel, 3) AS rel, ROUND(rel * preco_medio_voo) AS preco_esperado
FROM curva_trecho
WHERE origem = 'SAO' AND destino = 'FLN'
ORDER BY de_dias DESC;

-- 7) Google contra a segunda fonte, dia a dia.
SELECT r.data_voo, r.preco AS aviasales, MIN(v.ultimo_preco) AS google,
       ROUND(100.0 * (MIN(v.ultimo_preco) - r.preco) / r.preco) AS google_vs_aviasales_pct
FROM referencia r
JOIN voos v ON v.origem = r.origem AND v.destino = r.destino AND v.data_voo = r.data_voo AND v.ultimo_preco > 0
WHERE r.origem = 'SAO' AND r.destino = 'FLN'
GROUP BY r.data_voo
ORDER BY r.data_voo;

-- 8) Voos que saíram da lista antes de decolar (esgotaram ou o Google parou de mostrar), por trecho.
SELECT origem || '→' || destino AS trecho, COUNT(*) AS voos
FROM v_voo
WHERE ultimo_preco = 0 AND partida > CAST(strftime('%s', 'now') AS INTEGER)
GROUP BY origem, destino
ORDER BY voos DESC;

-- 9) Saúde: quanto do plano gratuito já foi usado hoje (limite de 100 mil escritas).
SELECT chave, valor FROM meta WHERE chave LIKE 'escritas:%' ORDER BY chave DESC LIMIT 7;
SELECT (SELECT COUNT(*) FROM voos) AS voos, (SELECT COUNT(*) FROM precos) AS precos,
       (SELECT COUNT(*) FROM queda_voo) AS voos_fechados;
