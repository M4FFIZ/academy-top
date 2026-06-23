import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

FILES = [
    Path(r"c:\Users\hahao\Downloads\Telegram Desktop\ДИПЛОМ КОВАЛЕНКО ГОТОВЫЙ.docx"),
    Path(r"c:\Users\hahao\Downloads\Telegram Desktop\ДИПЛОМНАЯ РАБОТА (3).docx"),
    Path(r"c:\Users\hahao\OneDrive\Desktop\Диплом Евтушенко.docx"),
]

OUT = Path(r"C:\Projects\academiya\docs\docx_outline_report.txt")


def extract_paragraphs(path: Path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    paragraphs = []
    for p in root.findall(".//w:p", NS):
        text = "".join(t.text or "" for t in p.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(re.sub(r"\s+", " ", text))
    return paragraphs


def is_heading(text: str):
    t = text.strip()
    if len(t) > 180:
        return False
    patterns = [
        r"^(ВВЕДЕНИЕ|ЗАКЛЮЧЕНИЕ|СОДЕРЖАНИЕ|СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ|ПРИЛОЖЕНИЕ)\b",
        r"^(РАЗДЕЛ|ГЛАВА)\s+\d+",
        r"^\d+(\.\d+)*\s+[А-ЯA-ZЁ].+",
        r"^Приложение\s+[А-ЯA-Z]",
    ]
    return any(re.search(p, t, re.IGNORECASE) for p in patterns)


def main():
    lines = []
    for path in FILES:
        lines.append("=" * 100)
        lines.append(f"FILE: {path}")
        lines.append(f"EXISTS: {path.exists()}")
        if not path.exists():
            continue
        paras = extract_paragraphs(path)
        lines.append(f"PARAGRAPHS: {len(paras)}")
        lines.append("")
        lines.append("LIKELY HEADINGS / STRUCTURE:")
        for i, p in enumerate(paras, 1):
            if is_heading(p):
                lines.append(f"{i:04d}: {p}")
        lines.append("")
        lines.append("APPENDIX-RELATED FRAGMENTS:")
        for i, p in enumerate(paras, 1):
            if re.search(r"приложени|листинг|код|техническ|задани|тест|скрин|рисунок", p, re.IGNORECASE):
                lines.append(f"{i:04d}: {p[:260]}")
        lines.append("")
        lines.append("LAST 80 PARAGRAPHS:")
        start = max(1, len(paras) - 79)
        for i, p in enumerate(paras[-80:], start):
            lines.append(f"{i:04d}: {p[:300]}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
