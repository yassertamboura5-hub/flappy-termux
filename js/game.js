const BEST_KEY = 'flappy-v8';

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

let bird;
let pipes;
let score = 0;
let scoreText;
let bestText;
let bestScore = 0;
let isGameOver = false;
let isStarted = false;
let ground;
let pipeTimer;
let gameOverTexts = [];

function preload() {
  const birdGfx = this.make.graphics({ x: 0, y: 0, add: false });
  birdGfx.fillStyle(0xffd700);
  birdGfx.fillCircle(16, 16, 14);
  birdGfx.fillStyle(0xff6600);
  birdGfx.fillTriangle(28, 13, 40, 16, 28, 20);
  birdGfx.fillStyle(0xffffff);
  birdGfx.fillCircle(20, 11, 4);
  birdGfx.fillStyle(0x000000);
  birdGfx.fillCircle(21, 11, 2);
  birdGfx.generateTexture('bird', 44, 32);

  const pipeGfx = this.make.graphics({ x: 0, y: 0, add: false });
  pipeGfx.fillStyle(0x2ecc71);
  pipeGfx.fillRect(0, 0, 70, 500);
  pipeGfx.fillStyle(0x27ae60);
  pipeGfx.fillRect(0, 0, 70, 30);
  pipeGfx.fillRect(0, 470, 70, 30);
  pipeGfx.generateTexture('pipe', 70, 500);

  const groundGfx = this.make.graphics({ x: 0, y: 0, add: false });
  groundGfx.fillStyle(0xded895);
  groundGfx.fillRect(0, 0, 400, 100);
  groundGfx.fillStyle(0xc2a83e);
  for (let i = 0; i < 20; i++) {
    groundGfx.fillRect(i * 20, 0, 12, 15);
  }
  groundGfx.generateTexture('ground', 400, 100);
}

function create() {
  this.add.rectangle(180, 320, 360, 640, 0x70c5ce);

  ground = this.add.tileSprite(180, 610, 400, 100, 'ground');
  ground.setDepth(5);

  bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0');

  bird = this.physics.add.sprite(80, 300, 'bird');
  bird.setDepth(10);
  bird.body.setSize(28, 24);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();

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
}

function update() {
  if (!isGameOver) {
    ground.tilePositionX += 3;
  }

  if (!isStarted || isGameOver) return;

  bird.angle = Phaser.Math.Clamp(bird.body.velocity.y * 0.08, -30, 60);

  pipes.getChildren().forEach(function(pipe) {
    if (pipe.isTopPipe && !pipe.hasScored && pipe.x < bird.x - 10) {
      pipe.hasScored = true;
      score = score + 1;
      scoreText.setText(score);

      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(BEST_KEY, bestScore);
        bestText.setText('Best: ' + bestScore);
      }
    }

    if (pipe.x < -100) {
      pipe.destroy();
    }
  });

  if (bird.y > 560 || bird.y < 15) {
    hitObstacle.call(this);
  }
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

    pipeTimer = this.time.addEvent({
      delay: 1600,
      callback: createObstacle,
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

function hitObstacle() {
  if (isGameOver) return;

  isGameOver = true;
  bird.setVelocity(0, 0);

  pipes.getChildren().forEach(function(pipe) {
    pipe.setVelocityX(0);
  });

  if (pipeTimer) {
    pipeTimer.remove();
  }

  const goText = this.add.text(180, 230, 'GAME OVER', {
    fontSize: '42px',
    color: '#ff2222',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5).setDepth(30);

  const scoreMsg = this.add.text(180, 300, 'Score : ' + score, {
    fontSize: '26px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5).setDepth(30);

  const againText = this.add.text(180, 360, 'Touche pour rejouer', {
    fontSize: '18px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5).setDepth(30);

  // === CRÉDIT EN BAS ===
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
