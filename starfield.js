const TWO_PI = Math.PI * 2;

/**
 * Configuration constants for the starfield animation
 */
const CONFIG = {
    STAR_COUNT: 500,        // Total number of stars in the field
    MAX_DISTANCE: 1500,     // Maximum Z distance for stars (depth)
    MIN_DISTANCE: 10,       // Minimum starting distance from center
    TRANSITION_SPEED: 0.1,  // Speed of center point transitions (0-1)
    BASE_SPEED: 3,          // Base movement speed of stars
    SPEED_VARIANCE: 2,      // Random variance in star speed
    BASE_SIZE: 0.5,         // Base size of stars in pixels
    SIZE_VARIANCE: 1,       // Random variance in star size
    EXPANSION_RATE: 100,    // Rate at which stars spread out from center
};

/**
 * Represents a single star in the starfield
 */
class Star {
    /**
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.startingDistance = CONFIG.MIN_DISTANCE;
        this.maxDistance = CONFIG.MAX_DISTANCE;
        this.originX = window.innerWidth / 2;
        this.originY = window.innerHeight / 2;
        this.reset();
    }

    /**
     * Resets star to initial state with random properties.
     * @param {boolean} atMaxDistance - Place at max depth (true when recycling, false on init)
     */
    reset(atMaxDistance = false) {
        this.angle = Math.random() * TWO_PI;
        this.z = atMaxDistance ? this.maxDistance : Math.random() * this.maxDistance;

        const progress = (this.maxDistance - this.z) / this.maxDistance;
        const currentDistance = this.startingDistance + (progress * CONFIG.EXPANSION_RATE);
        this.x = Math.cos(this.angle) * currentDistance;
        this.y = Math.sin(this.angle) * currentDistance;

        this.speed = CONFIG.BASE_SPEED + Math.random() * CONFIG.SPEED_VARIANCE;
        this.size = CONFIG.BASE_SIZE + Math.random() * CONFIG.SIZE_VARIANCE;
    }

    /**
     * Updates star position and handles origin transitions.
     * @param {number} targetOriginX - Target center X coordinate
     * @param {number} targetOriginY - Target center Y coordinate
     */
    update(targetOriginX, targetOriginY) {
        this.z -= this.speed;

        if (this.z <= 0) {
            this.reset(true);
            // New stars snap to the current origin immediately
            this.originX = targetOriginX;
            this.originY = targetOriginY;
        } else {
            // Existing stars glide toward the new origin
            const t = CONFIG.TRANSITION_SPEED;
            this.originX += (targetOriginX - this.originX) * t;
            this.originY += (targetOriginY - this.originY) * t;
        }

        const scale = this.canvas.width / this.z;
        this.screenX = this.x * scale + this.originX;
        this.screenY = this.y * scale + this.originY;

        const progress = (this.maxDistance - this.z) / this.maxDistance;
        const currentDistance = this.startingDistance + (progress * CONFIG.EXPANSION_RATE);
        this.x = Math.cos(this.angle) * currentDistance;
        this.y = Math.sin(this.angle) * currentDistance;
    }

    /**
     * @returns {boolean} True if star is within canvas bounds
     */
    isVisible() {
        return this.screenX >= 0 &&
               this.screenX <= this.canvas.width &&
               this.screenY >= 0 &&
               this.screenY <= this.canvas.height;
    }

    /**
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        if (!this.isVisible()) return;

        const scale = (CONFIG.MAX_DISTANCE - this.z) / CONFIG.MAX_DISTANCE;
        const size = this.size * scale;

        ctx.fillStyle = `rgba(255, 255, 255, ${scale})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, size, 0, TWO_PI);
        ctx.fill();
    }
}

/**
 * Manages the starfield animation
 */
class StarField {
    /**
     * @param {string} canvasId - ID of the canvas element to use
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found`);
        }

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        if (!this.ctx) {
            throw new Error('Could not get 2D context from canvas');
        }

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.stars = Array.from({ length: CONFIG.STAR_COUNT }, () => new Star(this.canvas));

        this.currentCenterX = this.canvas.width / 2;
        this.currentCenterY = this.canvas.height / 2;

        this.boundAnimate = this.animate.bind(this);
        this.animationFrame = null;

        this.bindEvents();
        this.animate();
    }

    bindEvents() {
        let resizeTimeout;
        this.boundResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.resize(), 100);
        };
        window.addEventListener('resize', this.boundResize);

        // Move the vanishing point to follow the cursor
        this.boundMouseMove = (e) => {
            this.currentCenterX = e.clientX;
            this.currentCenterY = e.clientY;
        };
        window.addEventListener('mousemove', this.boundMouseMove);

        // Return to center when the cursor leaves the window
        this.boundMouseLeave = () => {
            this.currentCenterX = this.canvas.width / 2;
            this.currentCenterY = this.canvas.height / 2;
        };
        document.addEventListener('mouseleave', this.boundMouseLeave);

        // Pause rendering when the tab is hidden to save resources
        this.boundVisibilityChange = () => {
            if (document.hidden) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            } else if (!this.animationFrame) {
                this.animate();
            }
        };
        document.addEventListener('visibilitychange', this.boundVisibilityChange);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.currentCenterX = this.canvas.width / 2;
        this.currentCenterY = this.canvas.height / 2;
    }

    destroy() {
        cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseleave', this.boundMouseLeave);
        document.removeEventListener('visibilitychange', this.boundVisibilityChange);
        this.stars = null;
        this.ctx = null;
        this.canvas = null;
    }

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

let starField = null;
document.addEventListener('DOMContentLoaded', () => {
    try {
        starField = new StarField('starfield');
    } catch (error) {
        console.error('Failed to initialize StarField:', error);
    }
});

// pagehide is more reliable than unload for cleanup
window.addEventListener('pagehide', () => {
    if (starField) {
        starField.destroy();
    }
});
