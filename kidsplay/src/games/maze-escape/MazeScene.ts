import Phaser from 'phaser';
import { DOOR_CHARS, KEY_CHARS, cellAt, findAll, type Grid, type Pos } from './maze';

export type Dir = 'up' | 'down' | 'left' | 'right';
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY_COLORS = [0xffb300, 0x29b6f6, 0xec407a];
const MOVE_MS = 130;

export interface MazeCallbacks {
  onStars(collected: number, total: number): void;
  onKeys(keys: boolean[]): void;
  onMove(): void;
  onBump(): void;
  onPickup(kind: 'star' | 'key' | 'door'): void;
  onExitLocked(): void;
  onWin(): void;
}

export interface MazeSceneData {
  grid: Grid;
  requireAllStars: boolean;
  playerColor: number;
  callbacks: MazeCallbacks;
}

/**
 * Top-down, grid-based maze. Movement is tile-to-tile with tweens and the collision check
 * happens on the logical grid before moving, so walls can never be clipped through.
 */
export class MazeScene extends Phaser.Scene {
  private grid!: string[][];
  private data_!: MazeSceneData;
  private tile = 48;
  private player!: Phaser.GameObjects.Container;
  private body_!: Phaser.GameObjects.Image;
  private pos!: Pos;
  private moving = false;
  private held: Dir | null = null;
  private queued: Dir | null = null;
  private keysHeld = [false, false, false];
  private starsTotal = 0;
  private starsCollected = 0;
  private objects = new Map<string, Phaser.GameObjects.GameObject>();
  private exitSprite!: Phaser.GameObjects.Image;
  private won = false;
  private swipeStart: { x: number; y: number } | null = null;
  swipeEnabled = true;

  constructor() {
    super('maze');
  }

  init(data: MazeSceneData): void {
    this.data_ = data;
    this.grid = data.grid.map((r) => [...r]);
    this.keysHeld = [false, false, false];
    this.starsCollected = 0;
    this.won = false;
    this.moving = false;
    this.objects.clear();
  }

