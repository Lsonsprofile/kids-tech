// Canvas Setup
// Gets the HTML canvas element using its ID and stores it in the canvas variable.
const canvas = document.getElementById('myCanvas');

// Gets the 2D drawing context from the canvas so JavaScript can draw shapes and text.
const ctx = canvas.getContext('2d');

// Checks whether the browser successfully created the canvas drawing context.
if (!ctx) {
    // Displays an error message in the browser console if the canvas is not supported.
    console.error('Canvas not supported or context could not be retrieved.');
}


// Game Configuration
// Stores the original width of the canvas.
const CANVAS_W = canvas.width;

// Stores the original height of the canvas.
const CANVAS_H = canvas.height;

// Sets the radius of the player's circle.
const PLAYER_RADIUS = 10;

// Sets the maximum speed at which the player can move.
const PLAYER_MAX_SPEED = 4;

// Sets how much health the player loses during each frame while touching an enemy.
const HEALTH_DRAIN = 0.35;

// Sets how many points are added to the score during each frame.
const SCORE_PER_FRAME = 1;

// Determines how often a normal enemy is spawned.
const SPAWN_RATE = 40;

// Sets the number of enemies present when a new game begins.
const STARTING_ENEMIES = 3;

// Sets how many additional enemies are added for every 1,000 points.
const ENEMIES_PER_1000_SCORE = 5;

// Sets the smallest possible enemy radius.
const ENEMY_MIN_RADIUS = 8;

// Sets the largest possible enemy radius.
const ENEMY_MAX_RADIUS = 18;

// Sets the starting speed of enemies.
const ENEMY_BASE_SPEED = 1.2;

// Determines how much enemy speed increases as the player's score increases.
const ENEMY_SPEED_SCALE = 0.0008;

// Creates extra space outside the canvas where enemies can exist before being removed.
const OFFSCREEN_MARGIN = 50;


// Game State
// Stores the player's current health.
let health = 100;

// Stores the player's current score.
let score = 0;

// Counts how many frames have passed since the game started.
let frame = 0;

// Stores the current state of the game.
let gameState = 'playing';

// Stores the current amount of screen-shake effect.
let screenShakeIntensity = 0;

// Stores the current hue used to create the player's changing color.
let playerHue = 0;

// Stores the last 1,000-point score milestone that has been processed.
let lastScoreMilestone = 0;


// Player
// Creates an object containing all the important information about the player.
const player = {
    // Places the player horizontally in the center of the canvas.
    x: CANVAS_W / 2,

    // Places the player vertically in the center of the canvas.
    y: CANVAS_H / 2,

    // Gives the player the radius defined in the game configuration.
    radius: PLAYER_RADIUS,

    // Stores the player's horizontal movement speed.
    vx: 0,

    // Stores the player's vertical movement speed.
    vy: 0
};


// Enemy Class
// Creates a class that can be used to create enemy objects.
class Enemy {

