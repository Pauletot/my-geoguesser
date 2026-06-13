// timer.js
import { gameState, GAME_CONFIG } from './state.js';

export function startTimer(onTimeUpCallback) {
    // Prevent multiple parallel tickers
    clearInterval(gameState.timerInterval);

    gameState.timeLeft = GAME_CONFIG.MAX_TIME;
    gameState.timedOut = false;
    
    const countdownElement = document.getElementById("countdown");
    if (countdownElement) countdownElement.style.color = "#ffffff";

    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;
        
        let minutes = Math.floor(gameState.timeLeft / 60);
        let seconds = gameState.timeLeft % 60;

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        if (countdownElement) {
            countdownElement.textContent = `${minutes}:${seconds}`;
            // Turn red if 15 seconds or less remain
            if (gameState.timeLeft <= 15) {
                countdownElement.style.color = "#ff4757";
            }
        }

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            if (countdownElement) countdownElement.textContent = "TIME IS OVER LOSER";
            
            gameState.timedOut = true;
            
            // Critical fix: Invoke the handler passed by main.js to end the round immediately!
            onTimeUpCallback();
        }
    }, 1000);
}

export function stopTimer() {
    clearInterval(gameState.timerInterval);
}