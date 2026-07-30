// Initialize Matter.js
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      MouseConstraint = Matter.MouseConstraint,
      Mouse = Matter.Mouse,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Bodies = Matter.Bodies;

const engine = Engine.create();
const world = engine.world;

const w = window.innerWidth;
const h = window.innerHeight;

// Create renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: w,
        height: h,
        wireframes: false,
        background: 'transparent'
    }
});

render.canvas.style.position = 'absolute';
render.canvas.style.top = '0';
render.canvas.style.left = '0';
render.canvas.style.zIndex = '100';
render.canvas.style.pointerEvents = 'auto';

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Function to generate emoji texture
function createEmojiTexture(emoji, size = 64, fontSize = 50) {
    const canvas = document.createElement('canvas');
    canvas.width = size; 
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(emoji, size/2, size/2 + (fontSize * 0.1));
    return canvas.toDataURL();
}

const flowers = ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🏵️', '💮', '🪷'];
// Pre-generate textures
const flowerTextures = flowers.map(emoji => createEmojiTexture(emoji));
const basketTexture = createEmojiTexture('🧺', 100, 80);

// Create Walls and Floor
const thickness = 400; // Thick enough so fast objects don't clip through

const leftWall = Bodies.rectangle(-thickness/2, h, thickness, h*2, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(w + thickness/2, h, thickness, h*2, { isStatic: true, render: { visible: false } });
const floor = Bodies.rectangle(w/2, h + thickness/2, w*2, thickness, { isStatic: true, render: { visible: false } });

Composite.add(world, [leftWall, rightWall, floor]);

// Create moving basket
const basket = Bodies.rectangle(w/2, 200, 100, 100, {
    isStatic: true,
    isSensor: true, // don't collide with flowers
    render: {
        sprite: {
            texture: basketTexture
        }
    }
});
Composite.add(world, basket);

// Move basket back and forth
let time = 0;
let isDone = false;
Events.on(engine, 'beforeUpdate', function() {
    if (isDone) {
        // Fly the basket up out of the screen
        Matter.Body.translate(basket, { x: 0, y: -10 });
        return;
    }
    time += 0.015; // speed of basket
    // Oscillate between left and right margins
    const margin = 100;
    const amplitude = (w / 2) - margin;
    const newX = w/2 + Math.sin(time) * amplitude;
    Matter.Body.setPosition(basket, { x: newX, y: 200 });

    const basketVelX = Math.cos(time) * amplitude * 0.015;
    spawnFlower(basketVelX);
});

function spawnFlower() {
    // Stop spawning if the flowers pile up to a certain height
    const allFlowers = world.bodies.filter(b => b.circleRadius === 20);
    const flowerCount = allFlowers.length;
    let pileHeightReached = false;
    for(let f of allFlowers) {
        // If a flower is above the threshold (h / 1.3), below the fountain arc, AND is resting
        if(f.position.y < (h / 1.3) && f.position.y > (basket.position.y + 150) && f.speed < 1) {
            pileHeightReached = true;
            break;
        }
    }

    if (flowerCount > 2000 || pileHeightReached) {
        isDone = true;
        return; 
    }

    // Calculate basket's current horizontal velocity
    const amplitude = (w / 2) - 100;
    const basketVelX = Math.cos(time) * amplitude * 0.015;

    // 4 distinct streams shooting up and fanning out
    const streamAngles = [-8, -3, 3, 8]; 

    for(let i = 0; i < 4; i++) {
        const tex = flowerTextures[Math.floor(Math.random() * flowerTextures.length)];
        
        // Spawn at the top of the basket
        const spawnX = basket.position.x + (Math.random() * 4 - 2);
        const flower = Bodies.circle(spawnX, basket.position.y - 40, 20, {
            restitution: 0.1, 
            friction: 0.05,   
            render: {
                sprite: {
                    texture: tex,
                    xScale: 0.8, // even bigger emojis
                    yScale: 0.8
                }
            }
        });
        
        // Shooting upwards with a specific angle per stream
        const velocityX = basketVelX * 0.5 + streamAngles[i]; 
        const velocityY = -15 - (Math.random() * 2); 
        Matter.Body.setVelocity(flower, { x: velocityX, y: velocityY });

        Composite.add(world, flower);
    }
}


// Add Mouse Interaction
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});

Composite.add(world, mouseConstraint);
render.mouse = mouse;

// Handle window resize by just reloading to recalculate physics bodies
window.addEventListener('resize', () => {
    location.reload();
});

// Button Interaction Logic - Physics Integration
const yesBtn = document.getElementById('yes-btn');
const noBtn = document.getElementById('no-btn');

