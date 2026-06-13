// main.js
import { gameState, GAME_CONFIG } from './state.js';
import { startTimer, stopTimer } from './timer.js';
import { initializeMap, calculateHaversineDistance, drawResultsOnMap, clearMapLayers } from './map.js';

const actionBtn = document.getElementById('btn-enter');

async function startGame() {
    try {
        const response = await fetch('places.json');
        const text = await response.text();
        const places = text.trim().split('\n').map(line => JSON.parse(line));
        
        // Fisher-Yates Shuffle
        let shuffled = [...places]; 
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        gameState.gamePlaces = shuffled.slice(0, GAME_CONFIG.NUMBER_OF_GAMES);
        
        // Setup Leaflet
        initializeMap('map', () => {
            actionBtn.disabled = false; // Enable when map is clicked
        });

        loadRound();

    } catch (error) {
        console.error("Error loading the map database:", error);
    }
}

function loadRound() {
    gameState.actualPlace = gameState.gamePlaces[gameState.currentRound];
    gameState.isRoundOver = false;
    gameState.timedOut = false;

    actionBtn.innerText = "Guess";
    actionBtn.disabled = true;

    // Build the Pannellum sphere viewer
    gameState.viewer = pannellum.viewer('landscape', {
        "type": "equirectangular",
        "panorama": gameState.actualPlace.pic,
        "autoLoad": true
    });

    startTimer(handleRoundEnding); // Pass the trigger callback if time runs out
}

function handleRoundEnding() {
    stopTimer(); 
    gameState.isRoundOver = true;
    actionBtn.disabled = false; // Always make action button clickable to progress next

    let roundPoints = 0;
    let distanceKm = 0;

    // Check if the user ran out of time or failed to make a selection
    if (gameState.timedOut || !gameState.coordChosen) {
        roundPoints = 0;
        alert(`Round ${gameState.currentRound + 1} Over! You ran out of time! Score: 0 points.`);
    } else {
        distanceKm = calculateHaversineDistance(
            gameState.actualPlace.lat, gameState.actualPlace.lon, 
            gameState.coordChosen.lat, gameState.coordChosen.lng
        );

        if (distanceKm < 25) {
            roundPoints = GAME_CONFIG.MAX_POINTS;
        } else {
            roundPoints = Math.round(GAME_CONFIG.MAX_POINTS * Math.exp(-distanceKm / 2000));
        }
        
        alert(`Round ${gameState.currentRound + 1}. Error: ${Math.round(distanceKm)} km. Score: ${roundPoints} points!`);
    }

    gameState.totalScore += roundPoints;
    document.getElementById('points').innerText = gameState.totalScore;

    drawResultsOnMap();

    // Adjust button text dynamically
    if (gameState.currentRound + 1 < GAME_CONFIG.NUMBER_OF_GAMES) {
        actionBtn.innerText = "Next Round";
    } else {
        actionBtn.innerText = "View Final Score";
    }
}

actionBtn.addEventListener('click', () => {
    // Flow check: Are we completing a round or changing rounds?
    if (!gameState.isRoundOver) {
        handleRoundEnding();
    } else {
        // Shift to the next round structure
        gameState.currentRound++;

        if (gameState.currentRound < GAME_CONFIG.NUMBER_OF_GAMES) {
            gameState.viewer.destroy(); 
            clearMapLayers();
            loadRound();
        } else {
            // End of game reached
            alert(`Game ended! Final overall score: ${gameState.totalScore}/${GAME_CONFIG.NUMBER_OF_GAMES * GAME_CONFIG.MAX_POINTS}`);
            actionBtn.disabled = true;
            actionBtn.innerText = "Game Over";
        }
    }
});

// Run execution immediately on script evaluation
startGame();