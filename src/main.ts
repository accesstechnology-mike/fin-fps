import './style.css'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

// Custom Bullet class to handle bullet behavior
class Bullet extends THREE.Mesh {
  direction: THREE.Vector3
  velocity: number

  constructor(direction: THREE.Vector3, velocity: number) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8)
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    super(geometry, material)
    this.direction = direction
    this.velocity = velocity
  }

  update(delta: number): void {
    const moveX = this.direction.x * this.velocity * delta
    const moveY = this.direction.y * this.velocity * delta
    const moveZ = this.direction.z * this.velocity * delta
    
    this.position.x += moveX
    this.position.y += moveY
    this.position.z += moveZ
  }
}

// Game state
const gameState = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  canJump: false,
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  prevTime: performance.now(),
  health: 100,
  score: 0,
  ammo: 30,
  maxAmmo: 30,
  reloading: false,
  weaponSway: {
    time: 0,
    intensity: 0.03,
    recoverySpeed: 0.1
  },
  weaponRecoil: 0
}

// Bullets array
const bullets: Bullet[] = []
const bulletSpeed = 20

// Scene setup
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)
scene.fog = new THREE.Fog(0x000000, 0, 500)

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.y = 1.6 // Eye height

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// Controls setup
const controls = new PointerLockControls(camera, document.body)

// Setup crosshair
const crosshair = document.createElement('div')
crosshair.className = 'crosshair'
document.body.appendChild(crosshair)

// Light setup
const ambientLight = new THREE.AmbientLight(0x404040)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
directionalLight.position.set(1, 1, 1)
directionalLight.castShadow = true
scene.add(directionalLight)

// Floor setup
const floorGeometry = new THREE.PlaneGeometry(100, 100, 32, 32)
floorGeometry.rotateX(-Math.PI / 2)
const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x404040,
  roughness: 0.8
})
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.receiveShadow = true
scene.add(floor)

// Create walls for the environment
function createWall(width: number, height: number, depth: number, position: THREE.Vector3, color: number = 0x8888ff) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({ color });
  const wall = new THREE.Mesh(geometry, material);
  wall.position.copy(position);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  return wall;
}

// Create a custom Enemy class
class Enemy extends THREE.Group {
  health: number;
  speed: number;
  state: 'idle' | 'chase' | 'attack';
  lastAttackTime: number;
  attackCooldown: number;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  animationTime: number;

