import zipfile
import xml.etree.ElementTree as ET

def extract(path):
    with zipfile.ZipFile(path) as z:
        with z.open('word/document.xml') as f:
            root = ET.parse(f).getroot()
            texts = []
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                t = ''.join(r.text or '' for r in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'))
                if t.strip():
                    texts.append(t)
            return texts

lines = extract('/home/si/Codingan/Ibadah/Conceptra/docs/Riset Pemetaan Miskonsepsi Fisika.docx')
for i, l in enumerate(lines):
    print(f'{i}: {l}')
