"""Gera js/fotos.js a partir das imagens em img/produtos/.

Nome do arquivo = slug do produto (veja js/dados.js). Fotos extras
terminam em -2, -3... Ex.: tenis-nike-big-low.jpg, tenis-nike-big-low-2.jpg

Uso (na pasta loja/):  python3 ferramentas/atualizar_fotos.py
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "img" / "produtos"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
SAIDA = RAIZ / "js" / "fotos.js"

slugs = set(re.findall(r'"slug":\s*"([^"]+)"', (RAIZ / "js" / "dados.js").read_text(encoding="utf-8")))
fotos, sobras = {}, []
for arq in sorted(PASTA.iterdir()):
    if arq.suffix.lower() not in EXTS:
        continue
    nome = arq.stem
    m = re.fullmatch(r"(.+)-(\d+)", nome)
    if nome in slugs:
        base, ordem = nome, 1
    elif m and m.group(1) in slugs:
        base, ordem = m.group(1), int(m.group(2))
    else:
        sobras.append(arq.name)
        continue
    fotos.setdefault(base, []).append((ordem, f"img/produtos/{arq.name}"))

mapa = {k: [c for _, c in sorted(v)] for k, v in sorted(fotos.items())}
cabecalho = SAIDA.read_text(encoding="utf-8").split("window.FOTOS")[0]
SAIDA.write_text(cabecalho + "window.FOTOS = " + json.dumps(mapa, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
print(f"{len(mapa)} produtos com foto ({sum(len(v) for v in mapa.values())} imagens).")
if sobras:
    print("Arquivos sem produto correspondente (confira o nome):", ", ".join(sobras))