  constructor(position: THREE.Vector3) {
    super();
    
    // Initialize properties
    this.health = 100;
    this.speed = 2 + Math.random() * 2; // Random speed between 2-4
    this.state = 'idle';
    this.lastAttackTime = 0;
    this.attackCooldown = 1000; // 1 second between attacks
    this.animationTime = Math.random() * 10; // Random start time for animations
    
    // Create humanoid shape
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffccaa,
      roughness: 0.7,
      metalness: 0.1
    });
    this.head = new THREE.Mesh(headGeometry, headMaterial);
    this.head.position.y = 1.75;
    this.head.castShadow = true;
    this.add(this.head);
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.25, 1, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,  // Dark clothing
      roughness: 0.8,
      metalness: 0.1
    });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.position.y = 1;
    this.body.castShadow = true;
    this.add(this.body);
    
    // Arms
    const armGeometry = new THREE.CapsuleGeometry(0.08, 0.7, 4, 6);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffccaa,
      roughness: 0.7,
      metalness: 0.1
    });
    
    // Left arm
    this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
    this.leftArm.position.set(0.35, 1.15, 0);
    this.leftArm.rotation.z = -0.2;
    this.leftArm.castShadow = true;
    this.add(this.leftArm);
    
    // Right arm
    this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
    this.rightArm.position.set(-0.35, 1.15, 0);
    this.rightArm.rotation.z = 0.2;
    this.rightArm.castShadow = true;
    this.add(this.rightArm);
    
    // Legs
    const legGeometry = new THREE.CapsuleGeometry(0.1, 0.9, 4, 6);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,  // Dark trousers
      roughness: 0.8, 
      metalness: 0.1
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(0.15, 0.45, 0);
    leftLeg.castShadow = true;
    this.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(-0.15, 0.45, 0);
    rightLeg.castShadow = true;
    this.add(rightLeg);
    
    // Add some variety to enemies
    const hairColors = [0x553300, 0x222222, 0x886633, 0xddbb88, 0xff0000];
    const skinTones = [0xffccaa, 0xffe0bd, 0xd1a36b, 0x8d5524];
    const clothingColors = [0x333333, 0x224466, 0x442222, 0x444444, 0x336633];
    
    // Randomize appearance
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    const skinTone = skinTones[Math.floor(Math.random() * skinTones.length)];
    const clothingColor = clothingColors[Math.floor(Math.random() * clothingColors.length)];
    
    // Apply random colors
    (this.head.material as THREE.MeshStandardMaterial).color.setHex(skinTone);
    (this.body.material as THREE.MeshStandardMaterial).color.setHex(clothingColor);
    (this.leftArm.material as THREE.MeshStandardMaterial).color.setHex(skinTone);
    (this.rightArm.material as THREE.MeshStandardMaterial).color.setHex(skinTone);
    
    // Add hair (simple cap on top of head)
    const hairGeometry = new THREE.SphereGeometry(0.26, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMaterial = new THREE.MeshStandardMaterial({ 
      color: hairColor,
      roughness: 1.0
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.75;
    hair.position.y += 0.025;
    hair.castShadow = true;
    this.add(hair);
    
    // Face (simple texture pattern using small geometries)
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.1, 1.8, 0.2);
    this.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.1, 1.8, 0.2);
    this.add(rightEye);
    
    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.02, 4, 4);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0.1, 1.8, 0.24);
    this.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(-0.1, 1.8, 0.24);
    this.add(rightPupil);
    
    // Mouth
    const mouthGeometry = new THREE.BoxGeometry(0.2, 0.03, 0.01);
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.65, 0.24);
    this.add(mouth);
    
    // Position the entire enemy
    this.position.copy(position);
    this.castShadow = true;
    this.receiveShadow = true;
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    this.animationTime += delta;
    
    // State machine for enemy behavior
    if (distanceToPlayer < 2) {
      this.state = 'attack';
    } else if (distanceToPlayer < 20) {
      this.state = 'chase';
    } else {
      this.state = 'idle';
    }
    
    // Handle behavior based on state
    switch (this.state) {
      case 'chase':
        // Move towards player
        const direction = new THREE.Vector3()
          .subVectors(playerPosition, this.position)
          .normalize();
        
        // Make enemy face player
        this.lookAt(new THREE.Vector3(playerPosition.x, this.position.y, playerPosition.z));
        
        // Only move on the xz plane (don't fly up to the player)
        direction.y = 0;
        
        // Move towards player
        this.position.add(direction.multiplyScalar(this.speed * delta));
        
        // Walking animation
        this.leftArm.rotation.x = Math.sin(this.animationTime * 5) * 0.5;
        this.rightArm.rotation.x = -Math.sin(this.animationTime * 5) * 0.5;
        break;
        
      case 'attack':
        // Face player when attacking
        this.lookAt(new THREE.Vector3(playerPosition.x, this.position.y, playerPosition.z));
        
        // Attack the player on cooldown
        const now = performance.now();
        if (now - this.lastAttackTime > this.attackCooldown) {
          // Attack animation
          this.rightArm.rotation.x = -Math.PI / 2;
          
          setTimeout(() => {
            this.rightArm.rotation.x = 0;
          }, 200);
          
          this.attackPlayer();
          this.lastAttackTime = now;
        }
        break;
        
      case 'idle':
        // Idle animation - gentle swaying
        this.leftArm.rotation.x = Math.sin(this.animationTime * 0.5) * 0.1;
        this.rightArm.rotation.x = Math.sin(this.animationTime * 0.5 + 0.5) * 0.1;
        break;
    }
  }
  
  attackPlayer(): void {
    // Deal damage to player
    gameState.health -= 10;
    
    // Check if player is dead
    if (gameState.health <= 0) {
      gameState.health = 0;
      showGameOver();
    }
    
    // Update the UI
    updateUI();
  }
  
  takeDamage(amount: number): boolean {
    this.health -= amount;
    
    // Visual damage effect - tint red when hit
    this.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        // Store original color if needed
        if (!(child as any).originalColor) {
          (child as any).originalColor = child.material.color.clone();
        }
        
        // Flash red
        child.material.color.set(0xff0000);
        
        // Revert to original color after a short delay
        setTimeout(() => {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            // Apply damage effect to original color (darker/more damaged)
            const damagePercent = 1 - (this.health / 100);
            const originalColor = (child as any).originalColor.clone();
            
            // Blend towards darker color as health decreases
            const r = originalColor.r * (1 - damagePercent * 0.5);
            const g = originalColor.g * (1 - damagePercent * 0.7);
            const b = originalColor.b * (1 - damagePercent * 0.7);
            
            child.material.color.setRGB(r, g, b);
          }
        }, 100);
      }
    });
    
    // Return true if enemy was killed
    return this.health <= 0;
  }
}

