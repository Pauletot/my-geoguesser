import csv
import os
import streetview

def genera_configurazioni():
    csv_input = "new_places.csv"
    txt_output = "lista_id.txt"
    json_output = "places.json"
    pic_folder = "pic"

    if not os.path.exists(csv_input):
        print(f"❌ Errore: manca il file di partenza '{csv_input}'!")
        return

    elaborated_places = []

    print("Avvio ricerca dei Pano ID su Google Maps...")

    # 1. Leggiamo il CSV con i nomi e le coordinate inseriti da te
    with open(csv_input, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Pulizia preventiva delle chiavi per evitare l'errore degli spazi (es. ' lat')
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

        for row in reader:
            name = row['name'].strip()
            lat = float(row['lat'])
            lon = float(row['lon'])
            
            # Creiamo un nome file pulito per le future immagini (es. "Tokyo Tower" -> "tokyo_tower")
            clean_name = name.lower().replace(" ", "_").replace(",", "").replace("'", "")
            
            try:
                # Cerchiamo i panorami vicini alle coordinate
                panos = streetview.search_panoramas(lat, lon)
                
                if panos:
                    # Trovato! Estraiamo l'ID usando la proprietà con il trattino basso
                    pano_id = panos[0].pano_id
                    
                    # Salviamo i dati in una lista temporanea
                    elaborated_places.append({
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "pano_id": pano_id,
                        "clean_name": clean_name,
                        "pic_path": f"{pic_folder}/{clean_name}.jpg"
                    })
                    print(f"Trovato ID per '{name}' -> {pano_id}")
                else:
                    print(f"Nessun panorama Street View trovato nei pressi di '{name}' ({lat}, {lon})")
            
            except Exception as e:
                print(f"Errore durante la ricerca di '{name}': {e}")

    if not elaborated_places:
        print("Nessun luogo valido elaborato. Controlla il file CSV.")
        return

    # 2. SCRITTURA DI LISTA_ID.TXT (Per il software di download)
    with open(txt_output, mode='w', encoding='utf-8') as txt_f:
        for luogo in elaborated_places:
            txt_f.write(f"{luogo['pano_id']},{luogo['pic_path']}\n")
    print(f"\nFile '{txt_output}' generato con successo!")

    # 3. SCRITTURA DI PLACES.JS (Per il codice JavaScript del gioco)
    with open(json_output, mode='a', encoding='utf-8') as json_f:
        for p in elaborated_places:
            # Trasformiamo il dizionario in una stringa JSON compatta e andiamo a capo
            linea_json = f'{{"name": "{p["name"]}", "lat": {p["lat"]}, "lon": {p["lon"]}, "pic": "{p["pic_path"]}"}}\n'
            json_f.write(linea_json)
        print(f"{len(elaborated_places)} nuovi luoghi appesi con successo a {json_output}!")

if __name__ == "__main__":
    genera_configurazioni()