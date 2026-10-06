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
    # Fase 0 de "todo o Brasil" (docs/09-todo-o-brasil.md). Todas testadas no Google em 5/out/2026.
    ("SAO", "NAT"),
    ("SAO", "MCZ"),
    ("SAO", "VIX"),
    ("SAO", "IGU"),
    ("SAO", "MAO"),
    ("SAO", "JOI"),
    ("SAO", "JPA"),
    ("SAO", "AJU"),
    ("SAO", "SLZ"),
    ("SAO", "THE"),
    ("SAO", "CGR"),
    ("SAO", "UDI"),
    ("SAO", "BPS"),
    ("RIO", "SSA"),
    ("RIO", "REC"),
    ("RIO", "NAT"),
    ("RIO", "FOR"),
    ("RIO", "POA"),
    ("BSB", "SSA"),
    ("BSB", "FOR"),
    ("BSB", "REC"),
    ("BHZ", "SSA"),
    ("BHZ", "REC"),
    ("CWB", "POA"),
    ("FOR", "REC"),
]

ROTAS = PARES + [(d, o) for o, d in PARES]
