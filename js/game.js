const BEST_KEY = 'flappy-v10';

const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: 360,
  height: 640,
  backgroundColor: 0x70c5ce,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1100 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

new Phaser.Game(config);

let bird, pipes, coins;
let score = 0, scoreText, bestText, bestScore = 0;
let isGameOver = false, isStarted = false;
let ground, pipeTimer, coinTimer;
let gameOverTexts = [];
let bgMusic = null;

function preload() {
  // ===== FUSÉE =====
  let g = this.make.graphics({ x: 0, y: 0, add: false });
  
  // Corps de la fusée (rouge)
  g.fillStyle(0xe74c3c);
  g.fillRect(10, 4, 20, 28);
  
  // Pointe (blanc)
  g.fillStyle(0xecf0f1);
  g.fillTriangle(10, 4, 20, -6, 30, 4);
  
  // Hublot
  g.fillStyle(0x3498db);
  g.fillCircle(20, 14, 5);
  g.fillStyle(0xffffff);
  g.fillCircle(20, 14, 2.5);
  
  // Ailerons
  g.fillStyle(0xc0392b);
  g.fillTriangle(10, 26, 2, 34, 10, 32);
  g.fillTriangle(30, 26, 38, 34, 30, 32);
  
  // Flammes
  g.fillStyle(0xf39c12);
  g.fillTriangle(14, 32, 20, 44, 26, 32);
  g.fillStyle(0xf1c40f);
  g.fillTriangle(16, 32, 20, 40, 24, 32);
  
  g.generateTexture('bird', 40, 48);

  // Tuyau
  g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x2ecc71);
  g.fillRect(0, 0, 70, 500);
  g.fillStyle(0x27ae60);
  g.fillRect(0, 0, 70, 30);
  g.fillRect(0, 470, 70, 30);
  g.generateTexture('pipe', 70, 500);

  // Sol
  g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xded895);
  g.fillRect(0, 0, 400, 100);
  g.fillStyle(0xc2a83e);
  for (let i = 0; i < 20; i++) g.fillRect(i * 20, 0, 12, 15);
  g.generateTexture('ground', 400, 100);

  // Pièce
  g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffd700);
  g.fillCircle(12, 12, 11);
  g.fillStyle(0xffa500);
  g.fillCircle(12, 12, 7);
  g.fillStyle(0xffd700);
  g.fillCircle(12, 12, 4);
  g.generateTexture('coin', 24, 24);
}

