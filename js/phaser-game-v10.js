const PORTRAIT = window.innerHeight > window.innerWidth;
const VIEW_W = PORTRAIT ? 720 : 1280;
const VIEW_H = PORTRAIT ? 1280 : 720;
const COLS = PORTRAIT ? 9 : 12;
const ROWS = PORTRAIT ? 15 : 7;
const CELL = PORTRAIT ? 64 : 80;
const MAZE_W = COLS * CELL;
const MAZE_H = ROWS * CELL;
const OX = Math.round((VIEW_W - MAZE_W) / 2);
const OY = PORTRAIT ? 165 : 105;
const STAR_COUNT = 5;

const ui = {
  stars: document.querySelector('#stars'),
  keys: document.querySelector('#keys'),
  message: document.querySelector('#message'),
  sensor: document.querySelector('#sensor-status'),
  intro: document.querySelector('#intro')
};

let joystickVector = { x: 0, y: 0 };
let tiltVector = { x: 0, y: 0 };
let sensorActive = false;

function flash(text) {
  ui.message.textContent = text;
  ui.message.classList.add('show');
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => ui.message.classList.remove('show'), 1100);
}

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMaze(cols, rows, seed = Date.now()) {
  const random = mulberry32(seed);
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ t: 1, r: 1, b: 1, l: 1, seen: false }))
  );
  let x = 0;
  let y = 0;
  const stack = [];
  cells[0][0].seen = true;

  while (true) {
    const options = [];
    if (y > 0 && !cells[y - 1][x].seen) options.push([x, y - 1, 't', 'b']);
    if (x < cols - 1 && !cells[y][x + 1].seen) options.push([x + 1, y, 'r', 'l']);
    if (y < rows - 1 && !cells[y + 1][x].seen) options.push([x, y + 1, 'b', 't']);
    if (x > 0 && !cells[y][x - 1].seen) options.push([x - 1, y, 'l', 'r']);

    if (options.length) {
      const [nx, ny, here, there] = options[Math.floor(random() * options.length)];
      cells[y][x][here] = 0;
      cells[ny][nx][there] = 0;
      stack.push([x, y]);
      x = nx;
      y = ny;
      cells[y][x].seen = true;
    } else if (stack.length) {
      [x, y] = stack.pop();
    } else {
      break;
    }
  }

  const extraOpenings = Math.max(8, Math.floor(cols * rows * 0.07));
  for (let i = 0; i < extraOpenings; i++) {
    x = Math.floor(random() * cols);
    y = Math.floor(random() * rows);
    if (x < cols - 1 && random() > 0.5) {
      cells[y][x].r = 0;
      cells[y][x + 1].l = 0;
    } else if (y < rows - 1) {
      cells[y][x].b = 0;
      cells[y + 1][x].t = 0;
    }
  }
  return cells;
}

class GardenScene extends Phaser.Scene {
  constructor() {
    super('garden');
    this.collected = 0;
    this.hasKey = false;
    this.gateOpen = false;
    this.finished = false;
  }

  create() {
    this.createTextures();
    this.maze = makeMaze(COLS, ROWS);
    this.drawBackdrop();
    this.drawGardenFloor();
    this.createMazeWalls();
    this.decorateGarden();
    this.createCollectibles();
    this.createPlayer();
    this.createEffects();
    this.setupControls();
    this.cameras.main.fadeIn(450, 255, 255, 255);
  }

