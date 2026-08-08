const BEST_KEY = 'flappy-best-score-v3';

const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: 360,
  height: 640,
  backgroundColor: 0x70c5ce,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1100 }, debug: false }
  },
  scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let bird, pipes, sensors, score = 0, scoreText, bestText, bestScore = 0;
let isGameOver = false, isStarted = false, difficulty = 1;
let ground, pipeTimer, gameOverTexts = [];
let jumpSound, scoreSound, dieSound;

function preload() {
  const birdG = this.make.graphics({ x: 0, y: 0, add: false });
  birdG.fillStyle(0xffd700); birdG.fillCircle(18, 18, 15);
  birdG.fillStyle(0xfff8dc); birdG.fillCircle(16, 22, 9);
  birdG.fillStyle(0xffa500); birdG.fillEllipse(10, 18, 14, 8);
  birdG.fillStyle(0xff4500); birdG.fillTriangle(30, 16, 42, 18, 30, 22);
  birdG.fillStyle(0xffffff); birdG.fillCircle(24, 12, 5);
  birdG.fillStyle(0x000000); birdG.fillCircle(25, 12, 2.5);
  birdG.generateTexture('bird', 48, 36);

  const pipeG = this.make.graphics({ x: 0, y: 0, add: false });
  pipeG.fillStyle(0x2ecc71); pipeG.fillRect(5, 0, 50, 400);
  pipeG.fillStyle(0x27ae60); pipeG.fillRect(0, 0, 60, 25); pipeG.fillRect(0, 375, 60, 25);
  pipeG.lineStyle(2, 0x1e8449); pipeG.strokeRect(5, 0, 50, 400);
  pipeG.generateTexture('pipe', 60, 400);

  const groundG = this.make.graphics({ x: 0, y: 0, add: false });
  groundG.fillStyle(0xded895); groundG.fillRect(0, 0, 400, 80);
  groundG.fillStyle(0xc2a83e);
  for (let i = 0; i < 20; i++) groundG.fillRect(i * 20, 0, 10, 12);
  groundG.generateTexture('ground', 400, 80);

  const bgG = this.make.graphics({ x: 0, y: 0, add: false });
  bgG.fillStyle(0x70c5ce); bgG.fillRect(0, 0, 360, 640);
  bgG.fillStyle(0xffffff, 0.7);
  bgG.fillCircle(60, 90, 28); bgG.fillCircle(90, 85, 35); bgG.fillCircle(120, 95, 25);
  bgG.fillCircle(220, 140, 30); bgG.fillCircle(250, 130, 38); bgG.fillCircle(280, 145, 22);
  bgG.generateTexture('bg', 360, 640);
}

function create() {
  this.add.image(180, 320, 'bg').setDepth(0);
  ground = this.add.tileSprite(180, 600, 400, 80, 'ground').setDepth(5);

  const stored = localStorage.getItem(BEST_KEY);
  bestScore = stored ? parseInt(stored, 10) : 0;

  bird = this.physics.add.sprite(90, 300, 'bird');
  bird.setDepth(10);
  bird.body.setSize(26, 22);
  bird.body.setOffset(8, 5);
  bird.body.allowGravity = false;

  pipes = this.physics.add.group();
  sensors = this.physics.add.group();

  scoreText = this.add.text(180, 40, '0', {
    font: 'bold 48px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 6
  }).setOrigin(0.5).setDepth(20);

  bestText = this.add.text(12, 12, 'Best: ' + bestScore, {
    font: '16px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
  }).setDepth(20);

  const startMsg = this.add.text(180, 380, 'Touche pour commencer', {
    font: '20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);
  gameOverTexts.push(startMsg);

  this.input.on('pointerdown', onTap, this);
  this.input.keyboard.on('keydown-SPACE', onTap, this);
  this.physics.add.overlap(bird, pipes, hitPipe, null, this);

  createSounds();
  isGameOver = false;
  isStarted = false;
  difficulty = 1;
}

function createSounds() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    jumpSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(480, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(320, ac.currentTime + 0.1);
      g.gain.setValueAtTime(0.12, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.1);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.1);
    };
    scoreSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.1, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.15);
    };
    dieSound = () => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.4);
      g.gain.setValueAtTime(0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.4);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.4);
    };
  } catch (e) {
    jumpSound = scoreSound = dieSound = () => {};
  }
}