// Create enemies
function createEnemy(position: THREE.Vector3) {
  const enemy = new Enemy(position);
  scene.add(enemy);
  return enemy;
}

// Build environment
// Create the walls without storing them in an unused variable
createWall(100, 10, 1, new THREE.Vector3(0, 5, -50)); // Back wall
createWall(100, 10, 1, new THREE.Vector3(0, 5, 50));  // Front wall
createWall(1, 10, 100, new THREE.Vector3(-50, 5, 0)); // Left wall
createWall(1, 10, 100, new THREE.Vector3(50, 5, 0));  // Right wall

// Create obstacles
createWall(10, 5, 10, new THREE.Vector3(-20, 2.5, -15), 0x88aaff)
createWall(5, 3, 15, new THREE.Vector3(15, 1.5, 10), 0xaaffaa)
createWall(8, 7, 3, new THREE.Vector3(5, 3.5, -25), 0xffccaa)

// Create enemies
const enemies = [
  createEnemy(new THREE.Vector3(-15, 1, -10)),
  createEnemy(new THREE.Vector3(20, 1, -20)),
  createEnemy(new THREE.Vector3(10, 1, 15)),
  createEnemy(new THREE.Vector3(-25, 1, 20)),
]

// Event listeners
const onKeyDown = function (event: KeyboardEvent) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      gameState.moveForward = true
      break
    case 'ArrowLeft':
    case 'KeyA':
      gameState.moveLeft = true
      break
    case 'ArrowDown':
    case 'KeyS':
      gameState.moveBackward = true
      break
    case 'ArrowRight':
    case 'KeyD':
      gameState.moveRight = true
      break
    case 'Space':
      if (gameState.canJump === true) {
        gameState.velocity.y += 350
      }
      gameState.canJump = false
      break
  }
}

const onKeyUp = function (event: KeyboardEvent) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      gameState.moveForward = false
      break
    case 'ArrowLeft':
    case 'KeyA':
      gameState.moveLeft = false
      break
    case 'ArrowDown':
    case 'KeyS':
      gameState.moveBackward = false
      break
    case 'ArrowRight':
    case 'KeyD':
      gameState.moveRight = false
      break
  }
}

// Health and Score UI
const gameUI = document.createElement('div')
gameUI.className = 'game-ui'
gameUI.innerHTML = `
  <div class="health-bar">Health: ${gameState.health}</div>
  <div class="ammo-counter">Ammo: ${gameState.ammo}/${gameState.maxAmmo}</div>
`
document.body.appendChild(gameUI)

const scoreUI = document.createElement('div')
scoreUI.className = 'score-ui'
scoreUI.textContent = `Score: ${gameState.score}`
document.body.appendChild(scoreUI)

// Update UI function
function updateUI() {
  const healthBar = document.querySelector('.health-bar') as HTMLElement
  const ammoCounter = document.querySelector('.ammo-counter') as HTMLElement
  const scoreDisplay = document.querySelector('.score-ui') as HTMLElement
  
  if (healthBar) healthBar.textContent = `Health: ${gameState.health}`
  if (ammoCounter) ammoCounter.textContent = `Ammo: ${gameState.ammo}/${gameState.maxAmmo}`
  if (scoreDisplay) scoreDisplay.textContent = `Score: ${gameState.score}`
}

// Create weapon model
const createWeaponModel = () => {
  const weaponGroup = new THREE.Group();
  
  // Gun body (main part)
  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
  );
  gunBody.position.z = -0.3;
  weaponGroup.add(gunBody);
  
  // Gun handle
  const gunHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.25, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.8 })
  );
  gunHandle.position.y = -0.2;
  gunHandle.position.z = -0.1;
  weaponGroup.add(gunHandle);
  
  // Gun barrel
  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.1 })
  );
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.z = -0.5;
  gunBarrel.position.y = 0.05;
  weaponGroup.add(gunBarrel);
  
  // Trigger
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.06, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  trigger.position.y = -0.1;
  trigger.position.z = -0.1;
  weaponGroup.add(trigger);

  // Position the entire weapon
  weaponGroup.position.set(0.24, -0.25, -0.5);
  
  return weaponGroup;
};

// Create a muzzle flash effect
const createMuzzleFlash = () => {
  const muzzleFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.MeshBasicMaterial({ 
      color: 0xffff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    })
  );
  
  // Position at end of gun barrel
  muzzleFlash.position.set(0.24, -0.2, -0.85);
  muzzleFlash.scale.set(0, 0, 0); // Hidden initially
  
  return muzzleFlash;
};

