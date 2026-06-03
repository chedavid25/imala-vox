import re

file_path = r"C:\Users\David Pc\.gemini\antigravity-ide\brain\e812646d-9ee0-4c97-ac73-264879fbd70a\.system_generated\steps\129\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Eliminar scripts y etiquetas de estilo completamente
content = re.sub(r'<script.*?</script>', '', content, flags=re.DOTALL)
content = re.sub(r'<style.*?</style>', '', content, flags=re.DOTALL)

# Eliminar tags HTML
clean_text = re.sub(r'<[^>]+>', '\n', content)
# Normalizar espacios
clean_text = re.sub(r'\n+', '\n', clean_text)

# Guardar en archivo
with open("scratch/doc_clean.txt", "w", encoding="utf-8") as f:
    f.write(clean_text)

print("Texto limpio guardado en scratch/doc_clean.txt")