    // Runs automatically whenever a new Enemy object is created.
    constructor(initialSpeed) {

        // Gives the enemy a random size between the minimum and maximum radius.
        this.radius = getRandom(ENEMY_MIN_RADIUS, ENEMY_MAX_RADIUS);

        // Gives the enemy a random color.
        this.color = getRandomColor();

        // Stores the speed given when the enemy is created.
        this.speed = initialSpeed;

        // Generates a random number from 0 to 3 to choose which canvas edge the enemy enters from.
        const edge = Math.floor(getRandom(0, 4));

        // Creates a variable that will later store the enemy's starting horizontal position.
        let spawnX;

        // Creates a variable that will later store the enemy's starting vertical position.
        let spawnY;

        // Checks which edge was randomly selected.
        switch (edge) {

            // Runs when edge is 0, meaning the enemy enters from the top.
            case 0:

                // Gives the enemy a random horizontal starting position.
                spawnX = getRandom(-OFFSCREEN_MARGIN, CANVAS_W + OFFSCREEN_MARGIN);

                // Places the enemy above the canvas.
                spawnY = -OFFSCREEN_MARGIN - this.radius;

                // Stops this switch case.
                break;

            // Runs when edge is 1, meaning the enemy enters from the right.
            case 1:

                // Places the enemy to the right of the canvas.
                spawnX = CANVAS_W + OFFSCREEN_MARGIN + this.radius;

                // Gives the enemy a random vertical starting position.
                spawnY = getRandom(-OFFSCREEN_MARGIN, CANVAS_H + OFFSCREEN_MARGIN);

                // Stops this switch case.
                break;

            // Runs when edge is 2, meaning the enemy enters from the bottom.
            case 2:

                // Gives the enemy a random horizontal starting position.
                spawnX = getRandom(-OFFSCREEN_MARGIN, CANVAS_W + OFFSCREEN_MARGIN);

                // Places the enemy below the canvas.
                spawnY = CANVAS_H + OFFSCREEN_MARGIN + this.radius;

                // Stops this switch case.
                break;

            // Runs when edge is 3, meaning the enemy enters from the left.
            case 3:

                // Places the enemy to the left of the canvas.
                spawnX = -OFFSCREEN_MARGIN - this.radius;

                // Gives the enemy a random vertical starting position.
                spawnY = getRandom(-OFFSCREEN_MARGIN, CANVAS_H + OFFSCREEN_MARGIN);

                // Stops this switch case.
                break;
        }

        // Stores the selected horizontal starting position in the enemy.
        this.x = spawnX;

        // Stores the selected vertical starting position in the enemy.
        this.y = spawnY;

        // Creates a random target horizontal position somewhere near the middle of the canvas.
        const targetX = getRandom(CANVAS_W * 0.25, CANVAS_W * 0.75);

        // Creates a random target vertical position somewhere near the middle of the canvas.
        const targetY = getRandom(CANVAS_H * 0.25, CANVAS_H * 0.75);

        // Calculates the angle from the enemy's starting position toward the target.
        const angle = Math.atan2(targetY - this.y, targetX - this.x) + (Math.random() - 0.5) * 0.5;

        // Calculates the enemy's horizontal velocity from the angle and speed.
        this.vx = Math.cos(angle) * this.speed;

        // Calculates the enemy's vertical velocity from the angle and speed.
        this.vy = Math.sin(angle) * this.speed;
    }

    // Creates a method used to draw the enemy on the canvas.
    draw() {

        // Stops the method if the canvas context does not exist.
        if (!ctx) return;

        // Starts creating a new canvas drawing path.
        ctx.beginPath();

        // Creates a circle using the enemy's position and radius.
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        // Sets the color used to fill the enemy.
        ctx.fillStyle = this.color;

        // Fills the enemy circle with its color.
        ctx.fill();

        // Sets the color of the enemy's outline.
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';

        // Sets the thickness of the enemy's outline.
        ctx.lineWidth = 1.5;

        // Draws the enemy's outline.
        ctx.stroke();
    }

    // Creates a method used to update the enemy's position.
    update() {

        // Moves the enemy horizontally using its horizontal velocity.
        this.x += this.vx;

        // Moves the enemy vertically using its vertical velocity.
        this.y += this.vy;
    }

    // Creates a method that checks whether the enemy has moved far enough outside the canvas.
    isOffScreen() {

        // Returns true if the enemy has completely moved outside the allowed margin.
        return (
            // Checks whether the enemy has moved beyond the left side.
            this.x + this.radius < -OFFSCREEN_MARGIN ||

            // Checks whether the enemy has moved beyond the right side.
            this.x - this.radius > CANVAS_W + OFFSCREEN_MARGIN ||

            // Checks whether the enemy has moved beyond the top side.
            this.y + this.radius < -OFFSCREEN_MARGIN ||

            // Checks whether the enemy has moved beyond the bottom side.
            this.y - this.radius > CANVAS_H + OFFSCREEN_MARGIN
        );
    }
}


// Enemy Array
// Creates an empty array that will store all active enemies.
let enemies = [];


// Helper Functions
// Creates a reusable function for generating a random number between two values.
function getRandom(min, max) {

    // Returns a random decimal number between min and max.
    return Math.random() * (max - min) + min;
}

// Creates a function that generates a random HSL color.
function getRandomColor() {

    // Generates a random hue between 0 and 359.
    const hue = Math.floor(Math.random() * 360);

    // Returns an HSL color using the random hue.
    return `hsl(${hue}, 70%, 60%)`;
}


// Get Enemy Speed
// Creates a function that calculates the current enemy speed.
function getEnemySpeed() {

    // Starts with the base speed and increases it according to the player's score.
    return ENEMY_BASE_SPEED + score * ENEMY_SPEED_SCALE;
}


// Spawn Enemy
// Creates a function for adding a new enemy to the game.
function spawnEnemy() {

    // Creates a new Enemy and adds it to the enemies array.
    enemies.push(new Enemy(getEnemySpeed()));
}


