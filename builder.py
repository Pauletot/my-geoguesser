import csv
import os
import json
import streetview

def generate_configurations():
    csv_input = "new_places.csv"
    txt_output = "id_list.txt"
    json_output = "places.json"
    pic_folder = "pic"

    if not os.path.exists(csv_input):
        print(f"❌ Error: Source file '{csv_input}' is missing!")
        return

    elaborated_places = []

    print("🚀 Initializing Google Maps Panorama ID search...")

    # 1. Parse the input CSV containing names and coordinates
    with open(csv_input, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # Clean up headers to prevent trailing or leading space bugs (e.g., ' lat')
        reader.fieldnames = [name.strip() for name in reader.fieldnames]

        for row in reader:
            name = row['name'].strip()
            lat = float(row['lat'])
            lon = float(row['lon'])
            
            # Generate a sanitized filename for future images (e.g., "Tokyo Tower" -> "tokyo_tower")
            clean_name = name.lower().replace(" ", "_").replace(",", "").replace("'", "")
            
            try:
                # Query nearest panoramas around the target coordinates
                panoramas = streetview.search_panoramas(lat, lon)
                
                if panoramas:
                    # Extract the absolute metadata ID
                    pano_id = panoramas[0].pano_id
                    
                    # Store temporary layout metrics
                    elaborated_places.append({
                        "name": name,
                        "lat": lat,
                        "lon": lon,
                        "pano_id": pano_id,
                        "clean_name": clean_name,
                        "pic_path": f"{pic_folder}/{clean_name}.jpg"
                    })
                    print(f"✅ Found ID for '{name}' -> {pano_id}")
                else:
                    print(f"❌ No Street View panorama found near '{name}' ({lat}, {lon})")
            
            except Exception as e:
                print(f"⚠️ Error executing query for '{name}': {e}")

    if not elaborated_places:
        print("❌ No valid locations processed. Check your CSV file values.")
        return

    # =========================================================================
    # 2. WRITE TO ID_LIST.TXT (For downstream headless downloading software)
    # =========================================================================
    with open(txt_output, mode='w', encoding='utf-8') as txt_f:
        for place in elaborated_places:
            txt_f.write(f"{place['pano_id']},{place['pic_path']}\n")
    print(f"\n📁 File '{txt_output}' written successfully!")

    # =========================================================================
    # 3. MERGE (OVERWRITING DUPLICATES), ALPHABETIZE, AND WRITE TO PLACES.JSON
    # =========================================================================
    # Using a dictionary where the key is the lowercase name helps manage overrides
    places_database = {}
    
    # Load past entries if the file already exists
    if os.path.exists(json_output):
        with open(json_output, mode='r', encoding='utf-8') as json_f:
            for line in json_f:
                line = line.strip()
                if line:
                    parsed_item = json.loads(line)
                    # Key by lowercase name
                    places_database[parsed_item["name"].lower()] = parsed_item

    # Process and merge new locations
    for p in elaborated_places:
        lowercase_name = p["name"].lower()
        new_entry = {
            "name": p["name"],
            "lat": p["lat"],
            "lon": p["lon"],
            "pic": p["pic_path"]
        }
        
        if lowercase_name in places_database:
            print(f"🔄 Location '{p['name']}' already exists. Overwriting old data with new tracking configurations.")
        
        # This inserts the new entry or completely updates the old one
        places_database[lowercase_name] = new_entry

    # Extract database objects into a plain list
    final_places_list = list(places_database.values())

    # Sort everything alphabetically by name
    final_places_list.sort(key=lambda item: item["name"].lower())

    # Overwrite the file with the updated database layout
    with open(json_output, mode='w', encoding='utf-8') as json_f:
        for item in final_places_list:
            json_f.write(json.dumps(item) + "\n")
            
    print(f"🎉 Database updated! {json_output} is sorted with {len(final_places_list)} total active locations.")

if __name__ == "__main__":
    generate_configurations()