// map.js
import { gameState } from './state.js';

export function initializeMap(mapId, onMapClickCallback) {
    gameState.map = L.map(mapId).setView([40, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(gameState.map);

    gameState.map.on('click', (e) => {
        // Map clicks are blocked if the round is over or time ran out
        if (gameState.isRoundOver || gameState.timedOut) return;

        gameState.coordChosen = e.latlng;

        if (gameState.userMarker !== null) {
            gameState.map.removeLayer(gameState.userMarker);
        }

        gameState.userMarker = L.marker([gameState.coordChosen.lat, gameState.coordChosen.lng]).addTo(gameState.map);
        
        // Notify main.js to unlock the Guess button
        onMapClickCallback();
    });
}

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

export function drawResultsOnMap() {
    // Draw real position
    gameState.realMarker = L.circleMarker([gameState.actualPlace.lat, gameState.actualPlace.lon], {
        color: 'red',
        radius: 8
    }).addTo(gameState.map);

    // Draw connecting line if a guess exists
    if (gameState.coordChosen) {
        gameState.polyline = L.polyline([
            [gameState.coordChosen.lat, gameState.coordChosen.lng],
            [gameState.actualPlace.lat, gameState.actualPlace.lon]
        ], { color: 'red', weight: 3, dashArray: '5, 10' }).addTo(gameState.map);

        gameState.map.fitBounds(gameState.polyline.getBounds(), { padding: [20, 20] });
    } else {
        // If timed out without clicking, just pan directly to the real target location
        gameState.map.setView([gameState.actualPlace.lat, gameState.actualPlace.lon], 5);
    }
}

export function clearMapLayers() {
    if (gameState.userMarker) gameState.map.removeLayer(gameState.userMarker);
    if (gameState.realMarker) gameState.map.removeLayer(gameState.realMarker);
    if (gameState.polyline) gameState.map.removeLayer(gameState.polyline);
    
    gameState.userMarker = null;
    gameState.coordChosen = null;
    gameState.map.setView([40, 0], 2);
}