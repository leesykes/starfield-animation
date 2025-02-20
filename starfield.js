/**
 * Configuration constants for the starfield animation
 */
const CONFIG = {
    STAR_COUNT: 500,        // Total number of stars in the field
    MAX_DISTANCE: 1500,     // Maximum Z distance for stars (depth)
    MIN_DISTANCE: 10,       // Minimum starting distance from center
    TRANSITION_SPEED: 0.1,  // Speed of center point transitions (0-1)
    BASE_SPEED: 3,         // Base movement speed of stars
    SPEED_VARIANCE: 2,     // Random variance in star speed
    BASE_SIZE: 0.5,        // Base size of stars in pixels
    SIZE_VARIANCE: 1,      // Random variance in star size
    EXPANSION_RATE: 100,   // Rate at which stars spread out from center
    TWO_PI: Math.PI * 2    // Cached for performance in angle calculations
};

/**
 * Represents a single star in the starfield
 */
class Star {
    /**
     * Creates a new star
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.startingDistance = CONFIG.MIN_DISTANCE;
        this.maxDistance = CONFIG.MAX_DISTANCE;
        // Initialize origin at screen center
        this.originX = window.innerWidth / 2;
        this.originY = window.innerHeight / 2;
        this.reset();
    }

    /**
     * Resets star to initial state with random properties
     */
    reset() {
        // Random angle in radians
        this.angle = Math.random() * CONFIG.TWO_PI;
        // Random initial depth
        this.z = Math.random() * this.maxDistance;
        
        // Calculate initial position based on angle and distance
        const progress = (this.maxDistance - this.z) / this.maxDistance;
        const currentDistance = this.startingDistance + (progress * CONFIG.EXPANSION_RATE);
        this.x = Math.cos(this.angle) * currentDistance;
        this.y = Math.sin(this.angle) * currentDistance;
        
        // Random speed and size within configured ranges
        this.speed = CONFIG.BASE_SPEED + Math.random() * CONFIG.SPEED_VARIANCE;
        this.size = CONFIG.BASE_SIZE + Math.random() * CONFIG.SIZE_VARIANCE;
    }

    /**
     * Updates star position and handles transitions
     * @param {number} targetOriginX - Target center X coordinate
     * @param {number} targetOriginY - Target center Y coordinate
     */
    update(targetOriginX, targetOriginY) {
        // Move star closer to viewer
        this.z = this.z - this.speed;
        
        if (this.z <= 0) {
            this.reset();
            this.z = this.maxDistance;
            // New stars appear from the new center immediately
            this.originX = targetOriginX;
            this.originY = targetOriginY;
        } else {
            // Existing stars smoothly transition to new center
            const transitionSpeed = CONFIG.TRANSITION_SPEED;
            this.originX += (targetOriginX - this.originX) * transitionSpeed;
            this.originY += (targetOriginY - this.originY) * transitionSpeed;
        }
        
        // Apply perspective to star position
        const scale = this.canvas.width / this.z;
        this.screenX = this.x * scale + this.originX;
        this.screenY = this.y * scale + this.originY;
        
        // Update star spread based on depth
        const progress = (this.maxDistance - this.z) / this.maxDistance;
        const currentDistance = this.startingDistance + (progress * CONFIG.EXPANSION_RATE);
        this.x = Math.cos(this.angle) * currentDistance;
        this.y = Math.sin(this.angle) * currentDistance;
    }

    /**
     * Checks if star is within visible canvas bounds
     * @returns {boolean} True if star is visible
     */
    isVisible() {
        return this.screenX >= 0 && 
               this.screenX <= this.canvas.width &&
               this.screenY >= 0 && 
               this.screenY <= this.canvas.height;
    }

    /**
     * Draws the star on the canvas
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        if (!this.isVisible()) return;
        
        // Scale size and opacity based on distance
        const scale = (CONFIG.MAX_DISTANCE - this.z) / CONFIG.MAX_DISTANCE;
        const size = this.size * scale;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${scale})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Manages the starfield animation
 */
class StarField {
    /**
     * Creates a new starfield animation
     * @param {string} canvasId - ID of the canvas element to use
     */
    constructor(canvasId) {
        // Initialize canvas and context with error checking
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found`);
        }
        
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        if (!this.ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        
        // Set initial canvas size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Create star field
        this.stars = Array(CONFIG.STAR_COUNT).fill()
                     .map(() => new Star(this.canvas));
        
        this.currentCenterX = this.canvas.width / 2;
        this.currentCenterY = this.canvas.height / 2;
        
        // Bind animation method and track frame for cleanup
        this.boundAnimate = this.animate.bind(this);
        this.animationFrame = null;
        
        this.bindEvents();
        this.animate();
    }

    /**
     * Sets up event listeners with debouncing
     */
    bindEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(() => this.resize(), 100);
        });
    }

    /**
     * Handles window resize events
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.currentCenterX = this.canvas.width / 2;
        this.currentCenterY = this.canvas.height / 2;
    }

    /**
     * Cleans up resources and event listeners
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        window.removeEventListener('resize', this.boundResize);
        this.stars = null;
        this.ctx = null;
        this.canvas = null;
    }

    /**
     * Main animation loop
     */
    animate() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.stars.forEach(star => {
            star.update(this.currentCenterX, this.currentCenterY);
            star.draw(this.ctx);
        });
        
        this.animationFrame = requestAnimationFrame(this.boundAnimate);
    }
}

// Initialize starfield when DOM is ready
let starField = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        starField = new StarField('starfield');
    } catch (error) {
        console.error('Failed to initialize StarField:', error);
    }
});

// Clean up resources when page is unloaded
window.addEventListener('unload', () => {
    if (starField) {
        starField.destroy();
    }
}); 