// Create weapon and add to camera
const weapon = createWeaponModel();
camera.add(weapon);
scene.add(camera);

// Create muzzle flash and add to camera
const muzzleFlash = createMuzzleFlash();
camera.add(muzzleFlash);

// Weapon bobbing animation
const updateWeaponPosition = (delta: number) => {
  if (!controls.isLocked) return;
  
  // Add natural sway
  gameState.weaponSway.time += delta * 1.5;
  
  // Calculate weapon sway based on movement and time
  const swayX = Math.sin(gameState.weaponSway.time * 2) * gameState.weaponSway.intensity;
  const swayY = Math.cos(gameState.weaponSway.time * 1.5) * gameState.weaponSway.intensity * 0.5;
  
  // Add more pronounced bobbing when moving
  if (gameState.moveForward || gameState.moveBackward || gameState.moveLeft || gameState.moveRight) {
    // Walking cycle animation
    const walkCycleX = Math.sin(gameState.weaponSway.time * 5) * 0.03;
    const walkCycleY = Math.abs(Math.sin(gameState.weaponSway.time * 10)) * 0.02;
    
    weapon.position.x = 0.24 + walkCycleX + swayX;
    weapon.position.y = -0.25 - walkCycleY + swayY;
  } else {
    // Subtle idle sway
    weapon.position.x = 0.24 + swayX;
    weapon.position.y = -0.25 + swayY;
  }
  
  // Apply recoil and recovery
  if (gameState.weaponRecoil > 0) {
    weapon.position.z = -0.5 - gameState.weaponRecoil;
    weapon.rotation.x = gameState.weaponRecoil * 1.5;
    gameState.weaponRecoil -= delta * 5; // Recover from recoil
    
    if (gameState.weaponRecoil < 0) {
      gameState.weaponRecoil = 0;
    }
  } else {
    weapon.position.z = -0.5;
    weapon.rotation.x = 0;
  }
};

// Enhanced shooting mechanics for GoldenEye style
function shoot() {
  if (gameState.ammo <= 0 || gameState.reloading) {
    // Click sound for empty weapon
    return;
  }
  
  // Get the direction the camera is facing
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  
  // Create the bullet
  const bullet = new Bullet(direction, bulletSpeed);
  
  // Position bullet at end of gun barrel
  bullet.position.copy(camera.position);
  bullet.position.add(direction.clone().multiplyScalar(0.8));
  
  scene.add(bullet);
  bullets.push(bullet);
  
  // Add recoil effect
  gameState.weaponRecoil = 0.1;
  
  // Show muzzle flash
  muzzleFlash.scale.set(1, 1, 1);
  muzzleFlash.visible = true;
  muzzleFlash.rotation.z = Math.random() * Math.PI * 2; // Random rotation for variation
  
  // Hide muzzle flash after a short delay
  setTimeout(() => {
    muzzleFlash.scale.set(0, 0, 0);
    muzzleFlash.visible = false;
  }, 50);
  
  // Decrease ammo
  gameState.ammo--;
  updateUI();
}

// Add weapon reload animation
function reload() {
  if (gameState.reloading || gameState.ammo === gameState.maxAmmo) return;
  
  gameState.reloading = true;
  
  // Reload animation
  const startRotation = weapon.rotation.x;
  const reloadDuration = 2000; // 2 seconds
  const startTime = performance.now();
  
  // Animation function
  function animateReload() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / reloadDuration, 1);
    
    if (progress < 0.5) {
      // Moving weapon down and rotated
      weapon.rotation.x = startRotation + (Math.PI / 4) * (progress / 0.5);
      weapon.position.y = -0.25 - 0.2 * (progress / 0.5);
    } else {
      // Moving weapon back up
      weapon.rotation.x = (Math.PI / 4) * (1 - ((progress - 0.5) / 0.5));
      weapon.position.y = -0.45 + 0.2 * ((progress - 0.5) / 0.5);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animateReload);
    } else {
      // Reset position and finish reloading
      weapon.rotation.x = startRotation;
      weapon.position.y = -0.25;
      gameState.ammo = gameState.maxAmmo;
      gameState.reloading = false;
      updateUI();
    }
  }
  
  // Start the animation
  animateReload();
}

// Add reload listener
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR') {
    reload();
  }
});

// Click to shoot
document.addEventListener('click', () => {
  if (controls.isLocked) {
    shoot()
  } else {
    controls.lock()
  }
})