  createTextures() {
    const g = this.make.graphics({ add: false });

    // Organic hedge segment: dark foundation plus many individual leaves.
    g.fillStyle(0x255f20).fillRoundedRect(2, 13, 92, 47, 17);
    g.fillStyle(0x3d8b28).fillRoundedRect(4, 7, 88, 47, 18);
    const leafColors = [0x65b933, 0x7dcb3d, 0x93dc49, 0x4fa42c];
    for (let i = 0; i < 26; i++) {
      const px = 8 + (i % 9) * 10 + ((i * 7) % 5);
      const py = 10 + ((i * 13) % 31);
      g.fillStyle(leafColors[i % leafColors.length]);
      g.fillEllipse(px, py, 14 + (i % 3) * 2, 10 + (i % 2) * 3);
    }
    for (let i = 0; i < 7; i++) {
      g.fillStyle(i % 2 ? 0xffcf45 : 0xffffff);
      g.fillCircle(10 + i * 13, 10 + ((i * 17) % 24), 2.2);
    }
    g.lineStyle(3, 0xb8ef61, 0.75).strokeRoundedRect(5, 7, 86, 43, 17);
    g.generateTexture('hedge', 96, 64);
    g.clear();

    // Stone path tile, deliberately irregular so it never reads as a grid.
    g.fillStyle(0x9bba58).fillRect(0, 0, 96, 96);
    const stones = [
      [7, 11, 28, 19, -0.15], [40, 5, 34, 22, 0.08], [73, 19, 20, 28, -0.1],
      [4, 43, 35, 27, 0.1], [43, 37, 28, 20, -0.14], [63, 61, 31, 26, 0.16],
      [15, 75, 34, 18, -0.04]
    ];
    stones.forEach(([x, y, w, h, r], index) => {
      g.fillStyle(index % 2 ? 0xd6bd72 : 0xc8ab60).fillRoundedRect(x, y, w, h, 8);
      g.lineStyle(2, 0x8c793f, 0.38).strokeRoundedRect(x, y, w, h, 8);
      g.fillStyle(0xffefb1, 0.35).fillEllipse(x + w * 0.35, y + h * 0.28, w * 0.35, h * 0.18);
    });
    g.generateTexture('path', 96, 96);
    g.clear();

    // Lili, larger and more expressive than the old technical sprite.
    g.fillStyle(0x6a3b78, 0.22).fillEllipse(52, 79, 62, 18);
    g.fillStyle(0xffffff).fillEllipse(49, 57, 61, 43);
    g.fillStyle(0xffeff9).fillEllipse(68, 39, 39, 37);
    g.fillStyle(0xffffff).fillCircle(74, 32, 24);
    g.fillStyle(0xff8dcc).fillTriangle(58, 18, 64, 1, 72, 21);
    g.fillStyle(0xffd641).fillTriangle(64, 17, 68, -2, 73, 18);
    g.fillStyle(0xe94b9d).fillEllipse(41, 38, 14, 35);
    g.fillStyle(0xa13fc1).fillEllipse(34, 45, 12, 32);
    g.fillStyle(0xff77b7).fillEllipse(27, 55, 10, 31);
    g.fillStyle(0x61346d).fillCircle(81, 31, 4.5);
    g.fillStyle(0xffffff).fillCircle(82.5, 29.5, 1.7);
    g.fillStyle(0xf06ca8).fillCircle(92, 42, 3.5);
    g.lineStyle(2, 0x713c78).beginPath().arc(84, 42, 8, 0.2, 1.6).strokePath();
    g.fillStyle(0x8d43ae).fillRoundedRect(31, 72, 10, 18, 5);
    g.fillStyle(0x8d43ae).fillRoundedRect(57, 72, 10, 18, 5);
    g.fillStyle(0xffd8ed).fillEllipse(18, 57, 23, 28);
    g.lineStyle(4, 0x743c80).strokeEllipse(12, 53, 22, 27);
    g.generateTexture('lili', 104, 96);
    g.clear();

    // Star.
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 ? 17 : 35;
      points.push(new Phaser.Geom.Point(38 + Math.cos(angle) * radius, 38 + Math.sin(angle) * radius));
    }
    g.fillStyle(0xffd31f).fillPoints(points, true);
    g.lineStyle(5, 0xff9700).strokePoints(points, true);
    g.fillStyle(0xffffc6, 0.95).fillCircle(28, 22, 7);
    g.generateTexture('star', 76, 76);
    g.clear();

    // Key.
    g.lineStyle(12, 0xffaa00).strokeCircle(25, 25, 15);
    g.lineStyle(7, 0xfff095).strokeCircle(25, 25, 11);
    g.fillStyle(0xffc927).fillRoundedRect(37, 20, 43, 11, 5);
    g.fillStyle(0xffa600).fillRoundedRect(61, 30, 9, 19, 3).fillRoundedRect(49, 30, 9, 13, 3);
    g.generateTexture('key', 86, 56);
    g.clear();

    // Pond.
    g.fillStyle(0x526c61, 0.25).fillEllipse(48, 31, 88, 54);
    for (let i = 0; i < 9; i++) {
      g.fillStyle(i % 2 ? 0x8b8171 : 0x71685d).fillEllipse(8 + i * 10, 29 + (i % 3) * 7, 15, 11);
    }
    g.fillStyle(0x24aee9).fillEllipse(48, 27, 71, 39);
    g.fillStyle(0x8ce8ff, 0.75).fillEllipse(38, 19, 38, 9);
    g.generateTexture('pond', 96, 62);
    g.clear();

