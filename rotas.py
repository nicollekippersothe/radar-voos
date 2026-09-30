"""Rotas vigiadas pelo coletor, nos dois sentidos.

Critério: rotas com muitos voos por dia (mais chance de assento sobrando perto
da partida) e que interessam ao público (Floripa, litoral, capitais baratas).
Códigos de cidade do Google Voos: SAO cobre GRU, CGH e VCP; RIO cobre GIG e SDU.
"""

PARES = [
    ("SAO", "FLN"),
    ("SAO", "RIO"),
    ("SAO", "POA"),
    ("SAO", "CWB"),
    ("SAO", "BHZ"),
    ("SAO", "BSB"),
    ("SAO", "SSA"),
    ("SAO", "REC"),
    ("SAO", "FOR"),
    ("SAO", "CGB"),
    ("SAO", "GYN"),
    ("FLN", "RIO"),
    ("FLN", "POA"),
    ("FLN", "CWB"),
    ("RIO", "BHZ"),
]

ROTAS = PARES + [(d, o) for o, d in PARES]
