// Initialize Matter.js
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Bodies = Matter.Bodies;

const engine = Engine.create();
const world = engine.world;

const w = window.innerWidth;
const h = window.innerHeight;

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
render.canvas.style.zIndex = '100'; // above bg, below text
/* removed pointer events none */


const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const mouse = Mouse.create(render.canvas);
const mConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
Composite.add(world, mConstraint);
render.mouse = mouse;

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// Emoji Textures
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
const flowerTextures = flowers.map(emoji => createEmojiTexture(emoji));
const basketTexture = createEmojiTexture('🧺', 100, 80);

// Walls and Floor
const thickness = 400;
const leftWall = Bodies.rectangle(-thickness/2, h/2, thickness, h*2, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(w + thickness/2, h/2, thickness, h*2, { isStatic: true, render: { visible: false } });
const floor = Bodies.rectangle(w/2, h + thickness/2, w*2, thickness, { isStatic: true, render: { visible: false } });
const ceiling = Bodies.rectangle(w/2, -thickness/2, w*2, thickness, { isStatic: true, render: { visible: false } });

Composite.add(world, [leftWall, rightWall, floor, ceiling]);

// Wait for layout to calculate text and image size
setTimeout(() => {
    const textEl = document.getElementById('final-text');
    const textRect = textEl.getBoundingClientRect();
    
    // Create static body for the text block so flowers bounce off it
    const textBody = Bodies.rectangle(textRect.left + textRect.width/2, textRect.top + textRect.height/2, textRect.width, textRect.height, {
        isStatic: true,
        restitution: 0.8,
        render: { visible: false }
    });

    const imgEl = document.getElementById('final-img');
    const imgRect = imgEl.getBoundingClientRect();
    
    // Create static body for the image
    const imgBody = Bodies.rectangle(imgRect.left + imgRect.width/2, imgRect.top + imgRect.height/2, imgRect.width, imgRect.height, {
        isStatic: true,
        restitution: 0.8,
        render: { visible: false }
    });

    Composite.add(world, [textBody, imgBody]);
}, 200);

// Moving basket
const basket = Bodies.rectangle(w/2, h - 100, 100, 100, {
    isStatic: true,
    isSensor: true,
    render: {
        sprite: { texture: basketTexture }
    }
});
Composite.add(world, basket);

let time = 0;
let isDone = false;
Events.on(engine, 'beforeUpdate', function() {
    if (isDone) {
        Matter.Body.translate(basket, { x: 0, y: 10 });
        return;
    }
    time += 0.02;
    const margin = 100;
    const amplitude = (w / 2) - margin;
    const newX = w/2 + Math.sin(time) * amplitude;
    Matter.Body.setPosition(basket, { x: newX, y: h - 100 });

    const basketVelX = Math.cos(time) * amplitude * 0.02;
    spawnFlower(basketVelX);
});

let spawnAllowed = true;
var end = Date.now() + 5000;

(function frame() {
  // Continuous side cannons
  confetti({
    particleCount: 15,
    angle: 60,
    spread: 80,
    origin: { x: 0, y: 1 },
    colors: ['#FF90E8', '#fff', '#000', '#FFD700'],
    zIndex: 1001
  });
  confetti({
    particleCount: 15,
    angle: 120,
    spread: 80,
    origin: { x: 1, y: 1 },
    colors: ['#FF90E8', '#fff', '#000', '#FFD700'],
    zIndex: 1001
  });

  // Random firework sparkle bursts in the sky
  if (Math.random() < 0.3) {
    confetti({
      particleCount: 50,
      spread: 360,
      startVelocity: 30,
      origin: { x: Math.random(), y: Math.random() * 0.8 },
      colors: ['#FFD700', '#fff'],
      zIndex: 1001,
      ticks: 60 // shorter lifespan for a 'sparkle' burst
    });
  }

  if (Date.now() < end) {
    requestAnimationFrame(frame);
  }
}());

setTimeout(() => {
    spawnAllowed = false;
    Composite.remove(world, basket); // remove the basket
}, 5000);

function spawnFlower(basketVelX) {
    if (!spawnAllowed) return;
    
    const allFlowers = world.bodies.filter(b => b.circleRadius === 20);
    if (allFlowers.length > 3000) {
        isDone = true;
        return;
    }

    if (Math.random() < 0.2) return; // limit spawn rate slightly

    const streamAngles = [-5, 0, 5]; 
    for(let i = 0; i < 3; i++) {
        const tex = flowerTextures[Math.floor(Math.random() * flowerTextures.length)];
        const spawnX = basket.position.x + (Math.random() * 10 - 5);
        const flower = Bodies.circle(spawnX, basket.position.y - 40, 20, {
            restitution: 0.4,
            friction: 0.05,
            render: {
                sprite: {
                    texture: tex,
                    xScale: 0.8,
                    yScale: 0.8
                }
            }
        });
        
        const velocityX = basketVelX * 0.3 + streamAngles[i] + (Math.random() * 2 - 1);
        const velocityY = -25 - (Math.random() * 5); // Shoot upwards
        Matter.Body.setVelocity(flower, { x: velocityX, y: velocityY });
        Composite.add(world, flower);
    }
}
