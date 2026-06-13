// state.js

// Game Constants
export const GAME_CONFIG = {
    NUMBER_OF_GAMES: 5,
    MAX_POINTS: 5000,
    MAX_TIME: 15 // 15 seconds as requested in your constant
};

// Mutable Game State
export const gameState = {
    map: null,
    userMarker: null, 
    coordChosen: null, 
    realMarker: null,
    polyline: null,
    gamePlaces: [],     
    currentRound: 0,    
    totalScore: 0,      
    isRoundOver: false, 
    actualPlace: null,
    viewer: null,       // Pannellum instance
    timerInterval: null,
    timeLeft: GAME_CONFIG.MAX_TIME,
    timedOut: false
};