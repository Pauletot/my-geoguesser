
// Variabili globali che ci serviranno dopo per memorizzare i dati del gioco
let map;
let utentMarker = null; // Il "pin" che l'utente metterà sulla mappa
let coordChoosen = null; // Le coordinate cliccate dall'utente
let realMarker = null;
let polyline = null;

// Variabili di stato del gioco
let gamePlaces = [];     // Conterrà i 5 luoghi estratti a caso per questa partita
let currentRound = 0;    // Round attuale
let totalScore = 0;      // Punteggio totale accumulato
let isRoundOver = false; // Stato del round
let actualPlace;
let visor;

const NUMBER_OF_GAMES=5;
const MAX_POINTS = 5000;




// Funzione per caricare il file JSON e far partire il gioco
async function starGame() {
    try {
        // 1. Leggiamo il file JSON statico
        const response = await fetch('places.json');
        const testo = await response.text();
        
        // 2. Convertiamo le righe del file in un array di oggetti JavaScript
        const places = testo.trim().split('\n').map(linea => JSON.parse(linea));
        
        // 3. Avviamo lo shuffle (Fisher-Yates) inserendo la tua logica esistente
        let shuffled = [...places]; 
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        gamePlaces = shuffled.slice(0, NUMBER_OF_GAMES);
        actualPlace = gamePlaces[currentRound];

        // 4. Inizializziamo il visore Pannellum (spostato qui dentro perché serve che i dati siano pronti)
        visor = pannellum.viewer('landscape', {
            "type": "equirectangular",
            "panorama": actualPlace.pic,
            "autoLoad": true
        });

    } catch (errore) {
        console.error("Errore nel caricamento dei luoghi:", errore);
    }
}

// Facciamo partire il flusso
starGame();


// ==========================================
// 3. INIZIALIZZAZIONE DELLA MAPPA (Leaflet)
// ==========================================

// Creiamo la mappa dentro il div con id 'map'
// [40, 0] sono le coordinate di partenza (centro del mondo) e 2 è lo zoom iniziale
map = L.map('map').setView([40, 0], 2);

// Carichiamo la grafica della mappa (le "tiles") da OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// ==========================================
// 4. GESTIONE DEL CLICK SULLA MAPPA
// ==========================================

// Ascoltiamo l'evento 'click' sulla mappa
map.on('click', function(e) {

    if (isRoundOver) return;

    // e.latlng contiene le coordinate (latitudine e longitudine) del punto cliccato
    coordChoosen = e.latlng;

    // Se c'è già un marker sulla mappa, lo rimuoviamo prima di mettere quello nuovo
    if (utentMarker !== null) {
        map.removeLayer(utentMarker);
    }

    // Creiamo un nuovo marker nel punto cliccato e lo aggiungiamo alla mappa
    utentMarker = L.marker([coordChoosen.lat, coordChoosen.lng]).addTo(map);

    // Ora che l'utente ha selezionato un punto, sblocchiamo il bottone "Guess"
    document.getElementById('btn-enter').disabled = false;
});

// ==========================================
// 5. CALCOLO DELLA DISTANZA (Formula di Haversine)
// ==========================================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raggio della Terra in chilometri
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Ritorna la distanza in km
}

// ==========================================
// 6. GESTIONE DEL BOTTONE (GUESS / NEXT)
// ==========================================
const actionBtn = document.getElementById('btn-enter');

actionBtn.addEventListener('click', function() {
    
    // CASO A: utente click guess: end of the actual round
    if (!isRoundOver) {
        
        // 1. Calcoliamo la distanza
        const distance = calculateDistance(
            actualPlace.lat, actualPlace.lon, 
            coordChoosen.lat, coordChoosen.lng
        );

        // 2. Calcoliamo il punteggio
        let roundPoints = 0;
        if (distance < 25) {
            roundPoints = 5000;
        } else {
            roundPoints = Math.round(5000 * Math.exp(-distance / 2000));
        }

        totalScore += roundPoints;
        // 3. Aggiorniamo i punti totali nell'HTML
        document.getElementById('points').innerText = totalScore;

        // 4. Mostriamo il punto reale (cerchio rosso)
        realMarker = L.circleMarker([actualPlace.lat, actualPlace.lon], {
            color: 'red',
            radius: 8
        }).addTo(map);

        // 5. Disegniamo la linea tratteggiata
        polyline = L.polyline([
            [coordChoosen.lat, coordChoosen.lng],
            [actualPlace.lat, actualPlace.lon]
        ], {color: 'red', weight: 3, dashArray: '5, 10'}).addTo(map);

        // Zoomiamo per mostrare entrambi i punti
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        // CAMBIO DI STATO: Il round è finito!
        isRoundOver = true;
        
        // Trasformiamo il bottone per il prossimo round
        actionBtn.innerText = "Next Round";
        
        
        if (currentRound < NUMBER_OF_GAMES){
            actionBtn.innerText = "Next round";
        } else {
            actionBtn.innerText = "View final score";
        }
        
        alert(`Round ${currentRound +1}. Error: ${Math.round(distance)} km. Score: ${roundPoints} points, porco dio!`);
    } 
    // CASO B: Il round era già finito e l'utente clicca "Next Round" o view final score
    else {
        currentRound++;

        // Controlliamo se ci sono ancora luoghi disponibili nell'array
        if (currentRound < NUMBER_OF_GAMES) {
            
            // 1. Passiamo al nuovo luogo
            actualPlace = gamePlaces[currentRound];

            //2 destroy old visor and build a new one
            visor.destroy(); 
            visor = pannellum.viewer('landscape', {
                    "type": "equirectangular",
                    "panorama": actualPlace.pic,
                    "autoLoad": true
            });
            
            
            // 3. Resettiamo la mappa grafica (rimuoviamo marker e linee)
            if (utentMarker) map.removeLayer(utentMarker);
            if (realMarker) map.removeLayer(realMarker);
            if (polyline) map.removeLayer(polyline);
            
            // 4. Riportiamo la mappa alla visuale globale iniziale
            map.setView([40, 0], 2);
            
            // 5. Resettiamo le variabili di stato e il bottone
            utentMarker = null;
            coordChoosen = null;
            isRoundOver = false;
            
            actionBtn.innerText = "Guess";
            actionBtn.disabled = true; // Torna bloccato finché non ricliccano sulla mappa
            
        } else {
            // Se i luoghi sono finiti
            alert(`Game ended. Final score: ${totalScore}/${NUMBER_OF_GAMES * MAX_POINTS}"`);
            actionBtn.disabled = true;
            actionBtn.innerText = "Game Over";
        }
    }
});