if (yesBtn && noBtn) {
    // Wait slightly to ensure CSS styling and layout are fully applied
    setTimeout(() => {
        const yesRect = yesBtn.getBoundingClientRect();
        const noRect = noBtn.getBoundingClientRect();

        // Move to document body so they can move freely across the entire screen
        document.body.appendChild(yesBtn);
        document.body.appendChild(noBtn);

        yesBtn.style.position = 'fixed';
        yesBtn.style.margin = '0';
        yesBtn.style.zIndex = '1000';

        noBtn.style.position = 'fixed';
        noBtn.style.margin = '0';
        noBtn.style.zIndex = '1000';
        
        // Remove transitions from both buttons so they don't lag behind the physics engine
        yesBtn.style.transition = 'none';
        noBtn.style.transition = 'none';

        // Create Matter.js bodies
        const yesBody = Bodies.rectangle(yesRect.left + yesRect.width/2, yesRect.top + yesRect.height/2, yesRect.width, yesRect.height, {
            isStatic: false, // YES button is now dynamic!
            frictionAir: 0.1, // higher friction to prevent crazy orbiting
            restitution: 0.5,
            render: { visible: false }
        });

        const noBody = Bodies.rectangle(noRect.left + noRect.width/2, noRect.top + noRect.height/2, noRect.width, noRect.height, {
            isStatic: false, // NO button is a dynamic object
            frictionAir: 0.05,
            restitution: 0.8,
            render: { visible: false }
        });

        Composite.add(world, [yesBody, noBody]);

        let mouseX = -1000;
        let mouseY = -1000;
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        Events.on(engine, 'beforeUpdate', () => {
            // Counteract gravity for both buttons so they float
            Matter.Body.applyForce(noBody, noBody.position, {
                x: 0,
                y: -noBody.mass * engine.world.gravity.y * engine.world.gravity.scale
            });
            Matter.Body.applyForce(yesBody, yesBody.position, {
                x: 0,
                y: -yesBody.mass * engine.world.gravity.y * engine.world.gravity.scale
            });

            // Run away from mouse
            const dx = noBody.position.x - mouseX;
            const dy = noBody.position.y - mouseY;
            const dist = Math.hypot(dx, dy);

            // If mouse is within 250px of NO button, trigger the chase sequence!
            if (dist < 250 && dist > 0) {
                // Push NO button away
                const forceX = (dx / dist) * 0.03 * noBody.mass;
                const forceY = (dy / dist) * 0.03 * noBody.mass;
                Matter.Body.applyForce(noBody, noBody.position, { x: forceX, y: forceY });

                // Aggressively pull YES button towards the cursor without orbiting
                const yesDx = mouseX - yesBody.position.x;
                const yesDy = mouseY - yesBody.position.y;
                // Directly set velocity for tight tracking
                Matter.Body.setVelocity(yesBody, { 
                    x: yesDx * 0.15, 
                    y: yesDy * 0.15 
                });
            } else {
                // Gently return YES button to its starting position if we aren't chasing NO
                const homeDx = (yesRect.left + yesRect.width/2) - yesBody.position.x;
                const homeDy = (yesRect.top + yesRect.height/2) - yesBody.position.y;
                Matter.Body.setVelocity(yesBody, {
                    x: homeDx * 0.05,
                    y: homeDy * 0.05
                });
            }
            
            // Keep NO button roughly within bounds
            const margin = 100;
            if (noBody.position.x < margin) Matter.Body.applyForce(noBody, noBody.position, { x: 0.005 * noBody.mass, y: 0 });
            if (noBody.position.x > w - margin) Matter.Body.applyForce(noBody, noBody.position, { x: -0.005 * noBody.mass, y: 0 });
            if (noBody.position.y < margin) Matter.Body.applyForce(noBody, noBody.position, { x: 0, y: 0.005 * noBody.mass });
            if (noBody.position.y > h - margin) Matter.Body.applyForce(noBody, noBody.position, { x: 0, y: -0.005 * noBody.mass });

            // Sync DOM elements to Physics bodies
            yesBtn.style.left = (yesBody.position.x - yesRect.width/2) + 'px';
            yesBtn.style.top = (yesBody.position.y - yesRect.height/2) + 'px';
            yesBtn.style.transform = `rotate(${yesBody.angle}rad)`;
            
            noBtn.style.left = (noBody.position.x - noRect.width/2) + 'px';
            noBtn.style.top = (noBody.position.y - noRect.height/2) + 'px';
            noBtn.style.transform = `rotate(${noBody.angle}rad)`;
        });

        yesBtn.addEventListener('click', () => window.location.href = 'success.html');
        noBtn.addEventListener('click', () => window.location.href = 'success.html');

    }, 100); // 100ms delay to let layout calculate
}