document.addEventListener('keydown', onKeyDown)
document.addEventListener('keyup', onKeyUp)

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Lock/unlock pointer
const instructions = document.createElement('div')
instructions.className = 'instructions'
instructions.innerHTML = `
  <div class="instructions-content">
    <h1>GoldenEye FPS</h1>
    <p>Click to play</p>
    <p>WASD or Arrow Keys = Move</p>
    <p>Mouse = Look</p>
    <p>Click = Shoot</p>
    <p>R = Reload Weapon</p>
    <p>ESC = Pause</p>
  </div>
`
document.body.appendChild(instructions)

controls.addEventListener('lock', () => {
  instructions.style.display = 'none'
})

controls.addEventListener('unlock', () => {
  instructions.style.display = 'flex'
})

// Game over screen
function showGameOver() {
  // Unlock controls
  controls.unlock();
  
  // Create game over screen
  const gameOverScreen = document.createElement('div');
  gameOverScreen.className = 'game-over';
  gameOverScreen.innerHTML = `
    <h1>Game Over</h1>
    <p>Final Score: ${gameState.score}</p>
    <button id="restart-button">Try Again</button>
  `;
  document.body.appendChild(gameOverScreen);
  
  // Show the game over screen
  gameOverScreen.style.display = 'flex';
  
  // Add restart button listener
  const restartButton = document.getElementById('restart-button');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      // Reset game state
      gameState.health = 100;
      gameState.score = 0;
      gameState.ammo = gameState.maxAmmo;
      
      // Remove game over screen
      document.body.removeChild(gameOverScreen);
      
      // Respawn enemies
      respawnEnemies();
      
      // Update UI
      updateUI();
      
      // Lock controls again
      controls.lock();
    });
  }
}

// Function to respawn enemies
function respawnEnemies() {
  // Remove old enemies from scene
  for (const enemy of enemies) {
    scene.remove(enemy);
  }
  
  // Clear enemies array
  enemies.length = 0;
  
  // Create new enemies
  enemies.push(
    createEnemy(new THREE.Vector3(-15, 1, -10)),
    createEnemy(new THREE.Vector3(20, 1, -20)),
    createEnemy(new THREE.Vector3(10, 1, 15)),
    createEnemy(new THREE.Vector3(-25, 1, 20))
  );
}

// Game loop
function animate() {
  requestAnimationFrame(animate)
  
  // Only update if controls are locked
  if (controls.isLocked) {
    const time = performance.now()
    const delta = (time - gameState.prevTime) / 1000
    
    // Movement
    gameState.velocity.x -= gameState.velocity.x * 10.0 * delta
    gameState.velocity.z -= gameState.velocity.z * 10.0 * delta
    gameState.velocity.y -= 9.8 * 100.0 * delta // Gravity
    
    gameState.direction.z = Number(gameState.moveForward) - Number(gameState.moveBackward)
    gameState.direction.x = Number(gameState.moveRight) - Number(gameState.moveLeft)
    gameState.direction.normalize()
    
    if (gameState.moveForward || gameState.moveBackward) {
      gameState.velocity.z -= gameState.direction.z * 400.0 * delta
    }
    if (gameState.moveLeft || gameState.moveRight) {
      gameState.velocity.x -= gameState.direction.x * 400.0 * delta
    }
    
    controls.moveRight(-gameState.velocity.x * delta)
    controls.moveForward(-gameState.velocity.z * delta)
    
    camera.position.y += gameState.velocity.y * delta
    
    if (camera.position.y < 1.6) {
      gameState.velocity.y = 0
      camera.position.y = 1.6
      gameState.canJump = true
    }
    
    // Update weapon position with movement
    updateWeaponPosition(delta);
    
    // Update enemies
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i] as Enemy;
      enemy.update(delta, camera.position);
    }
    
    // Update bullets
    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i]
      bullet.update(delta)
      
      // Check for bullet collisions with enemies
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j] as Enemy;
        if (bullet.position.distanceTo(enemy.position) < 1.5) {
          // Deal damage to enemy
          const killed = enemy.takeDamage(50);
          
          // Remove bullet
          scene.remove(bullet);
          bullets.splice(i, 1);
          i--;
          
          // If enemy was killed, remove it and update score
          if (killed) {
            scene.remove(enemy);
            enemies.splice(j, 1);
            
            // Update score when enemy is killed
            gameState.score += 100;
            updateUI();
          }
          
          break;
        }
      }
      
      // Remove bullets that have traveled too far
      if (bullet.position.distanceTo(camera.position) > 100) {
        scene.remove(bullet)
        bullets.splice(i, 1)
        i--
      }
    }
    
    gameState.prevTime = time
  }
  
  renderer.render(scene, camera)
}

animate()
