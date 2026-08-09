const BEST_KEY = 'flappy-v11';

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
let coinCount = 0, coinText;
let isGameOver = false, isStarted = false;
let ground, pipeTimer, coinTimer;
let gameOverTexts = [];
let bgMusic = null;

function preload() {

  // ===== PETIT OISEAU BLEU =====
  let g = this.make.graphics({ x: 0, y: 0, add: false });

  // Corps bleu
  g.fillStyle(0x3498db);
  g.fillCircle(20, 22, 15);

  // Aile
  g.fillStyle(0x2980b9);
  g.fillEllipse(14, 27, 16, 10);

  // Œil blanc
  g.fillStyle(0xffffff);
  g.fillCircle(25, 16, 6);

  // Pupille
  g.fillStyle(0x000000);
  g.fillCircle(27, 16, 3);

  // Bec jaune
  g.fillStyle(0xf1c40f);
  g.fillTriangle(34, 21, 43, 25, 34, 29);

  // Petite queue
  g.fillStyle(0x2980b9);
  g.fillTriangle(7, 22, 0, 15, 3, 28);

  // Sourcil
  g.lineStyle(2, 0x1f5f8b);
  g.lineBetween(22, 9, 29, 8);

  g.generateTexture('bird', 45, 40);

  // ===== TUYAU =====
  g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x2ecc71);
  g.fillRect(0, 0, 70, 500);
  g.fillStyle(0x27ae60);
  g.fillRect(0, 0, 70, 30);
  g.fillRect(0, 470, 70, 30);
  g.generateTexture('pipe', 70, 500);

  // ===== SOL =====
  g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xded895);
  g.fillRect(0, 0, 400, 100);
  g.fillStyle(0xc2a83e);

  for (let i = 0; i < 20; i++) {
    g.fillRect(i * 20, 0, 12, 15);
  }

  g.generateTexture('ground', 400, 100);

  // ===== PIÈCE =====
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

  ground = this.add.tileSprite(
    180, 610, 400, 100, 'ground'
  ).setDepth(5);

  bestScore = parseInt(
    localStorage.getItem(BEST_KEY) || '0'
  );

  // ===== OISEAU =====
  bird = this.physics.add.sprite(
    80, 300, 'bird'
  );

  bird.setDepth(10);
  bird.body.setSize(28, 28);
  bird.body.setOffset(5, 6);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();
  coins = this.physics.add.group();

  // ===== SCORE =====
  scoreText = this.add.text(180, 40, '0', {
    fontSize: '48px',
    fontFamily: 'Arial Black',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5).setDepth(20);

  // ===== MEILLEUR SCORE =====
  bestText = this.add.text(
    12, 12,
    'Best: ' + bestScore,
    {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }
  ).setDepth(20);

  // ===== COMPTEUR DE PIÈCES =====
  coinText = this.add.text(
    345, 12,
    '🪙 0',
    {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }
  ).setOrigin(1, 0).setDepth(20);

  this.startText = this.add.text(
    180, 380,
    'Touche pour commencer',
    {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }
  ).setOrigin(0.5).setDepth(20);

  this.input.on(
    'pointerdown',
    onTap,
    this
  );

  this.input.keyboard.on(
    'keydown-SPACE',
    onTap,
    this
  );

  this.physics.add.overlap(
    bird,
    pipes,
    hitObstacle,
    null,
    this
  );

  this.physics.add.overlap(
    bird,
    coins,
    collectCoin,
    null,
    this
  );

  createMusic();
}

