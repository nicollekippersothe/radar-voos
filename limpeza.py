"""Limpeza das séries de preço de cada voo.

Dois ruídos medidos no histórico de 30/set a 5/out de 2026:
  1. Leituras da madrugada (0h às 5h59, horário de Brasília) que saltam pra mais do dobro do preço
     normal do voo: 12% das leituras nessa faixa contra 2% no resto do dia, quase tudo na Azul.
  2. Picos isolados em qualquer horário (~2% das leituras).
A regra é: uma leitura é pico se estiver bem acima do nível que o voo tinha de dia, perto dela. Pico sai da
série. O nível de dia vale porque o ruído só sobe, nunca desce: o preço baixo é o preço real.
"""

import statistics as st

FATOR_NOITE = 1.6   # leitura da madrugada acima de 1,6x o nível diurno vizinho é pico
FATOR_ISOLADO = 2.0 # pico isolado: acima de 2x a mediana das leituras vizinhas
JANELA_DIA_H = 18   # "vizinho" = leituras diurnas até 18 h antes ou depois


def madrugada(t):
    return 0 <= t.hour < 6


def limpar(serie):
    """serie: lista [(datetime, preco)] ordenada por horário. Devolve a lista sem os picos."""
    if len(serie) < 4:
        return list(serie)
    diurnas = [(t, p) for t, p in serie if not madrugada(t)]
    saida = []
    for i, (t, p) in enumerate(serie):
        if madrugada(t) and diurnas:
            viz = [q for u, q in diurnas if abs((u - t).total_seconds()) <= JANELA_DIA_H * 3600]
            if viz and p > FATOR_NOITE * st.median(viz):
                continue
        saida.append((t, p))
    # picos isolados: compara com a mediana das 6 leituras mais próximas (3 de cada lado)
    final = []
    for i, (t, p) in enumerate(saida):
        viz = [q for _, q in saida[max(0, i - 3):i] + saida[i + 1:i + 4]]
        if len(viz) >= 4 and p > FATOR_ISOLADO * st.median(viz) and p > 1.5 * min(viz):
            continue
        final.append((t, p))
    return final or list(serie)