// Increase Enemies Every 1,000 Points
// Creates a function that checks whether the player has reached a new score milestone.
function checkScoreDifficulty() {

    // Calculates how many complete 1,000-point milestones the player has reached.
    const currentMilestone = Math.floor(score / 1000);

    // Checks whether the player has reached a milestone that has not already been processed.
    if (currentMilestone > lastScoreMilestone) {

        // Calculates how many new milestones have been reached.
        const milestonesReached = currentMilestone - lastScoreMilestone;

        // Calculates how many enemies should be added for those milestones.
        const enemiesToAdd = milestonesReached * ENEMIES_PER_1000_SCORE;

        // Starts a loop that will add the required number of enemies.
        for (let i = 0; i < enemiesToAdd; i++) {

            // Creates and adds one new enemy.
            spawnEnemy();
        }

        // Records the current milestone so it is not processed again.
        lastScoreMilestone = currentMilestone;

        // Displays the score milestone in the browser console.
        console.log(`Score milestone: ${score}`);

        // Displays how many enemy bubbles were added.
        console.log(`Added ${enemiesToAdd} enemy bubbles.`);

        // Displays the current number of enemies.
        console.log(`Current enemies: ${enemies.length}`);
    }
}


// Update Game
// Creates the function responsible for updating the game's logic.
function updateGame() {

    // Checks whether the game is not currently being played.
    if (gameState !== 'playing') {

        // Stops the function so the game does not update while paused or over.
        return;
    }

    // Moves the player horizontally according to its velocity.
    player.x += player.vx;

    // Moves the player vertically according to its velocity.
    player.y += player.vy;

    // Keeps the player inside the left and right boundaries of the canvas.
    player.x = Math.max(player.radius, Math.min(CANVAS_W - player.radius, player.x));

    // Keeps the player inside the top and bottom boundaries of the canvas.
    player.y = Math.max(player.radius, Math.min(CANVAS_H - player.radius, player.y));

    // Increases the player's hue and resets it after reaching 359.
    playerHue = (playerHue + 1) % 360;

    // Goes through every enemy currently stored in the enemies array.
    enemies.forEach(enemy => {

        // Updates the current enemy's position.
        enemy.update();

        // Calculates the distance between the player and the enemy.
        const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

        // Checks whether the player and enemy circles are touching.
        if (distance < player.radius + enemy.radius) {

            // Reduces the player's health while touching the enemy.
            health -= HEALTH_DRAIN;

            // Starts the screen-shake effect.
            screenShakeIntensity = 3;
        }
    });

    // Removes enemies that have moved far enough off the screen.
    enemies = enemies.filter(enemy => !enemy.isOffScreen());

    // Increases the frame counter by one.
    frame++;

    // Checks whether the current frame is a multiple of the normal spawn rate.
    if (frame % SPAWN_RATE === 0) {

        // Creates a new enemy.
        spawnEnemy();
    }

    // Increases the player's score.
    score += SCORE_PER_FRAME;

    // Checks whether the score has reached a new difficulty milestone.
    checkScoreDifficulty();

    // Checks whether the screen-shake effect is still active.
    if (screenShakeIntensity > 0) {

        // Gradually reduces the screen-shake intensity.
        screenShakeIntensity *= 0.88;
    }

    // Checks whether the screen-shake effect has become very small.
    if (screenShakeIntensity < 0.3) {

        // Completely turns off the screen-shake effect.
        screenShakeIntensity = 0;
    }

    // Checks whether the player's health has reached zero.
    if (health <= 0) {

        // Prevents health from displaying as a negative number.
        health = 0;

        // Changes the game state to game over.
        gameState = 'gameover';

        // Waits three seconds and then resets the game.
        setTimeout(resetGame, 3000);
    }
}


