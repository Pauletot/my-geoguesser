import csv
import os
import json
import requests
import streetview
from PIL import Image
from io import BytesIO

import time

def download_tiles_and_combine(pano_id, filename):
    """
    Scarica i 32 tasselli a zoom 3 (8 colonne x 4 righe) usando i nuovi endpoint
    di Google e camuffando le richieste con gli Headers di un browser reale (No 403).
    """
    tile_width = 512
    tile_height = 512
    cols, rows = 8, 4
    
    panorama = Image.new('RGB', (cols * tile_width, rows * tile_height))
    
    # 🟢 DEFINIAMO GLI HEADERS: Inganniamo Google facendoci passare per un browser vero
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
        "Origin": "https://www.google.com",
        "Referer": "https://www.google.com/"
    }
    
    for y in range(rows):
        for x in range(cols):
            # 🔄 NUOVO URL: Usiamo l'endpoint di Google Maps ufficiale e moderno
            url = f"https://streetviewpixels-pa.googleapis.com/v1/tile?cb_client=maps_sv.tactile&panoid={pano_id}&zoom=3&x={x}&y={y}"
            
            tentativi = 3
            successo = False
            
            while tentativi > 0 and not successo:
                # 🟢 Passiamo i parametri 'headers=headers' nella richiesta HTTP
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    tile = Image.open(BytesIO(response.content))
                    panorama.paste(tile, (x * tile_width, y * tile_height))
                    successo = True
                    time.sleep(0.1) # Micro-pausa prudenziale
                    
                elif response.status_code in [503, 429]:
                    tentativi -= 1
                    print(f"⚠️ Limite raggiunto ({response.status_code}) sul tassello x:{x}, y:{y}. Aspetto 3 secondi...")
                    time.sleep(3)
                    
                else:
                    # Se restituisce ancora 403 o altri errori, usciamo lanciando l'eccezione
                    raise Exception(f"Errore HTTP {response.status_code} sul tassello x:{x}, y:{y}")
            
            if not successo:
                raise Exception(f"Impossibile scaricare il tassello x:{x}, y:{y} dopo molteplici tentativi.")
                
    panorama.save(filename, "JPEG")

def esegui_pipeline():
    csv_input = "new_places.csv"
    json_output = "places.json"
    pic_folder = "pic"
    
    if not os.path.exists(pic_folder):
        os.makedirs(pic_folder)
        
    if not os.path.exists(csv_input):
        print(f"❌ Errore: Manca il file di input '{csv_input}'!")
        return

    nuovi_luoghi_scaricati = []

    print("🚀 Avvio pipeline di download e configurazione nativa...")

    # =========================================================================
    # STEP 1: LEGGERE I NUOVI LUOGHI E SCARICARE I PANORAMI
    # =========================================================================
    with open(csv_input, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Pulizia preventiva per eliminare gli spazi vuoti dai nomi delle colonne (es. ' lat' -> 'lat')
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

        for row in reader:
            name = row['name'].strip()
            lat = float(row['lat'])
            lon = float(row['lon'])
            
            # Generiamo un nome file standard pulito (es. "Paris, Place" -> "pic/paris_place.jpg")
            clean_name = name.lower().replace(" ", "_").replace(",", "").replace("'", "")
            filename = f"{pic_folder}/{clean_name}.jpg"
            
            print(f"\n🔍 Ricerca panorama per: '{name}'...")
            
            try:
                # Cerca il PanoID usando le coordinate (Operazione gratuita e senza API key)
                panos = streetview.search_panoramas(lat, lon)
                if panos:
                    pano_id = panos[0].pano_id
                    print(f"🔗 Pano ID trovato: {pano_id}. Avvio download dei 32 tasselli...")
                    
                    # Avviamo la ricomposizione dell'immagine sferica
                    download_tiles_and_combine(pano_id, filename)
                    print(f"✅ Immagine 360° creata e salvata: {filename}")
                    
                    # Salva temporaneamente il dizionario in memoria
                    nuovi_luoghi_scaricati.append({
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "pic": filename
                    })
                else:
                    print(f"❌ Nessun panorama Street View trovato vicino a '{name}' ({lat}, {lon})")
            except Exception as e:
                print(f"⚠️ Errore durante l'elaborazione di '{name}': {e}")

    # Se non è stato scaricato nessun nuovo luogo, ci fermiamo senza toccare il file JSON
    if not nuovi_luoghi_scaricati:
        print("\nℹ️ Nessun nuovo luogo è stato aggiunto. Fine del processo.")
        return

    # =========================================================================
    # STEP 2: RECUPERO VECCHI DATI DA PLACES.JSON
    # =========================================================================
    luoghi_totali = []
    if os.path.exists(json_output):
        with open(json_output, mode='r', encoding='utf-8') as json_f:
            for linea in json_f:
                linea = linea.strip()
                if linea:
                    luoghi_totali.append(json.loads(linea))

    # =========================================================================
    # STEP 3: UNIONE DEI DATI ED ELIMINAZIONE DUPLICATI
    # =========================================================================
    # Usiamo un set dei nomi in minuscolo per controllare se il luogo esiste già
    nomi_esistenti = {l["name"].lower() for l in luoghi_totali}
    for nuovo in nuovi_luoghi_scaricati:
        if nuovo["name"].lower() not in nomi_esistenti:
            luoghi_totali.append(nuovo)
        else:
            print(f"ℹ️ Il luogo '{nuovo['name']}' esiste già nel file JSON, salto il duplicato.")

    # =========================================================================
    # STEP 4: ORDINAMENTO ALFABETICO COMPLESSIVO
    # =========================================================================
    # Ordina la lista per la chiave "name" convertita in minuscolo (evita che le maiuscole sballino l'ordine)
    luoghi_totali.sort(key=lambda l: l["name"].lower())

    # =========================================================================
    # STEP 5: RISCRITTURA ORDINATA DEL FILE JSON A RIGHE
    # =========================================================================
    with open(json_output, mode='w', encoding='utf-8') as json_f:
        for p in luoghi_totali:
            # Scrive ogni oggetto come stringa JSON compatta su una sola riga indipendente (\n)
            json_f.write(json.dumps(p) + "\n")

    print(f"\n🎉 Pipeline completata con successo!")
    print(f"📁 Il file '{json_output}' è stato aggiornato e ordinato alfabeticamente.")
    print(f"📊 Totale luoghi nel gioco: {len(luoghi_totali)}")

if __name__ == "__main__":
    esegui_pipeline()