    // Butterfly.
    g.fillStyle(0xff62bf, 0.9).fillEllipse(14, 17, 21, 30);
    g.fillStyle(0x7bc8ff, 0.9).fillEllipse(34, 17, 21, 30);
    g.fillStyle(0x5f376d).fillEllipse(24, 19, 6, 25);
    g.generateTexture('butterfly', 48, 40);
    g.clear();

    // Rainbow portal.
    g.fillStyle(0x563076, 0.35).fillRoundedRect(4, 10, 156, 128, 34);
    const rainbow = [0xff3f75, 0xff8f35, 0xffdf36, 0x61d45a, 0x43bdf5, 0x8d57e8];
    rainbow.forEach((color, i) => {
      g.lineStyle(13, color).beginPath().arc(82, 104, 64 - i * 9, Math.PI, Math.PI * 2).strokePath();
    });
    g.fillStyle(0xffc62d).fillRoundedRect(9, 101, 22, 40, 8).fillRoundedRect(133, 101, 22, 40, 8);
    g.fillStyle(0x834ddd).fillRoundedRect(42, 92, 80, 54, 22);
    g.fillStyle(0xd7b4ff, 0.7).fillEllipse(82, 118, 48, 64);
    g.fillStyle(0xffffff, 0.85).fillCircle(82, 111, 9);
    g.generateTexture('gate', 164, 148);
    g.clear();