function createMusic() {

  try {

    const ac = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const notes = [
      262, 294, 330, 349,
      392, 440, 494, 523
    ];

    let noteIndex = 0;

    bgMusic = setInterval(() => {

      if (isGameOver || !isStarted) return;

      const o = ac.createOscillator();
      const g = ac.createGain();

      o.type = 'triangle';
      o.frequency.value =
        notes[noteIndex % notes.length];

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

  if (!isGameOver) {
    ground.tilePositionX += 3;
  }

  if (!isStarted || isGameOver) return;

  bird.angle = Phaser.Math.Clamp(
    bird.body.velocity.y * 0.08,
    -30,
    50
  );

  pipes.getChildren().forEach(pipe => {

    if (
      pipe.isTopPipe &&
      !pipe.hasScored &&
      pipe.x < bird.x - 10
    ) {

      pipe.hasScored = true;

      score += 1;
      scoreText.setText(score);

      if (score > bestScore) {

        bestScore = score;

        localStorage.setItem(
          BEST_KEY,
          bestScore
        );

        bestText.setText(
          'Best: ' + bestScore
        );
      }
    }

    if (pipe.x < -100) {
      pipe.destroy();
    }
  });

  coins.getChildren().forEach(coin => {

    if (coin.x < -50) {
      coin.destroy();
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

  const topPipe = pipes.create(
    x,
    topY - 250,
    'pipe'
  );

  topPipe.setDisplaySize(70, 500);
  topPipe.body.allowGravity = false;
  topPipe.setVelocityX(-200);
  topPipe.setImmovable(true);
  topPipe.setFlipY(true);
  topPipe.isTopPipe = true;
  topPipe.hasScored = false;

  const bottomPipe = pipes.create(
    x,
    topY + gap + 250,
    'pipe'
  );

  bottomPipe.setDisplaySize(70, 500);
  bottomPipe.body.allowGravity = false;
  bottomPipe.setVelocityX(-200);
  bottomPipe.setImmovable(true);
}

function createCoin() {

  if (isGameOver) return;

  const y = Phaser.Math.Between(
    120,
    480
  );

  const coin = coins.create(
    420,
    y,
    'coin'
  );

  coin.setVelocityX(-180);
  coin.body.allowGravity = false;
  coin.setScale(1.3);
}

function collectCoin(bird, coin) {

  coin.destroy();

  // +1 pièce
  coinCount++;

  coinText.setText(
    '🪙 ' + coinCount
  );

  // +2 score
  score += 2;

  scoreText.setText(score);

  if (score > bestScore) {

    bestScore = score;

    localStorage.setItem(
      BEST_KEY,
      bestScore
    );

    bestText.setText(
      'Best: ' + bestScore
    );
  }
}

function hitObstacle() {

  if (isGameOver) return;

  isGameOver = true;

  bird.setVelocity(0, 0);

  pipes.getChildren().forEach(
    p => p.setVelocityX(0)
  );

  coins.getChildren().forEach(
    c => c.setVelocityX(0)
  );

  if (pipeTimer) {
    pipeTimer.remove();
  }

  if (coinTimer) {
    coinTimer.remove();
  }

  const goText = this.add.text(
    180, 200,
    'GAME OVER',
    {
      fontSize: '42px',
      color: '#ff2222',
      stroke: '#000000',
      strokeThickness: 6
    }
  ).setOrigin(0.5).setDepth(30);

  const scoreMsg = this.add.text(
    180, 270,
    'Score : ' + score,
    {
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }
  ).setOrigin(0.5).setDepth(30);

  const coinMsg = this.add.text(
    180, 310,
    '🪙 Pièces : ' + coinCount,
    {
      fontSize: '22px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4
    }
  ).setOrigin(0.5).setDepth(30);

  const againText = this.add.text(
    180, 360,
    'Touche pour rejouer',
    {
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }
  ).setOrigin(0.5).setDepth(30);

  const credit = this.add.text(
    180, 520,
    'Créé par Yasser Tamboura',
    {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }
  ).setOrigin(0.5).setDepth(30);

  gameOverTexts = [
    goText,
    scoreMsg,
    coinMsg,
    againText,
    credit
  ];
}

function restartGame() {

  gameOverTexts.forEach(
    t => t.destroy()
  );

  gameOverTexts = [];

  pipes.clear(true, true);
  coins.clear(true, true);

  score = 0;
  coinCount = 0;

  isGameOver = false;
  isStarted = false;

  scoreText.setText('0');

  coinText.setText('🪙 0');

  bird.setPosition(80, 300);
  bird.setVelocity(0, 0);
  bird.angle = 0;

  bird.body.allowGravity = false;

  this.startText = this.add.text(
    180, 380,
    'Touche pour commencer',
    {
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }
  ).setOrigin(0.5).setDepth(20);
      }
