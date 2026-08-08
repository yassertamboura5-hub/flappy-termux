const BEST_KEY = 'flappy-best-v4';

const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: 360,
  height: 640,
  backgroundColor: 0x70c5ce,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1000 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let bird, pipes, score = 0, scoreText, bestText, bestScore = 9999999;
let isGameOver = false, isStarted = false;
let ground, pipeTimer, gameOverTexts = [];
let jumpSound, scoreSound, dieSound;

function preload() {
  // Oiseau
  const g = this.make.graphics({x:0,y:0,add:false});
  g.fillStyle(0xffd700); g.fillCircle(18,18,15);
  g.fillStyle(0xfff8dc); g.fillCircle(16,22,9);
  g.fillStyle(0xffa500); g.fillEllipse(10,18,14,8);
  g.fillStyle(0xff4500); g.fillTriangle(30,16,42,18,30,22);
  g.fillStyle(0xffffff); g.fillCircle(24,12,5);
  g.fillStyle(0x000000); g.fillCircle(25,12,2.5);
  g.generateTexture('bird', 48, 36);

  // Tuyau
  const p = this.make.graphics({x:0,y:0,add:false});
  p.fillStyle(0x2ecc71); p.fillRect(0,0,60,400);
  p.fillStyle(0x27ae60); p.fillRect(0,0,60,20); p.fillRect(0,380,60,20);
  p.generateTexture('pipe', 60, 400);

  // Sol
  const s = this.make.graphics({x:0,y:0,add:false});
  s.fillStyle(0xded895); s.fillRect(0,0,400,80);
  s.fillStyle(0xc2a83e);
  for(let i=0;i<20;i++) s.fillRect(i*20,0,10,12);
  s.generateTexture('ground', 400, 80);

  // Fond
  const b = this.make.graphics({x:0,y:0,add:false});
  b.fillStyle(0x70c5ce); b.fillRect(0,0,360,640);
  b.fillStyle(0xffffff,0.6);
  b.fillCircle(70,90,30); b.fillCircle(100,80,40); b.fillCircle(130,95,25);
  b.fillCircle(240,140,35); b.fillCircle(270,130,40); b.fillCircle(300,145,25);
  b.generateTexture('bg', 360, 640);
}

function create() {
  this.add.image(180, 320, 'bg');
  ground = this.add.tileSprite(180, 600, 400, 80, 'ground').setDepth(5);

  bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0');

  bird = this.physics.add.sprite(80, 300, 'bird');
  bird.setDepth(10);
  bird.body.setSize(28, 24);
  bird.body.setOffset(6, 4);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();

  scoreText = this.add.text(180, 50, '0', {
    font: 'bold 52px Arial', fill: '#fff', stroke: '#000', strokeThickness: 6
  }).setOrigin(0.5).setDepth(20);

  bestText = this.add.text(12, 12, 'Best: ' + bestScore, {
    font: '18px Arial', fill: '#fff', stroke: '#000', strokeThickness: 3
  }).setDepth(20);

  const startMsg = this.add.text(180, 400, 'Touche pour commencer', {
    font: '22px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);
  gameOverTexts.push(startMsg);

  this.input.on('pointerdown', onTap, this);
  this.input.keyboard.on('keydown-SPACE', onTap, this);
  this.physics.add.overlap(bird, pipes, hitPipe, null, this);

  createSounds();
}

function createSounds() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    jumpSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = 500;
      g.gain.value = 0.1; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.08);
    };
    scoreSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 900;
      g.gain.value = 0.1; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.1);
    };
    dieSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 200;
      g.gain.value = 0.15; o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.3);
    };
  } catch(e) {
    jumpSound = scoreSound = dieSound = () => {};
  }
}

function update() {
  if (!isGameOver) ground.tilePositionX += 3;
  if (!isStarted || isGameOver) return;

  // Rotation oiseau
  bird.rotation = Phaser.Math.Clamp(bird.body.velocity.y / 450, -0.6, 1.1);

  // Supprimer tuyaux hors écran + compter le score
  pipes.getChildren().forEach(pipe => {
    if (pipe.x < -50) {
      pipes.remove(pipe, true, true);
    }

    // Score : quand le tuyau du haut passe derrière l'oiseau
    if (pipe.isTop && !pipe.scored && pipe.x < bird.x - 30) {
      pipe.scored = true;
      score++;
      scoreText.setText(score);
      scoreSound();
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(BEST_KEY, bestScore);
        bestText.setText('Best: ' + bestScore);
      }
    }
  });

  // Collision sol / plafond
  if (bird.y > 560 || bird.y < 20) {
    endGame.call(this);
  }
}

function onTap() {
  if (isGameOver) {
    restart.call(this);
    return;
  }
  if (!isStarted) {
    startGame.call(this);
  }
  bird.setVelocityY(-360);
  jumpSound();
}

function startGame() {
  isStarted = true;
  bird.body.allowGravity = true;
  gameOverTexts.forEach(t => t.destroy());
  gameOverTexts = [];

  // Premier tuyau immédiat + ensuite toutes les 1.5s
  addPipes.call(this);
  pipeTimer = this.time.addEvent({
    delay: 1500,
    callback: addPipes,
    callbackScope: this,
    loop: true
  });
}

function addPipes() {
  if (isGameOver) return;

  const gap = 150;
  const holeY = Phaser.Math.Between(140, 420);
  const x = 400;
  const speed = -200;

  // Tuyau HAUT
  const top = this.physics.add.sprite(x, holeY - gap/2 - 200, 'pipe');
  top.setImmovable(true);
  top.body.allowGravity = false;
  top.setVelocityX(speed);
  top.setDisplaySize(70, 400);
  top.setFlipY(true);
  top.isTop = true;
  top.scored = false;
  pipes.add(top);

  // Tuyau BAS
  const bottom = this.physics.add.sprite(x, holeY + gap/2 + 200, 'pipe');
  bottom.setImmovable(true);
  bottom.body.allowGravity = false;
  bottom.setVelocityX(speed);
  bottom.setDisplaySize(70, 400);
  pipes.add(bottom);
}

function hitPipe() {
  endGame.call(this);
}

function endGame() {
  if (isGameOver) return;
  isGameOver = true;
  dieSound();

  pipes.getChildren().forEach(p => {
    if (p.body) p.body.setVelocityX(0);
  });
  if (pipeTimer) pipeTimer.remove();

  const go = this.add.text(180, 260, 'GAME OVER', {
    font: 'bold 42px Arial', fill: '#ff3333', stroke: '#000', strokeThickness: 6
  }).setOrigin(0.5).setDepth(30);

  const sc = this.add.text(180, 330, 'Score : ' + score, {
    font: '26px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(30);

  const again = this.add.text(180, 390, 'Touche pour rejouer', {
    font: '18px Arial', fill: '#fff', stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(30);

  gameOverTexts = [go, sc, again];
}

function restart() {
  pipes.clear(true, true);
  gameOverTexts.forEach(t => t.destroy());
  gameOverTexts = [];

  score = 0;
  isGameOver = false;
  isStarted = false;
  scoreText.setText('0');

  bird.setPosition(80, 300);
  bird.setVelocity(0, 0);
  bird.rotation = 0;
  bird.body.allowGravity = false;

  const startMsg = this.add.text(180, 400, 'Touche pour commencer', {
    font: '22px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);
  gameOverTexts.push(startMsg);
    }