    // Sparkle.
    g.fillStyle(0xffffff).fillCircle(8, 8, 4);
    g.fillStyle(0xff8fe4, 0.8).fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();
  }

  drawBackdrop() {
    const bg = this.add.graphics().setDepth(-20);
    bg.fillGradientStyle(0x55caff, 0x55caff, 0xe7f8ff, 0xe7f8ff).fillRect(0, 0, VIEW_W, VIEW_H);
    bg.fillStyle(0xffe57a, 0.9).fillCircle(VIEW_W * 0.78, PORTRAIT ? 125 : 110, PORTRAIT ? 48 : 42);
    bg.fillStyle(0xffffff, 0.35).fillCircle(VIEW_W * 0.78, PORTRAIT ? 125 : 110, PORTRAIT ? 73 : 67);
    const horizon = PORTRAIT ? 300 : 270;
    bg.fillStyle(0x7ec95a).fillEllipse(VIEW_W * 0.18, horizon + 80, VIEW_W * 0.95, 300);
    bg.fillStyle(0x4ea744).fillEllipse(VIEW_W * 0.86, horizon + 85, VIEW_W * 0.9, 280);
    bg.fillStyle(0x277c37).fillRect(0, horizon + 110, VIEW_W, VIEW_H - horizon);

    // Clouds are drawn as grouped circles, not emoji.
    for (let i = 0; i < (PORTRAIT ? 5 : 8); i++) {
      const x = 55 + i * (VIEW_W / (PORTRAIT ? 4.3 : 7.2));
      const y = 80 + (i % 2) * 42;
      const cloud = this.add.graphics().setDepth(-18).setAlpha(0.78);
      cloud.fillStyle(0xffffff).fillCircle(x, y, 19).fillCircle(x + 24, y - 9, 27).fillCircle(x + 50, y, 20).fillEllipse(x + 25, y + 11, 73, 23);
      this.tweens.add({ targets: cloud, x: 28, duration: 9000 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  drawGardenFloor() {
    const frame = this.add.graphics().setDepth(-8);
    frame.fillStyle(0x183f21, 0.35).fillRoundedRect(OX - 23, OY - 23, MAZE_W + 46, MAZE_H + 46, 32);
    frame.fillStyle(0x79b94a).fillRoundedRect(OX - 17, OY - 17, MAZE_W + 34, MAZE_H + 34, 28);
    frame.lineStyle(7, 0xffffff, 0.72).strokeRoundedRect(OX - 19, OY - 19, MAZE_W + 38, MAZE_H + 38, 30);

    this.add.tileSprite(OX, OY, MAZE_W, MAZE_H, 'path').setOrigin(0).setDepth(-7).setTint(0xdde59b);

    // Paint soft grass islands over the path tile to break repetition and remove any grid impression.
    const grass = this.add.graphics().setDepth(-6);
    const random = mulberry32(9317);
    for (let i = 0; i < Math.floor(COLS * ROWS * 0.72); i++) {
      const x = OX + 10 + random() * (MAZE_W - 20);
      const y = OY + 10 + random() * (MAZE_H - 20);
      const rx = 12 + random() * 35;
      const ry = 7 + random() * 18;
      grass.fillStyle(i % 3 ? 0x8ec759 : 0x76b84a, 0.46).fillEllipse(x, y, rx, ry);
    }
  }

  createMazeWalls() {
    this.walls = this.physics.add.staticGroup();
    const thickness = Math.max(24, CELL * 0.38);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.maze[y][x];
        const px = OX + x * CELL;
        const py = OY + y * CELL;
        if (c.t) this.addHedge(px + CELL / 2, py, CELL + 10, thickness, false);
        if (c.l) this.addHedge(px, py + CELL / 2, CELL + 10, thickness, true);
        if (x === COLS - 1 && c.r) this.addHedge(px + CELL, py + CELL / 2, CELL + 10, thickness, true);
        if (y === ROWS - 1 && c.b) this.addHedge(px + CELL / 2, py + CELL, CELL + 10, thickness, false);
      }
    }
  }

  addHedge(x, y, length, thickness, vertical) {
    const hedge = this.walls.create(x, y, 'hedge').setDepth(5);
    hedge.setDisplaySize(vertical ? thickness : length, vertical ? length : thickness);
    hedge.refreshBody();

    // Add flower specks above selected hedge pieces for the lush illustrated look.
    if (Phaser.Math.Between(0, 5) === 0) {
      const colors = [0xffffff, 0xff8dc8, 0xffd653, 0x9f82ff];
      for (let i = 0; i < 3; i++) {
        const fx = x + (vertical ? Phaser.Math.Between(-6, 6) : Phaser.Math.Between(-length / 3, length / 3));
        const fy = y + (vertical ? Phaser.Math.Between(-length / 3, length / 3) : Phaser.Math.Between(-5, 5));
        this.add.circle(fx, fy - 5, 2.4, colors[(i + x + y) % colors.length]).setDepth(7);
      }
    }
  }

  decorateGarden() {
    const used = [];
    const outsideCount = PORTRAIT ? 58 : 42;
    for (let i = 0; i < outsideCount; i++) {
      const side = Phaser.Math.Between(0, 1);
      const x = side ? Phaser.Math.Between(OX + MAZE_W + 25, VIEW_W - 12) : Phaser.Math.Between(12, OX - 25);
      const y = Phaser.Math.Between(OY + 35, VIEW_H - 12);
      if (i % 11 === 0) this.drawMushroom(x, y);
      else if (i % 9 === 0) this.drawRock(x, y);
      else this.drawFlower(x, y, Phaser.Math.RND.pick([0xff62a9, 0xffd63d, 0xffffff, 0x8c6df0, 0x55a8ff]));
    }

    // Decorative ponds inside maze cells.
    this.ponds = this.physics.add.staticGroup();
    const occupied = new Set(['0,0', `${COLS - 1},${ROWS - 1}`]);
    for (let i = 0; i < 3; i++) {
      const p = this.randomCell(occupied);
      const pond = this.ponds.create(p.x, p.y, 'pond').setDepth(2).setScale(PORTRAIT ? 0.62 : 0.78);
      pond.refreshBody();
      this.tweens.add({ targets: pond, scaleX: pond.scaleX * 1.04, scaleY: pond.scaleY * 0.98, duration: 1250 + i * 160, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // Butterflies crossing the garden.
    for (let i = 0; i < (PORTRAIT ? 7 : 5); i++) {
      const b = this.add.image(Phaser.Math.Between(20, VIEW_W - 20), Phaser.Math.Between(OY + 30, VIEW_H - 80), 'butterfly').setDepth(12).setScale(0.42 + Math.random() * 0.25).setTint(i % 2 ? 0xffffff : 0xffc5f0);
      this.tweens.add({ targets: b, x: Phaser.Math.Between(20, VIEW_W - 20), y: Phaser.Math.Between(OY + 30, VIEW_H - 80), angle: Phaser.Math.Between(-18, 18), duration: 4800 + i * 730, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: b, scaleX: 0.14, duration: 190, yoyo: true, repeat: -1 });
    }
  }

  drawFlower(x, y, color) {
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(3, 0x2f8a38).lineBetween(x, y, x, y - 13);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI * 2) / 6;
      g.fillStyle(color).fillCircle(x + Math.cos(a) * 7, y - 15 + Math.sin(a) * 7, 5);
    }
    g.fillStyle(0xffc62f).fillCircle(x, y - 15, 4);
  }

  drawMushroom(x, y) {
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0xf7e8c4).fillRoundedRect(x - 4, y - 9, 8, 16, 4);
    g.fillStyle(0xe84d4d).fillEllipse(x, y - 10, 24, 15);
    g.fillStyle(0xffffff).fillCircle(x - 6, y - 12, 2.4).fillCircle(x + 5, y - 8, 2.2);
  }

  drawRock(x, y) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x526953, 0.25).fillEllipse(x + 3, y + 6, 28, 11);
    g.fillStyle(0x777b75).fillEllipse(x, y, 27, 20);
    g.fillStyle(0xa5aaa3, 0.65).fillEllipse(x - 5, y - 4, 11, 7);
  }

  randomCell(used) {
    let cx;
    let cy;
    let key;
    do {
      cx = Phaser.Math.Between(0, COLS - 1);
      cy = Phaser.Math.Between(0, ROWS - 1);
      key = `${cx},${cy}`;
    } while (used.has(key));
    used.add(key);
    return { x: OX + cx * CELL + CELL / 2, y: OY + cy * CELL + CELL / 2 };
  }

  createCollectibles() {
    const used = new Set(['0,0', `${COLS - 1},${ROWS - 1}`]);
    this.stars = this.physics.add.group();
    for (let i = 0; i < STAR_COUNT; i++) {
      const p = this.randomCell(used);
      const star = this.stars.create(p.x, p.y, 'star').setDepth(10).setScale(PORTRAIT ? 0.52 : 0.66);
      this.tweens.add({ targets: star, scale: star.scale * 1.16, angle: 360, duration: 1450 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    const keyPos = this.randomCell(used);
    this.key = this.physics.add.image(keyPos.x, keyPos.y, 'key').setDepth(10).setScale(PORTRAIT ? 0.58 : 0.72);
    this.tweens.add({ targets: this.key, y: this.key.y - 10, angle: 7, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.gate = this.physics.add.staticImage(OX + (COLS - 0.55) * CELL, OY + (ROWS - 0.48) * CELL, 'gate')
      .setDepth(8)
      .setScale(PORTRAIT ? 0.62 : 0.76)
      .setAlpha(0.42);
    this.gate.refreshBody();
  }

  createPlayer() {
    this.player = this.physics.add.image(OX + CELL / 2, OY + CELL / 2, 'lili')
      .setDepth(14)
      .setScale(PORTRAIT ? 0.63 : 0.78)
      .setCircle(29, 20, 26)
      .setCollideWorldBounds(true);

    this.player.body.setMaxVelocity(PORTRAIT ? 225 : 270);
    this.player.body.setDrag(PORTRAIT ? 410 : 455);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.overlap(this.player, this.stars, (_, star) => this.collectStar(star));
    this.physics.add.overlap(this.player, this.key, () => this.collectKey());
    this.physics.add.overlap(this.player, this.gate, () => this.finishLevel());
    this.physics.add.overlap(this.player, this.ponds, () => this.player.body.velocity.scale(0.965));

    this.aura = this.add.ellipse(this.player.x, this.player.y + 18, 65, 24, 0xff8fe3, 0.23).setDepth(13);
    this.tweens.add({ targets: this.player, scaleY: this.player.scaleY * 0.96, duration: 280, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  createEffects() {
    this.sparkles = this.add.particles(0, 0, 'spark', {
      speed: { min: 35, max: 150 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 750,
      gravityY: 50,
      emitting: false
    }).setDepth(30);
  }

  collectStar(star) {
    const x = star.x;
    const y = star.y;
    star.disableBody(true, true);
    this.collected += 1;
    ui.stars.textContent = `${this.collected} / ${STAR_COUNT}`;
    this.sparkles.emitParticleAt(x, y, 18);
    this.cameras.main.shake(90, 0.0025);
    flash(Phaser.Math.RND.pick(['Skvělé!', 'Paráda!', 'Hvězdička je tvoje!', 'Jsi šikulka!']));
    this.checkGate();
  }

  collectKey() {
    if (this.hasKey) return;
    this.hasKey = true;
    ui.keys.textContent = '1 / 1';
    this.sparkles.emitParticleAt(this.key.x, this.key.y, 24);
    this.key.disableBody(true, true);
    flash('Našla jsi zlatý klíček!');
    this.checkGate();
  }

  checkGate() {
    if (this.gateOpen || !this.hasKey || this.collected !== STAR_COUNT) return;
    this.gateOpen = true;
    this.gate.setAlpha(1);
    this.tweens.add({ targets: this.gate, scale: this.gate.scale * 1.08, duration: 680, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.portalSparkles = this.add.particles(this.gate.x, this.gate.y - 10, 'spark', {
      speed: { min: 10, max: 55 },
      angle: { min: 210, max: 330 },
      lifespan: 950,
      scale: { start: 0.7, end: 0 },
      frequency: 90,
      quantity: 1
    }).setDepth(20);
    flash('Duhová brána je otevřená!');
  }

  finishLevel() {
    if (this.finished || !this.gateOpen) return;
    this.finished = true;
    this.player.setVelocity(0);
    this.sparkles.emitParticleAt(this.gate.x, this.gate.y, 60);
    this.cameras.main.flash(700, 255, 238, 180);
    flash('Dokázala jsi to!');
    this.time.delayedCall(1500, () => this.scene.restart());
  }

  setupControls() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    document.querySelector('#restart').onclick = () => this.scene.restart();
  }

  update() {
    if (this.finished) return;
    const keyboardX = (this.cursors?.left.isDown ? -1 : 0) + (this.cursors?.right.isDown ? 1 : 0);
    const keyboardY = (this.cursors?.up.isDown ? -1 : 0) + (this.cursors?.down.isDown ? 1 : 0);
    let x = joystickVector.x + tiltVector.x + keyboardX;
    let y = joystickVector.y + tiltVector.y + keyboardY;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    this.player.setAcceleration(x * (PORTRAIT ? 520 : 630), y * (PORTRAIT ? 520 : 630));
    if (Math.abs(x) > 0.08) this.player.setFlipX(x < 0);
    this.player.angle = Math.abs(x) + Math.abs(y) > 0.1 ? Math.sin(this.time.now / 100) * 2.2 : 0;
    this.aura.setPosition(this.player.x, this.player.y + 18);
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#5bc9ff',
  antialias: true,
  roundPixels: false,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: GardenScene
};

new Phaser.Game(config);

document.querySelector('#play').onclick = async () => {
  ui.intro.classList.add('hidden');
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch {}

  window.addEventListener('deviceorientation', event => {
    if (event.beta == null || event.gamma == null) return;
    sensorActive = true;
    ui.sensor.textContent = 'Náklon funguje ✓';
    tiltVector.x = Phaser.Math.Clamp(event.gamma / 22, -1, 1);
    tiltVector.y = Phaser.Math.Clamp((event.beta - 35) / 22, -1, 1);
  }, true);
};

const joystick = document.querySelector('#joystick');
const knob = document.querySelector('#joystick-knob');
let pointerId = null;

function moveJoystick(event) {
  if (pointerId !== event.pointerId) return;
  const rect = joystick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const max = rect.width * 0.31;
  const length = Math.hypot(dx, dy) || 1;
  const factor = Math.min(1, max / length);
  const x = dx * factor;
  const y = dy * factor;
  knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  joystickVector = { x: x / max, y: y / max };
}

joystick.addEventListener('pointerdown', event => {
  pointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  moveJoystick(event);
});
joystick.addEventListener('pointermove', moveJoystick);

function releaseJoystick(event) {
  if (pointerId !== event.pointerId) return;
  pointerId = null;
  joystickVector = { x: 0, y: 0 };
  knob.style.transform = 'translate(-50%, -50%)';
}

joystick.addEventListener('pointerup', releaseJoystick);
joystick.addEventListener('pointercancel', releaseJoystick);

setTimeout(() => {
  if (!sensorActive) ui.sensor.textContent = 'Použij joystick nebo šipky';
}, 2300);

let portraitState = PORTRAIT;
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    const nowPortrait = window.innerHeight > window.innerWidth;
    if (nowPortrait !== portraitState) location.reload();
  }, 350);
});