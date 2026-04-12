import zipfile
import xml.etree.ElementTree as ET
import os

def get_docx_text(path):
    """Extrae el texto de un archivo .docx."""
    try:
        with zipfile.ZipFile(path, 'r') as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # Namespace for word documents
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            # Extract all text blocks
            texts = []
            for t in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                if t.text:
                    texts.append(t.text)
            return "\n".join(texts)
    except Exception as e:
        return f"Error leyendo {path}: {str(e)}"

# Archivos a procesar
docs = [
    "Imala_Vox_Especificacion_Tecnica_v1 (1).docx",
    "Imala_Vox_Sistema_Disenio_v1.docx"
]

results = {}
for doc in docs:
    if os.path.exists(doc):
        results[doc] = get_docx_text(doc)
    else:
        results[doc] = "Archivo no encontrado"

# Guardar resultados en un archivo de texto para leerlo
with open("extracted_docs.txt", "w", encoding="utf-8") as f:
    for name, content in results.items():
        f.write(f"--- DOCUMENTO: {name} ---\n")
        f.write(content)
        f.write("\n\n")

print("Extracción completada en extracted_docs.txt")
