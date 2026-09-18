import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as CANNON from "cannon-es";
import { GAME_CONFIG, PHYSICS_CONFIG } from "../config.js";
import { clamp, easeInOutCubic, randomBetween } from "../random.js";

const FACE_NORMALS = {
  1: new THREE.Vector3(0, 1, 0),
  2: new THREE.Vector3(0, 0, 1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, 0, -1),
  6: new THREE.Vector3(0, -1, 0),
};

const FACE_BASIS = {
  1: { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  2: { normal: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  3: { normal: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  4: { normal: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  5: { normal: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  6: { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
};

const PIP_POSITIONS = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [-1, 0], [-1, -1], [1, 1], [1, 0], [1, -1]],
};

function cannonVecFromArray(values) {
  return new CANNON.Vec3(values[0], values[1], values[2]);
}

function threeVecFromArray(values) {
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function targetQuaternionForTopValue(value) {
  const up = new THREE.Vector3(0, 1, 0);
  const align = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[value], up);
  const turn = new THREE.Quaternion().setFromAxisAngle(up, randomBetween(0, Math.PI * 2));
  return turn.multiply(align);
}

export function createSettleTargets(count = 6) {
  const targets = [];
  const maxRadius = PHYSICS_CONFIG.settleRadius;
  const minDistance = PHYSICS_CONFIG.settleMinDistance;

  for (let attempt = 0; attempt < 900 && targets.length < count; attempt += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const radius = Math.sqrt(Math.random()) * maxRadius;
    const candidate = new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
    if (targets.every((target) => target.distanceTo(candidate) >= minDistance)) {
      targets.push(candidate);
    }
  }

  if (targets.length < count) {
    targets.length = 0;
    const turn = randomBetween(0, Math.PI * 2);
    const radius = Math.max(1.08, minDistance + 0.08);
    for (let index = 0; index < count; index += 1) {
      const angle = turn + (index / count) * Math.PI * 2;
      targets.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
  }

  return targets;
}

function assignNearestTargets(dice, targets) {
  const pairs = [];
  dice.forEach((die, dieIndex) => {
    targets.forEach((target, targetIndex) => {
      pairs.push({
        dieIndex,
        targetIndex,
        distance: Math.hypot(die.mesh.position.x - target.x, die.mesh.position.z - target.y),
      });
    });
  });
  pairs.sort((a, b) => a.distance - b.distance);

  const assignments = new Array(dice.length);
  const usedDice = new Set();
  const usedTargets = new Set();
  for (const pair of pairs) {
    if (usedDice.has(pair.dieIndex) || usedTargets.has(pair.targetIndex)) continue;
    assignments[pair.dieIndex] = targets[pair.targetIndex];
    usedDice.add(pair.dieIndex);
    usedTargets.add(pair.targetIndex);
  }
  return assignments;
}

function createBowlPatternTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(214, 168, 74, 0.78)";
  context.fillStyle = "rgba(214, 168, 74, 0.72)";
  context.lineCap = "round";
  context.lineJoin = "round";

  context.lineWidth = 8;
  context.beginPath();
  context.arc(center, center, 330, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 3;
  context.beginPath();
  context.arc(center, center, 354, 0, Math.PI * 2);
  context.stroke();

  const drawCloud = (x, y, scale, rotation) => {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(scale, scale);
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(-88, 25);
    context.bezierCurveTo(-58, 25, -62, -12, -35, -12);
    context.bezierCurveTo(-15, -12, -18, 12, 2, 12);
    context.bezierCurveTo(30, 12, 28, -27, 58, -27);
    context.bezierCurveTo(88, -27, 91, 6, 68, 17);
    context.bezierCurveTo(49, 26, 26, 24, 12, 24);
    context.moveTo(-88, 25);
    context.lineTo(85, 25);
    context.moveTo(-51, 43);
    context.lineTo(43, 43);
    context.stroke();
    context.restore();
  };

  for (let index = 0; index < 4; index += 1) {
    const angle = index * (Math.PI / 2) + Math.PI / 4;
    drawCloud(
      center + Math.cos(angle) * 382,
      center + Math.sin(angle) * 382,
      0.68,
      angle + Math.PI / 2,
    );
  }

  context.lineWidth = 6;
  context.strokeRect(center - 85, center - 85, 170, 170);
  context.font = '700 116px "Songti SC", "STSong", serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("福", center, center + 9);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createDiceMesh(size) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf4ebd7,
    roughness: 0.48,
    metalness: 0,
    clearcoat: 0.72,
    clearcoatRoughness: 0.34,
  });
  const darkPip = new THREE.MeshStandardMaterial({ color: 0x332522, roughness: 0.6 });
  const redPip = new THREE.MeshStandardMaterial({ color: 0xa71f2b, roughness: 0.55 });
  const geometry = new RoundedBoxGeometry(size, size, size, 7, size * 0.16);
  const cube = new THREE.Mesh(geometry, bodyMaterial);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);

  const half = size / 2 + 0.004;
  const spacing = size * 0.205;
  const pipGeometry = new THREE.CircleGeometry(size * 0.048, 24);
  const baseNormal = new THREE.Vector3(0, 0, 1);

  for (let value = 1; value <= 6; value += 1) {
    const basis = FACE_BASIS[value];
    const normal = threeVecFromArray(basis.normal);
    const u = threeVecFromArray(basis.u);
    const v = threeVecFromArray(basis.v);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(baseNormal, normal);

    for (const [x, y] of PIP_POSITIONS[value]) {
      const pip = new THREE.Mesh(pipGeometry, value === 4 ? redPip : darkPip);
      pip.position.copy(normal.clone().multiplyScalar(half));
      pip.position.add(u.clone().multiplyScalar(x * spacing));
      pip.position.add(v.clone().multiplyScalar(y * spacing));
      pip.quaternion.copy(quaternion);
      group.add(pip);
    }
  }

  return group;
}

export class DiceScene {
  constructor(canvas, { onCollision } = {}) {
    this.canvas = canvas;
    this.onCollision = onCollision;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.clock = new THREE.Clock();
    this.dice = [];
    this.running = false;
    this.rollState = null;
    this.frameId = null;
    this.lastPhysicsTime = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GAME_CONFIG.maxDevicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    this.setupLights();
    this.setupBowl();
    this.setupPhysics();
    this.createDice();
    this.bindResize();
    this.resize();
    this.renderOnce();
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff7e7, 0x2a1214, 1.75));
    const key = new THREE.DirectionalLight(0xfff2d0, 2.4);
    key.position.set(-3.4, 6, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 14;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b2428, 1.1);
    rim.position.set(4, 2, -4);
    this.scene.add(rim);
  }

  setupBowl() {
    const bowl = new THREE.Group();
    const points = [
      new THREE.Vector2(0, -0.12),
      new THREE.Vector2(1.24, -0.12),
      new THREE.Vector2(1.82, 0.06),
      new THREE.Vector2(2.2, 0.48),
      new THREE.Vector2(2.47, 1.01),
      new THREE.Vector2(2.59, 1.04),
      new THREE.Vector2(2.45, 0.62),
      new THREE.Vector2(2.16, 0.12),
      new THREE.Vector2(1.7, -0.23),
      new THREE.Vector2(0.82, -0.36),
      new THREE.Vector2(0, -0.36),
    ];
    const bowlMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa11f29,
      roughness: 0.3,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.LatheGeometry(points, 96);
    const bowlMesh = new THREE.Mesh(geometry, bowlMaterial);
    bowlMesh.receiveShadow = true;
    bowl.add(bowlMesh);

    const pattern = new THREE.Mesh(
      new THREE.CircleGeometry(1.92, 96),
      new THREE.MeshStandardMaterial({
        map: createBowlPatternTexture(),
        transparent: true,
        roughness: 0.4,
        metalness: 0.22,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    pattern.rotation.x = -Math.PI / 2;
    pattern.position.y = -0.105;
    pattern.receiveShadow = true;
    bowl.add(pattern);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.075, 18, 112),
      new THREE.MeshPhysicalMaterial({
        color: 0xb63b3e,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    );
    rim.position.y = 1.025;
    rim.rotation.x = Math.PI / 2;
    rim.receiveShadow = true;
    bowl.add(rim);

    const goldBand = new THREE.Mesh(
      new THREE.TorusGeometry(2.34, 0.018, 8, 112),
      new THREE.MeshStandardMaterial({ color: 0xc69b46, roughness: 0.38, metalness: 0.32 }),
    );
    goldBand.position.y = 0.75;
    goldBand.rotation.x = Math.PI / 2;
    bowl.add(goldBand);

    const tableShadow = new THREE.Mesh(
      new THREE.CircleGeometry(3.35, 112),
      new THREE.ShadowMaterial({ color: 0x2a1011, opacity: 0.22 }),
    );
    tableShadow.rotation.x = -Math.PI / 2;
    tableShadow.position.y = -0.28;
    tableShadow.receiveShadow = true;
    bowl.add(tableShadow);

    this.scene.add(bowl);
  }

  setupPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, PHYSICS_CONFIG.gravity, 0),
      allowSleep: true,
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.defaultContactMaterial.friction = 0.52;
    this.world.defaultContactMaterial.restitution = 0.24;

    const floor = new CANNON.Body({ mass: 0, material: new CANNON.Material("ceramic") });
    floor.addShape(new CANNON.Plane());
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    floor.position.set(0, -0.11, 0);
    this.world.addBody(floor);

    const segmentAngle = (Math.PI * 2) / PHYSICS_CONFIG.wallSegments;
    const wallShape = new CANNON.Box(
      new CANNON.Vec3(0.12, PHYSICS_CONFIG.bowlWallHeight / 2, PHYSICS_CONFIG.bowlRadius * Math.sin(segmentAngle) * 0.72),
    );
    for (let index = 0; index < PHYSICS_CONFIG.wallSegments; index += 1) {
      const angle = index * segmentAngle;
      const wall = new CANNON.Body({ mass: 0, material: new CANNON.Material("bowl-wall") });
      wall.addShape(wallShape);
      wall.position.set(
        Math.cos(angle) * PHYSICS_CONFIG.bowlInnerRadius,
        PHYSICS_CONFIG.bowlWallHeight / 2 - 0.38,
        Math.sin(angle) * PHYSICS_CONFIG.bowlInnerRadius,
      );
      wall.quaternion.setFromEuler(0, -angle, 0);
      this.world.addBody(wall);
    }
  }

  createDice() {
    const size = PHYSICS_CONFIG.diceSize;
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));

    for (let index = 0; index < 6; index += 1) {
      const mesh = createDiceMesh(size);
      const body = new CANNON.Body({
        mass: 1,
        shape,
        linearDamping: 0.22,
        angularDamping: 0.28,
        sleepSpeedLimit: 0.16,
        sleepTimeLimit: 0.35,
      });
      body.addEventListener("collide", (event) => {
        if (!this.rollState) return;
        const impact = Math.abs(event.contact.getImpactVelocityAlongNormal());
        if (impact > 1.15) {
          this.onCollision?.({
            impact,
            pan: clamp(body.position.x / PHYSICS_CONFIG.bowlRadius, -1, 1),
          });
        }
      });
      this.scene.add(mesh);
      this.world.addBody(body);
      this.dice.push({
        mesh,
        body,
        targetValue: 1,
        settleStartQuaternion: new THREE.Quaternion(),
        settleTargetQuaternion: new THREE.Quaternion(),
        settleStartPosition: new THREE.Vector3(),
        settleTargetPosition: new THREE.Vector3(),
      });
    }

    this.resetDice([1, 2, 3, 4, 5, 6], false);
  }

  resetDice(targets, toss = true) {
    const size = PHYSICS_CONFIG.diceSize;
    const restingTargets = toss ? null : createSettleTargets(this.dice.length);

    this.dice.forEach((die, index) => {
      const angle = (index / this.dice.length) * Math.PI * 2 + randomBetween(-0.24, 0.24);
      const radius = randomBetween(0.05, 0.48);
      const x = toss ? Math.cos(angle) * radius : restingTargets[index].x;
      const z = toss ? Math.sin(angle) * radius : restingTargets[index].y;
      const y = toss ? PHYSICS_CONFIG.throwHeight + randomBetween(0, 0.55) : size / 2 + 0.01;

      die.targetValue = targets[index];
      die.body.wakeUp();
      die.body.position.set(x, y, z);
      die.body.velocity.set(
        toss ? randomBetween(-1.8, 1.8) : 0,
        toss ? randomBetween(-1.2, 0.2) : 0,
        toss ? randomBetween(-1.8, 1.8) : 0,
      );
      die.body.angularVelocity.set(
        toss ? randomBetween(-14, 14) : 0,
        toss ? randomBetween(-15, 15) : 0,
        toss ? randomBetween(-14, 14) : 0,
      );
      if (toss) {
        die.body.quaternion.setFromEuler(randomBetween(0, Math.PI), randomBetween(0, Math.PI), randomBetween(0, Math.PI));
      } else {
        const targetQuaternion = targetQuaternionForTopValue(targets[index]);
        die.body.quaternion.set(
          targetQuaternion.x,
          targetQuaternion.y,
          targetQuaternion.z,
          targetQuaternion.w,
        );
      }
      die.body.force.set(0, 0, 0);
      die.body.torque.set(0, 0, 0);
      die.mesh.position.copy(die.body.position);
      die.mesh.quaternion.copy(die.body.quaternion);
    });
  }

  bindResize() {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopLoop();
      } else if (this.rollState) {
        this.startLoop();
      } else {
        this.renderOnce();
      }
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GAME_CONFIG.maxDevicePixelRatio));
    this.camera.aspect = width / height;
    const mobile = width < 640;
    this.camera.position.set(0, mobile ? 5.8 : 5.95, mobile ? 6.7 : 6.25);
    this.camera.lookAt(0, 0.16, 0);
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }

  roll(targets) {
    if (this.rollState) return Promise.resolve();

    this.resetDice(targets, !this.reducedMotion);
    const duration = this.reducedMotion ? 1300 : GAME_CONFIG.throwDurationMs;
    const settleDuration = this.reducedMotion ? 360 : GAME_CONFIG.settleDurationMs;

    this.rollState = {
      startAt: performance.now(),
      duration,
      settleDuration,
      settleStarted: false,
      resolve: null,
    };

    const promise = new Promise((resolve) => {
      this.rollState.resolve = resolve;
    });
    this.startLoop();
    return promise;
  }

  startSettle(now) {
    this.rollState.settleStarted = true;
    this.rollState.settleAt = now;
    const size = PHYSICS_CONFIG.diceSize;

    const settleTargets = assignNearestTargets(this.dice, createSettleTargets(this.dice.length));

    this.dice.forEach((die, index) => {
      die.body.velocity.set(0, 0, 0);
      die.body.angularVelocity.set(0, 0, 0);
      die.body.sleep();
      die.settleStartQuaternion.copy(die.mesh.quaternion);
      die.settleTargetQuaternion.copy(targetQuaternionForTopValue(die.targetValue));
      die.settleStartPosition.copy(die.mesh.position);
      const target = settleTargets[index];
      die.settleTargetPosition.set(target.x, size / 2 - 0.02, target.y);
    });
  }

  applyContainment(body) {
    const radius = Math.hypot(body.position.x, body.position.z);
    const limit = PHYSICS_CONFIG.bowlContainmentRadius;
    if (radius > limit) {
      const normalX = body.position.x / radius;
      const normalZ = body.position.z / radius;
      body.position.x = normalX * limit;
      body.position.z = normalZ * limit;
      const outwardVelocity = body.velocity.x * normalX + body.velocity.z * normalZ;
      if (outwardVelocity > 0) {
        body.velocity.x -= normalX * outwardVelocity * 1.32;
        body.velocity.z -= normalZ * outwardVelocity * 1.32;
      }
      body.velocity.x -= normalX * 0.24;
      body.velocity.z -= normalZ * 0.24;
    }
    if (body.position.y < -0.35 || body.position.y > 4.5) {
      body.position.y = PHYSICS_CONFIG.throwHeight;
      body.velocity.set(randomBetween(-0.4, 0.4), -1, randomBetween(-0.4, 0.4));
    }
  }

  update(now) {
    if (!this.rollState || document.hidden) return;

    const elapsed = now - this.rollState.startAt;
    const settleStartTime = this.rollState.duration - this.rollState.settleDuration;

    if (!this.rollState.settleStarted && elapsed >= settleStartTime) {
      this.startSettle(now);
    }

    if (!this.rollState.settleStarted) {
      this.dice.forEach((die) => this.applyContainment(die.body));
      this.world.step(PHYSICS_CONFIG.timeStep, Math.min(0.04, this.clock.getDelta()), PHYSICS_CONFIG.maxSubSteps);
      this.dice.forEach((die) => {
        this.applyContainment(die.body);
        die.mesh.position.copy(die.body.position);
        die.mesh.quaternion.copy(die.body.quaternion);
      });
    } else {
      const progress = clamp((now - this.rollState.settleAt) / this.rollState.settleDuration, 0, 1);
      const eased = easeInOutCubic(progress);
      this.dice.forEach((die) => {
        die.mesh.position.lerpVectors(die.settleStartPosition, die.settleTargetPosition, eased);
        die.mesh.quaternion.copy(die.settleStartQuaternion).slerp(die.settleTargetQuaternion, eased);
      });

      if (progress >= 1) {
        const resolve = this.rollState.resolve;
        this.rollState = null;
        this.renderOnce();
        this.stopLoop();
        resolve?.();
      }
    }
  }

  startLoop() {
    if (this.frameId) return;
    this.clock.getDelta();
    const tick = (now) => {
      this.frameId = requestAnimationFrame(tick);
      this.update(now);
      this.renderer.render(this.scene, this.camera);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  getDiagnostics() {
    const positions = this.dice.map(({ mesh }) => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z }));
    let minimumDistance = Number.POSITIVE_INFINITY;
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        minimumDistance = Math.min(
          minimumDistance,
          Math.hypot(positions[first].x - positions[second].x, positions[first].z - positions[second].z),
        );
      }
    }
    return {
      positions,
      minimumDistance,
      maximumRadius: Math.max(...positions.map((position) => Math.hypot(position.x, position.z))),
    };
  }
}