// Draw Game
// Creates the function responsible for drawing the game on the canvas.
function drawGame() {

    // Stops the function if the canvas context does not exist.
    if (!ctx) return;

    // Saves the current canvas drawing settings.
    ctx.save();

    // Checks whether the screen-shake effect is active.
    if (screenShakeIntensity > 0) {

        // Moves the entire canvas drawing slightly in a random direction.
        ctx.translate(
            // Calculates a random horizontal shake amount.
            (Math.random() - 0.5) * screenShakeIntensity * 2.5,

            // Calculates a random vertical shake amount.
            (Math.random() - 0.5) * screenShakeIntensity * 2.5
        );
    }

    // Sets the canvas background color to a very dark blue.
    ctx.fillStyle = '#020617';

    // Fills the entire canvas with the background color.
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Creates the player's current color using the changing hue.
    const playerColor = `hsl(${playerHue}, 100%, 50%)`;

    // Starts a new drawing path for the player.
    ctx.beginPath();

    // Creates the player's circular shape.
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);

    // Sets the player's fill color.
    ctx.fillStyle = playerColor;

    // Fills the player's circle.
    ctx.fill();

    // Sets the player's outline thickness.
    ctx.lineWidth = 2.5;

    // Sets the player's outline color.
    ctx.strokeStyle = playerColor;

    // Sets the amount of blur around the player.
    ctx.shadowBlur = 15;

    // Sets the color of the player's glow.
    ctx.shadowColor = playerColor;

    // Draws the player's glowing outline.
    ctx.stroke();

    // Turns off the shadow blur after drawing the player.
    ctx.shadowBlur = 0;

    // Goes through every enemy and draws it.
    enemies.forEach(enemy => enemy.draw());

    // Restores the canvas settings saved earlier.
    ctx.restore();

    // Checks that the instructions screen is not currently being displayed.
    if (gameState !== 'instructions') {

        // Sets the font used for the score.
        ctx.font = '24px Arial';

        // Sets the score text color to semi-transparent white.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

        // Aligns the score text to the left.
        ctx.textAlign = 'left';

        // Draws the current score near the top-left corner.
        ctx.fillText(`Score: ${score}`, 10, 30);

        // Sets the width of the health bar.
        const healthBarWidth = 150;

        // Sets the height of the health bar.
        const healthBarHeight = 20;

        // Calculates the horizontal position of the health bar.
        const healthBarX = CANVAS_W - healthBarWidth - 10;

        // Sets the vertical position of the health bar.
        const healthBarY = 10;

        // Sets the background color of the health bar.
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';

        // Draws the background of the health bar.
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        // Calculates how wide the health fill should be based on remaining health.
        const fillWidth = (health / 100) * healthBarWidth;

        // Creates a variable that will store the health bar color.
        let healthFillColor;

        // Checks whether the player's health is above 70%.
        if (health > 70) {

            // Makes the health bar green when health is high.
            healthFillColor = '#4CAF50';

        // Checks whether the player's health is above 30% but not above 70%.
        } else if (health > 30) {

            // Makes the health bar yellow when health is medium.
            healthFillColor = '#FFC107';

        // Runs when the player's health is 30% or lower.
        } else {

            // Makes the health bar red when health is low.
            healthFillColor = '#F44336';
        }

        // Sets the health bar's fill color.
        ctx.fillStyle = healthFillColor;

        // Draws the portion of the health bar representing remaining health.
        ctx.fillRect(healthBarX, healthBarY, fillWidth, healthBarHeight);

        // Changes the font size for the health percentage.
        ctx.font = '16px Arial';

        // Sets the health percentage text color to white.
        ctx.fillStyle = 'white';

        // Centers the health percentage text.
        ctx.textAlign = 'center';

        // Begins drawing the health percentage text.
        ctx.fillText(

            // Displays the health rounded upward to the nearest whole number.
            `${Math.ceil(health)}%`,

            // Places the percentage in the horizontal center of the health bar.
            healthBarX + healthBarWidth / 2,

            // Places the percentage vertically inside the health bar.
            healthBarY + healthBarHeight * 0.75
        );
    }

    // Checks whether the game is currently over.
    if (gameState === 'gameover') {

        // Sets a semi-transparent black color for the game-over overlay.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

        // Draws the dark overlay across the entire canvas.
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Sets a large Impact font for the game-over message.
        ctx.font = '50px Impact, sans-serif';

        // Sets the game-over text color to red.
        ctx.fillStyle = '#F44336';

        // Centers the game-over text horizontally.
        ctx.textAlign = 'center';

        // Displays "GAME OVER!" in the center area of the canvas.
        ctx.fillText('GAME OVER!', CANVAS_W / 2, CANVAS_H / 2 - 20);

        // Changes the font size for the final score.
        ctx.font = '30px Arial';

        // Changes the text color to white.
        ctx.fillStyle = 'white';

        // Displays the player's final score.
        ctx.fillText(`Final Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 30);

        // Changes the font size for the restart message.
        ctx.font = '18px Arial';

        // Makes the restart message slightly transparent.
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

        // Displays the message telling the player when the game will restart.
        ctx.fillText('Restarting in 3 seconds...', CANVAS_W / 2, CANVAS_H / 2 + 70);
    }
}


// Main Game Loop
// Creates the main function that continuously runs the game.
function gameLoop() {

    // Updates positions, collisions, score, health, enemies, and other game logic.
    updateGame();

    // Draws the latest version of the game onto the canvas.
    drawGame();

    // Requests that gameLoop runs again during the browser's next animation frame.
    requestAnimationFrame(gameLoop);
}


// Reset Game
// Creates a function that returns the game to its starting state.
function resetGame() {

    // Restores the player's health to 100.
    health = 100;

    // Resets the score to zero.
    score = 0;

    // Resets the frame counter.
    frame = 0;

    // Resets the score milestone tracker.
    lastScoreMilestone = 0;

    // Sets the game state back to playing.
    gameState = 'playing';

    // Removes any screen-shake effect.
    screenShakeIntensity = 0;

    // Resets the player's color hue.
    playerHue = 0;

    // Places the player horizontally in the center of the canvas.
    player.x = CANVAS_W / 2;

    // Places the player vertically in the center of the canvas.
    player.y = CANVAS_H / 2;

    // Stops the player's horizontal movement.
    player.vx = 0;

    // Stops the player's vertical movement.
    player.vy = 0;

    // Removes all existing enemies.
    enemies = [];

    // Creates the number of enemies specified by STARTING_ENEMIES.
    for (let i = 0; i < STARTING_ENEMIES; i++) {

        // Creates one starting enemy.
        spawnEnemy();
    }
}


// Joystick Setup
// Gets the joystick base element from the HTML.
const joystickBase = document.getElementById('joystick-base');

// Gets the joystick handle element from the HTML.
const joystickHandle = document.getElementById('joystick-handle');

// Stores whether the player is currently dragging the joystick.
let isDragging = false;

// Stores the radius of the joystick base.
let joystickRadius;

// Stores the radius of the joystick handle.
let handleRadius;

// Stores the horizontal center position of the joystick.
let joystickCenterX;

// Stores the vertical center position of the joystick.
let joystickCenterY;


// Update Joystick Center
// Creates a function that calculates the joystick's current position and size.
function updateJoystickCenter() {

    // Gets the joystick base's position and dimensions on the screen.
    const rect = joystickBase.getBoundingClientRect();

    // Calculates the joystick base radius from its width.
    joystickRadius = joystickBase.offsetWidth / 2;

    // Calculates the joystick handle radius from its width.
    handleRadius = joystickHandle.offsetWidth / 2;

    // Calculates the joystick's center horizontal screen position.
    joystickCenterX = rect.left + joystickRadius;

    // Calculates the joystick's center vertical screen position.
    joystickCenterY = rect.top + joystickRadius;
}

// Calculates the joystick center when the JavaScript first loads.
updateJoystickCenter();

// Listens for changes to the browser window size.
window.addEventListener('resize', () => {

    // Recalculates the joystick's center after the window is resized.
    updateJoystickCenter();
});


// Start Joystick Drag
// Creates a function that starts joystick movement.
function startDrag(e) {

    // Checks whether the game is not currently being played.
    if (gameState !== 'playing') {

        // Stops the function if the game is paused, showing instructions, or over.
        return;
    }

    // Records that the joystick is currently being dragged.
    isDragging = true;

    // Changes the cursor to the grabbing style while dragging.
    joystickHandle.style.cursor = 'grabbing';

    // Prevents the browser's default action for the event.
    e.preventDefault();

    // Recalculates the joystick center before movement begins.
    updateJoystickCenter();
}


// Stop Joystick Drag
// Creates a function that stops joystick movement.
function stopDrag() {

    // Records that the joystick is no longer being dragged.
    isDragging = false;

    // Changes the cursor back to the normal grab style.
    joystickHandle.style.cursor = 'grab';

    // Moves the joystick handle back to its center position.
    joystickHandle.style.transform = 'translate(-50%, -50%)';

    // Stops the player's horizontal movement.
    player.vx = 0;

    // Stops the player's vertical movement.
    player.vy = 0;
}


// Drag Joystick
// Creates a function that controls the joystick while it is being dragged.
function drag(e) {

    // Checks whether the joystick is not being dragged or the game is not playing.
    if (!isDragging || gameState !== 'playing') {

        // Stops the function when joystick movement should not happen.
        return;
    }

    // Gets the mouse horizontal position or touch horizontal position.
    const clientX = e.clientX || e.touches[0].clientX;

    // Gets the mouse vertical position or touch vertical position.
    const clientY = e.clientY || e.touches[0].clientY;

    // Calculates the horizontal distance between the pointer and joystick center.
    let deltaX = clientX - joystickCenterX;

    // Calculates the vertical distance between the pointer and joystick center.
    let deltaY = clientY - joystickCenterY;

    // Calculates the distance from the joystick center using the Pythagorean theorem.
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculates the maximum distance the joystick handle can travel.
    const maxHandleTravel = joystickRadius - handleRadius;

    // Checks whether the pointer has moved farther than the joystick can travel.
    if (distance > maxHandleTravel) {

        // Calculates the angle from the joystick center toward the pointer.
        const angle = Math.atan2(deltaY, deltaX);

        // Limits the horizontal joystick movement to the maximum allowed distance.
        deltaX = Math.cos(angle) * maxHandleTravel;

        // Limits the vertical joystick movement to the maximum allowed distance.
        deltaY = Math.sin(angle) * maxHandleTravel;
    }

    // Moves the joystick handle according to the calculated pointer distance.
    joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    // Converts the horizontal joystick movement into a value between -1 and 1.
    const normalizedDeltaX = deltaX / maxHandleTravel;

    // Converts the vertical joystick movement into a value between -1 and 1.
    const normalizedDeltaY = deltaY / maxHandleTravel;

    // Creates a default speed multiplier of 1.
    let speedMultiplier = 1;

    // Checks whether the joystick is being moved diagonally.
    if (normalizedDeltaX !== 0 && normalizedDeltaY !== 0) {

        // Reduces diagonal movement so it does not become faster than straight movement.
        speedMultiplier = 0.707;
    }

    // Converts horizontal joystick movement into the player's horizontal velocity.
    player.vx = normalizedDeltaX * PLAYER_MAX_SPEED * speedMultiplier;

    // Converts vertical joystick movement into the player's vertical velocity.
    player.vy = normalizedDeltaY * PLAYER_MAX_SPEED * speedMultiplier;
}


// Instructions Overlay
// Gets the Help button from the HTML.
const helpButton = document.getElementById('helpButton');

// Gets the instructions overlay from the HTML.
const instructionsOverlay = document.getElementById('instructionsOverlay');

// Gets the "Got It!" button from the HTML.
const closeInstructionsButton = document.getElementById('closeInstructionsButton');


// Show Instructions
// Creates a function that displays the instructions overlay.
function showInstructions() {

    // Checks whether the game is currently playing.
    if (gameState === 'playing') {

        // Changes the game state to instructions so game updates pause.
        gameState = 'instructions';
    }

    // Adds the "show" class to make the instructions overlay visible.
    instructionsOverlay.classList.add('show');
}


// Hide Instructions
// Creates a function that hides the instructions overlay.
function hideInstructions() {

    // Checks whether the game is currently showing the instructions.
    if (gameState === 'instructions') {

        // Changes the game state back to playing.
        gameState = 'playing';
    }

    // Removes the "show" class so the instructions overlay becomes hidden.
    instructionsOverlay.classList.remove('show');
}


// Help Button Events
// Runs showInstructions when the Help button is clicked.
helpButton.addEventListener('click', showInstructions);

// Runs hideInstructions when the "Got It!" button is clicked.
closeInstructionsButton.addEventListener('click', hideInstructions);


// Joystick Events
// Runs startDrag when the joystick handle is pressed with a mouse.
joystickHandle.addEventListener('mousedown', startDrag);

// Runs stopDrag when the mouse button is released anywhere on the window.
window.addEventListener('mouseup', stopDrag);

// Runs drag whenever the mouse moves across the window.
window.addEventListener('mousemove', drag);

// Runs startDrag when the joystick handle is touched on a touchscreen.
joystickHandle.addEventListener('touchstart', startDrag, {

    // Prevents the browser from treating the touch as a passive event,
    // allowing preventDefault() to work inside startDrag.
    passive: false
});

// Runs stopDrag when the user stops touching the screen.
window.addEventListener('touchend', stopDrag);

// Runs drag when the user's finger moves on the joystick.
joystickHandle.addEventListener('touchmove', drag, {

    // Allows the drag function to prevent the browser's default touch behavior.
    passive: false
});


// Start Game
// Resets the game and creates the starting enemies.
resetGame();

// Starts the continuous game loop.
gameLoop();