function update() {
  if (!isGameOver) ground.tilePositionX += 2 * difficulty;
  if (!isStarted || isGameOver) return;

  const targetRotation = Phaser.Math.Clamp(bird.body.velocity.y / 400, -0.7, 1.2);
  bird.rotation = Phaser.Math.Linear(bird.rotation, targetRotation, 0.1);

  pipes.getChildren().forEach(p => { if (p.x < -80) pipes.remove(p, true, true); });
  sensors.getChildren().forEach(s => { if (s.x < -80) sensors.remove(s, true, true); });

  sensors.getChildren().forEach(s => {
    if (!s.scored && s.body && s.body.x < bird.x) {
      s.scored = true;
      incrementScore();
    }
  });

  if (bird.y > 560 || bird.y < 10) endGame.call(this);
}

function onTap() {
  if (isGameOver) { restart.call(this); return; }
  if (!isStarted) startGame.call(this);
  bird.setVelocityY(-380);
  jumpSound();
}

function startGame() {
  isStarted = true;
  bird.body.allowGravity = true;
  gameOverTexts.forEach(t => t.destroy());
  gameOverTexts = [];

  pipeTimer = this.time.addEvent({
    delay: 1400,
    callback: addPipes,
    callbackScope: this,
    loop: true
  });
}

function addPipes() {
  if (isGameOver) return;

  const gap = Math.max(125, 165 - difficulty * 5);
  const holeY = Phaser.Math.Between(130, 490 - gap);
  const x = 420;
  const speed = -185 - (difficulty * 14);

  const top = this.physics.add.sprite(x, holeY - gap / 2 - 200, 'pipe');
  top.setImmovable(true);
  top.body.allowGravity = false;
  top.setVelocityX(speed);
  top.setDisplaySize(70, 400);
  top.setFlipY(true);
  top.setDepth(3);
  pipes.add(top);

  const bottom = this.physics.add.sprite(x, holeY + gap / 2 + 200, 'pipe');
  bottom.setImmovable(true);
  bottom.body.allowGravity = false;
  bottom.setVelocityX(speed);
  bottom.setDisplaySize(70, 400);
  bottom.setDepth(3);
  pipes.add(bottom);

  const sensor = this.add.zone(x + 20, 320, 8, 640);
  this.physics.world.enable(sensor);
  sensor.body.setAllowGravity(false);
  sensor.body.setVelocityX(speed);
  sensor.scored = false;
  sensors.add(sensor);
}

function incrementScore() {
  score += 1;
  scoreText.setText(score);
  scoreSound();

  if (score % 5 === 0) difficulty += 0.4;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_KEY, bestScore);
    bestText.setText('Best: ' + bestScore);
  }
}

function hitPipe() {
  endGame.call(this);
}

function endGame() {
  if (isGameOver) return;
  isGameOver = true;
  dieSound();

  pipes.getChildren().forEach(p => { if (p.body) p.body.setVelocityX(0); });
  sensors.getChildren().forEach(s => { if (s.body) s.body.setVelocityX(0); });
  if (pipeTimer) pipeTimer.remove();

  const go = this.add.text(180, 260, 'GAME OVER', {
    font: 'bold 42px Arial', fill: '#ff3333', stroke: '#000000', strokeThickness: 6
  }).setOrigin(0.5).setDepth(30);

  const sc = this.add.text(180, 330, 'Score : ' + score, {
    font: '26px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(30);

  const again = this.add.text(180, 390, 'Touche pour rejouer', {
    font: '18px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(30);

  gameOverTexts = [go, sc, again];
}

function restart() {
  pipes.clear(true, true);
  sensors.clear(true, true);
  gameOverTexts.forEach(t => t.destroy());
  gameOverTexts = [];

  score = 0;
  difficulty = 1;
  isGameOver = false;
  isStarted = false;

  scoreText.setText('0');
  bestText.setText('Best: ' + bestScore);

  bird.setPosition(90, 300);
  bird.setVelocity(0, 0);
  bird.rotation = 0;
  bird.body.allowGravity = false;

  const startMsg = this.add.text(180, 380, 'Touche pour commencer', {
    font: '20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(20);
  gameOverTexts.push(startMsg);
}