function create() {
  this.add.rectangle(180, 320, 360, 640, 0x70c5ce);

  ground = this.add.tileSprite(180, 610, 400, 100, 'ground').setDepth(5);

  bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0');

  bird = this.physics.add.sprite(80, 300, 'bird');
  bird.setDepth(10);
  bird.body.setSize(26, 36);
  bird.body.setOffset(7, 4);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();
  coins = this.physics.add.group();

  scoreText = this.add.text(180, 40, '0', {
    fontSize: '48px',
    fontFamily: 'Arial Black',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5).setDepth(20);

  bestText = this.add.text(12, 12, 'Best: ' + bestScore, {
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setDepth(20);

  this.startText = this.add.text(180, 380, 'Touche pour commencer', {
    fontSize: '20px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);

  this.input.on('pointerdown', onTap, this);
  this.input.keyboard.on('keydown-SPACE', onTap, this);

  this.physics.add.overlap(bird, pipes, hitObstacle, null, this);
  this.physics.add.overlap(bird, coins, collectCoin, null, this);

  createMusic();
}

function createMusic() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [262, 294, 330, 349, 392, 440, 494, 523];
    let noteIndex = 0;

    bgMusic = setInterval(() => {
      if (isGameOver || !isStarted) return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = notes[noteIndex % notes.length];
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.2);
      noteIndex++;
    }, 350);
  } catch (e) {
    bgMusic = null;
  }
}

function update() {
  if (!isGameOver) ground.tilePositionX += 3;
  if (!isStarted || isGameOver) return;

  bird.angle = Phaser.Math.Clamp(bird.body.velocity.y * 0.08, -30, 50);

  pipes.getChildren().forEach(pipe => {
    if (pipe.isTopPipe && !pipe.hasScored && pipe.x < bird.x - 10) {
      pipe.hasScored = true;
      score += 1;
      scoreText.setText(score);
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(BEST_KEY, bestScore);
        bestText.setText('Best: ' + bestScore);
      }
    }
    if (pipe.x < -100) pipe.destroy();
  });

  coins.getChildren().forEach(coin => {
    if (coin.x < -50) coin.destroy();
  });

  if (bird.y > 560 || bird.y < 15) hitObstacle.call(this);
}

function onTap() {
  if (isGameOver) {
    restartGame.call(this);
    return;
  }

  if (!isStarted) {
    isStarted = true;
    bird.body.allowGravity = true;
    this.startText.destroy();

    createObstacle.call(this);
    createCoin.call(this);

    pipeTimer = this.time.addEvent({
      delay: 1600,
      callback: createObstacle,
      callbackScope: this,
      loop: true
    });

    coinTimer = this.time.addEvent({
      delay: 1200,
      callback: createCoin,
      callbackScope: this,
      loop: true
    });
  }

  bird.setVelocityY(-370);
}

function createObstacle() {
  if (isGameOver) return;

  const gap = 160;
  const topY = Phaser.Math.Between(100, 300);
  const x = 420;

  const topPipe = pipes.create(x, topY - 250, 'pipe');
  topPipe.setDisplaySize(70, 500);
  topPipe.body.allowGravity = false;
  topPipe.setVelocityX(-200);
  topPipe.setImmovable(true);
  topPipe.setFlipY(true);
  topPipe.isTopPipe = true;
  topPipe.hasScored = false;

  const bottomPipe = pipes.create(x, topY + gap + 250, 'pipe');
  bottomPipe.setDisplaySize(70, 500);
  bottomPipe.body.allowGravity = false;
  bottomPipe.setVelocityX(-200);
  bottomPipe.setImmovable(true);
}

function createCoin() {
  if (isGameOver) return;

  const y = Phaser.Math.Between(120, 480);
  const coin = coins.create(420, y, 'coin');
  coin.setVelocityX(-180);
  coin.body.allowGravity = false;
  coin.setScale(1.3);
}

function collectCoin(bird, coin) {
  coin.destroy();
  score += 2;
  scoreText.setText(score);

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_KEY, bestScore);
    bestText.setText('Best: ' + bestScore);
  }
}

function hitObstacle() {
  if (isGameOver) return;
  isGameOver = true;
  bird.setVelocity(0, 0);

  pipes.getChildren().forEach(p => p.setVelocityX(0));
  coins.getChildren().forEach(c => c.setVelocityX(0));

  if (pipeTimer) pipeTimer.remove();
  if (coinTimer) coinTimer.remove();

  const goText = this.add.text(180, 220, 'GAME OVER', {
    fontSize: '42px',
    color: '#ff2222',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5).setDepth(30);

  const scoreMsg = this.add.text(180, 290, 'Score : ' + score, {
    fontSize: '26px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5).setDepth(30);

  const againText = this.add.text(180, 350, 'Touche pour rejouer', {
    fontSize: '18px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(30);

  const credit = this.add.text(180, 520, 'Créé par Yasser Tamboura', {
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(30);

  gameOverTexts = [goText, scoreMsg, againText, credit];
}

function restartGame() {
  gameOverTexts.forEach(t => t.destroy());
  gameOverTexts = [];

  pipes.clear(true, true);
  coins.clear(true, true);

  score = 0;
  isGameOver = false;
  isStarted = false;
  scoreText.setText('0');

  bird.setPosition(80, 300);
  bird.setVelocity(0, 0);
  bird.angle = 0;
  bird.body.allowGravity = false;

  this.startText = this.add.text(180, 380, 'Touche pour commencer', {
    fontSize: '20px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);
    }
