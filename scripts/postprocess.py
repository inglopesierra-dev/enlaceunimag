"""Post-proceso del libro generado con openpyxl.

1. Copia los valores calculados por LibreOffice (copia recalculada) como valores en caché de cada fórmula,
   para que el archivo se vea completo incluso en visores que no recalculan (vista previa, móvil).
2. Corrige el elemento '#NAME?' que quedó en la caché de las tablas dinámicas (Periodo reporte) y quita
   el atributo r:id que openpyxl agrega a la raíz de cada tabla dinámica.
3. Cambia la fuente predeterminada del libro (Carlito 11) por Arial 10, la misma del resto del archivo.

Uso: python postprocess.py GENERADO.xlsx RECALCULADO_LO.xlsx SALIDA.xlsx
"""
import re
import sys
import zipfile
from lxml import etree

BUILT, LO, OUT = sys.argv[1:4]
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
q = lambda t: f"{{{NS}}}{t}"


def sheet_paths(z):
    wbx = etree.fromstring(z.read("xl/workbook.xml"))
    rels = etree.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid2t = {r.get("Id"): r.get("Target") for r in rels.iter(f"{{{PKG}}}Relationship")}
    out = {}
    for s in wbx.iter(q("sheet")):
        t = rid2t[s.get(f"{{{RNS}}}id")]
        t = t.lstrip("/")
        if not t.startswith("xl/"):
            t = "xl/" + t
        out[s.get("name")] = t
    return out


def lo_values(path):
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = etree.fromstring(z.read("xl/sharedStrings.xml"))
        ss = ["".join(si.itertext()) for si in root.iter(q("si"))]
    vals = {}
    for name, p in sheet_paths(z).items():
        d = {}
        with z.open(p) as fh:
            for _, c in etree.iterparse(fh, tag=q("c")):
                if c.find(q("f")) is not None or True:
                    t = c.get("t")
                    v = c.find(q("v"))
                    if v is None:
                        is_ = c.find(q("is"))
                        if is_ is not None:
                            d[c.get("r")] = ("str", "".join(is_.itertext()))
                    else:
                        text = v.text or ""
                        if t == "s":
                            d[c.get("r")] = ("str", ss[int(text)])
                        elif t in ("str", "inlineStr"):
                            d[c.get("r")] = ("str", text)
                        elif t == "b":
                            d[c.get("r")] = ("b", text)
                        elif t == "e":
                            d[c.get("r")] = ("e", text)
                        else:
                            d[c.get("r")] = ("n", text)
                c.clear()
        vals[name] = d
    return vals


lov = lo_values(LO)
zin = zipfile.ZipFile(BUILT)
paths = sheet_paths(zin)
path2name = {v: k for k, v in paths.items()}
zout = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
stats = {}
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename in path2name:
        name = path2name[item.filename]
        src = lov.get(name, {})
        root = etree.fromstring(data)
        n_f = n_set = n_missing = 0
        for c in root.iter(q("c")):
            f = c.find(q("f"))
            if f is None:
                continue
            n_f += 1
            v = c.find(q("v"))
            if v is None:
                v = etree.SubElement(c, q("v"))
            got = src.get(c.get("r"))
            if got is None:
                # LibreOffice no escribió valor: fórmula que devuelve texto vacío
                got = ("str", "")
                n_missing += 1
            kind, text = got
            if kind == "n":
                if "t" in c.attrib:
                    del c.attrib["t"]
            else:
                c.set("t", kind)
            v.text = text
            n_set += 1
        stats[name] = (n_f, n_set, n_missing)
        data = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
    elif item.filename.startswith("xl/pivotTables/pivotTable") and item.filename.endswith(".xml"):
        # openpyxl agrega r:id a la raíz de la tabla dinámica; el esquema no lo admite
        s = data.decode("utf-8")
        head, sep, rest = s.partition(">")
        head = re.sub(r'\sr:id="[^"]*"', "", head)
        data = (head + sep + rest).encode("utf-8")
        stats[item.filename] = "r:id quitado"
    elif item.filename.startswith("xl/pivotCache/pivotCacheDefinition"):
        s = data.decode("utf-8")
        s = s.replace('<e v="#NAME?"/>', '<s v="2026-II"/>')
        data = s.encode("utf-8")
    elif item.filename == "xl/styles.xml":
        s = data.decode("utf-8")
        s, k = re.subn(r'<font><name val="Carlito"/>(?:<family val="\d+"/>)?<sz val="11"/></font>',
                       '<font><name val="Arial"/><family val="2"/><sz val="10"/></font>', s, count=1)
        if k == 0:
            s, k = re.subn(r'(<fonts[^>]*>\s*<font>)(.*?)(</font>)',
                           lambda m: m.group(1) + '<name val="Arial"/><family val="2"/><sz val="10"/>' + m.group(3)
                           if "Carlito" in m.group(2) else m.group(0), s, count=1, flags=re.S)
        stats["styles_font_fixed"] = k
        data = s.encode("utf-8")
    zout.writestr(item, data)
zout.close()
for k, v in stats.items():
    print(k, v)