  create(): void {
    this.makeTextures();
    const rows = this.grid.length;
    const cols = this.grid[0].length;
    const t = this.tile;
    this.cameras.main.setBackgroundColor('#bfe8a6');
    this.add.tileSprite(0, 0, cols * t, rows * t, 'floor').setOrigin(0);

    this.starsTotal = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = this.grid[y][x];
        const cx = x * t + t / 2;
        const cy = y * t + t / 2;
        if (c === '#') this.add.image(cx, cy, 'wall');
        else if (c === '*') {
          this.starsTotal++;
          const s = this.add.image(cx, cy, 'star');
          this.tweens.add({ targets: s, scale: 1.15, angle: 10, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
          this.objects.set(`${x},${y}`, s);
        } else if (KEY_CHARS.includes(c)) {
          const k = this.add.image(cx, cy, `key${KEY_CHARS.indexOf(c)}`);
          this.tweens.add({ targets: k, y: cy - 5, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
          this.objects.set(`${x},${y}`, k);
        } else if (DOOR_CHARS.includes(c)) {
          this.objects.set(`${x},${y}`, this.add.image(cx, cy, `door${DOOR_CHARS.indexOf(c)}`));
        } else if (c === 'E') {
          this.exitSprite = this.add.image(cx, cy, 'exit');
          this.tweens.add({ targets: this.exitSprite, scaleX: 1.08, yoyo: true, repeat: -1, duration: 500 });
          if (this.data_.requireAllStars && this.starsTotal >= 0) this.exitSprite.setAlpha(0.45);
        }
      }
    }
    // Count stars before deciding exit lock appearance.
    if (this.data_.requireAllStars && this.exitSprite) this.exitSprite.setAlpha(this.countStars() > 0 ? 0.45 : 1);

    const start = findAll(this.data_.grid, 'S')[0];
    this.pos = { ...start };
    this.body_ = this.add.image(0, 0, 'player');
    this.player = this.add.container(start.x * t + t / 2, start.y * t + t / 2, [this.body_]);
    this.player.setDepth(10);
    this.tweens.add({ targets: this.body_, scaleY: 0.94, scaleX: 1.04, yoyo: true, repeat: -1, duration: 450, ease: 'Sine.inOut' });

    this.data_.callbacks.onStars(0, this.countStars());
    this.data_.callbacks.onKeys(this.keysHeld);
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);

    const kb = this.input.keyboard;
    if (kb) {
      const map: Record<string, Dir> = { UP: 'up', DOWN: 'down', LEFT: 'left', RIGHT: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
      for (const [k, d] of Object.entries(map)) {
        const key = kb.addKey(k);
        key.on('down', () => this.press(d));
        key.on('up', () => this.release(d));
      }
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.swipeStart = { x: p.x, y: p.y }));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart || !this.swipeEnabled) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      const min = 24 * (window.devicePixelRatio || 1);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return;
      this.step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    });
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));
  }

  private countStars(): number {
    let n = 0;
    for (const row of this.grid) for (const c of row) if (c === '*') n++;
    return n + this.starsCollected;
  }

  private fitCamera = () => {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    cam.setSize(w, h);
    const worldW = this.grid[0].length * this.tile;
    const worldH = this.grid.length * this.tile;
    const fit = Math.min(w / worldW, h / worldH);
    // Keep tiles large enough for small hands: if the whole maze would be tiny, follow the player.
    const minTile = 34 * (window.devicePixelRatio || 1);
    const zoom = Math.max(fit, minTile / this.tile);
    cam.setZoom(zoom);
    cam.setBounds(Math.min(0, (worldW - w / zoom) / 2), Math.min(0, (worldH - h / zoom) / 2), Math.max(worldW, w / zoom), Math.max(worldH, h / zoom));
    if (zoom > fit + 0.001) cam.startFollow(this.player, true, 0.15, 0.15);
    else {
      cam.stopFollow();
      cam.centerOn(worldW / 2, worldH / 2);
    }
  };

  press(dir: Dir): void {
    this.held = dir;
    if (this.moving) this.queued = dir;
    else this.step(dir);
  }

  release(dir: Dir): void {
    if (this.held === dir) this.held = null;
  }

  step(dir: Dir): void {
    if (this.won || this.moving || !this.scene.isActive()) return;
    const [dx, dy] = DELTA[dir];
    const nx = this.pos.x + dx;
    const ny = this.pos.y + dy;
    const c = cellAt(this.grid.map((r) => r.join('')), nx, ny);
    if (dx !== 0) this.body_.setFlipX(dx < 0);
    if (c === '#') return this.bump(dx, dy);
    const di = DOOR_CHARS.indexOf(c);
    if (di >= 0) {
      if (!this.keysHeld[di]) return this.bump(dx, dy);
      this.grid[ny][nx] = '.';
      const door = this.objects.get(`${nx},${ny}`) as Phaser.GameObjects.Image | undefined;
      if (door) this.tweens.add({ targets: door, alpha: 0, scale: 1.4, duration: 250, onComplete: () => door.destroy() });
      this.data_.callbacks.onPickup('door');
    }
    if (c === 'E' && this.data_.requireAllStars && this.starsCollected < this.starsTotal) {
      this.data_.callbacks.onExitLocked();
      return this.bump(dx, dy);
    }
    this.moving = true;
    this.pos = { x: nx, y: ny };
    this.data_.callbacks.onMove();
    this.tweens.add({
      targets: this.player,
      x: nx * this.tile + this.tile / 2,
      y: ny * this.tile + this.tile / 2,
      duration: MOVE_MS,
      ease: 'Quad.out',
      onComplete: () => {
        this.moving = false;
        this.arrive(nx, ny);
        const next = this.queued ?? this.held;
        this.queued = null;
        if (next && !this.won) this.step(next);
      },
    });
  }

  private bump(dx: number, dy: number) {
    this.data_.callbacks.onBump();
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: this.player.x + dx * 6,
      y: this.player.y + dy * 6,
      yoyo: true,
      duration: 70,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  private arrive(x: number, y: number) {
    const c = this.grid[y][x];
    const k = `${x},${y}`;
    if (c === '*') {
      this.grid[y][x] = '.';
      this.starsCollected++;
      const s = this.objects.get(k) as Phaser.GameObjects.Image;
      this.tweens.killTweensOf(s);
      this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, scale: 1.6, duration: 350, onComplete: () => s.destroy() });
      this.burst(s.x, s.y, 0xffd54f);
      this.data_.callbacks.onPickup('star');
      this.data_.callbacks.onStars(this.starsCollected, this.starsTotal);
      if (this.data_.requireAllStars && this.starsCollected >= this.starsTotal) this.exitSprite?.setAlpha(1);
    } else if (KEY_CHARS.includes(c)) {
      const i = KEY_CHARS.indexOf(c);
      this.grid[y][x] = '.';
      this.keysHeld[i] = true;
      const s = this.objects.get(k) as Phaser.GameObjects.Image;
      this.tweens.killTweensOf(s);
      this.tweens.add({ targets: s, y: s.y - 30, alpha: 0, duration: 300, onComplete: () => s.destroy() });
      this.burst(s.x, s.y, KEY_COLORS[i]);
      this.data_.callbacks.onPickup('key');
      this.data_.callbacks.onKeys([...this.keysHeld]);
    } else if (c === 'E') {
      this.won = true;
      this.burst(this.player.x, this.player.y, 0xff7a59);
      this.tweens.add({ targets: this.player, angle: 360, scale: 1.3, duration: 600 });
      this.time.delayedCall(700, () => this.data_.callbacks.onWin());
    }
  }

  private burst(x: number, y: number, color: number) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = this.add.circle(x, y, 5, color).setDepth(20);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40, alpha: 0, duration: 450, onComplete: () => p.destroy() });
    }
  }

  /** Procedurally drawn textures — no image files needed. */
  private makeTextures() {
    const t = this.tile;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (name: string, draw: () => void, w = t, h = t) => {
      if (this.textures.exists(name)) return;
      g.clear();
      draw();
      g.generateTexture(name, w, h);
    };
    tex('floor', () => {
      g.fillStyle(0xc5e8a8).fillRect(0, 0, t, t);
      g.fillStyle(0xb4dd94).fillRect(0, 0, t / 2, t / 2).fillRect(t / 2, t / 2, t / 2, t / 2);
    });
    tex('wall', () => {
      g.fillStyle(0x2e7d32).fillRoundedRect(1, 3, t - 2, t - 3, 10);
      g.fillStyle(0x43a047).fillRoundedRect(1, 0, t - 2, t - 6, 10);
      g.fillStyle(0x66bb6a).fillCircle(t * 0.3, t * 0.3, t * 0.16).fillCircle(t * 0.68, t * 0.42, t * 0.13);
    });
    tex('star', () => {
      g.fillStyle(0xffd54f).lineStyle(3, 0xf9a825);
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? t * 0.38 : t * 0.17;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(new Phaser.Math.Vector2(t / 2 + Math.cos(a) * r, t / 2 + Math.sin(a) * r));
      }
      g.fillPoints(pts, true).strokePoints(pts, true);
    });
    KEY_COLORS.forEach((col, i) => {
      tex(`key${i}`, () => {
        g.fillStyle(col).lineStyle(3, 0x5d4037);
        g.fillCircle(t * 0.32, t * 0.5, t * 0.17).strokeCircle(t * 0.32, t * 0.5, t * 0.17);
        g.fillRect(t * 0.45, t * 0.45, t * 0.38, t * 0.1).fillRect(t * 0.7, t * 0.5, t * 0.07, t * 0.14).fillRect(t * 0.8, t * 0.5, t * 0.06, t * 0.1);
        g.fillStyle(0xffffff).fillCircle(t * 0.32, t * 0.5, t * 0.06);
      });
      tex(`door${i}`, () => {
        g.fillStyle(0x6d4c41).fillRoundedRect(2, 2, t - 4, t - 4, 6);
        g.fillStyle(col).fillRoundedRect(6, 6, t - 12, t - 12, 6);
        g.fillStyle(0x5d4037).fillCircle(t / 2, t * 0.45, t * 0.1).fillTriangle(t / 2, t * 0.45, t * 0.42, t * 0.7, t * 0.58, t * 0.7);
      });
    });
    tex('exit', () => {
      g.fillStyle(0x8d6e63).fillRect(t * 0.22, t * 0.12, t * 0.07, t * 0.8);
      g.fillStyle(0xff5c7a).fillTriangle(t * 0.29, t * 0.12, t * 0.82, t * 0.28, t * 0.29, t * 0.46);
      g.fillStyle(0xffffff).fillCircle(t * 0.48, t * 0.28, t * 0.06);
      g.fillStyle(0x7c5cff, 0.35).fillEllipse(t / 2, t * 0.88, t * 0.8, t * 0.18);
    });
    tex('player', () => {
      const c = this.data_.playerColor;
      g.fillStyle(0x000000, 0.15).fillEllipse(t / 2, t * 0.88, t * 0.6, t * 0.14);
      g.fillStyle(c).fillCircle(t * 0.3, t * 0.2, t * 0.1).fillCircle(t * 0.7, t * 0.2, t * 0.1);
      g.fillStyle(c).fillCircle(t / 2, t * 0.52, t * 0.34);
      g.fillStyle(0xffffff).fillCircle(t * 0.6, t * 0.45, t * 0.1).fillCircle(t * 0.36, t * 0.45, t * 0.1);
      g.fillStyle(0x2b2d42).fillCircle(t * 0.63, t * 0.46, t * 0.05).fillCircle(t * 0.39, t * 0.46, t * 0.05);
      g.fillStyle(0xff8fab, 0.7).fillCircle(t * 0.26, t * 0.62, t * 0.06).fillCircle(t * 0.74, t * 0.62, t * 0.06);
      g.lineStyle(3, 0x2b2d42).beginPath().arc(t / 2, t * 0.58, t * 0.1, 0.2, Math.PI - 0.2).strokePath();
    });
    g.destroy();
  }
}
