import { Map, Set as ISet } from 'immutable';
import { fork, put, select, take } from 'redux-saga/effects';
import { BLOCK_SIZE, DOWN, ITEM_SIZE_MAP, N_MAP, SIDE, STEEL_POWER, UP } from 'utils/consts';
import {
  asBox,
  getDirectionInfo,
  getNextId,
  isInField,
  iterRowsAndCols,
  testCollide
} from 'utils/common';

import * as A from 'utils/actions';
import * as selectors from 'utils/selectors';

function isBulletInField(bullet) {
  return isInField(asBox(bullet));
}

function makeExplosionFromBullet(bullet) {
  return put({
    type: A.SPAWN_EXPLOSION,
    x: bullet.x - 6,
    y: bullet.y - 6,
    explosionType: 'bullet',
    explosionId: getNextId('explosion')
  });
}

function* handleTick() {
  while (true) {
    const { delta } = yield take(A.TICK);
    const bullets = yield select(selectors.bullets);
    if (bullets.isEmpty()) {
      continue;
    }
    const updatedBullets = bullets.map((bullet) => {
      const { direction, speed } = bullet;
      const distance = speed * delta;
      const { xy, updater } = getDirectionInfo(direction);
      return bullet.update(xy, updater(distance));
    });
    yield put({ type: A.UPDATE_BULLETS, updatedBullets });
  }
}

function* handleBulletsCollidedWithBricks(context) {
  const bullets = yield select(selectors.bullets);
  const bricks = yield select(selectors.map.bricks);

  bullets.forEach((bullet) => {
    for (const [row, col] of iterRowsAndCols(ITEM_SIZE_MAP.BRICK, asBox(bullet))) {
      const t = row * N_MAP.BRICK + col;
      if (bricks.get(t)) {
        context.expBulletIdSet.add(bullet.bulletId);
        return;
      }
    }
  });
}

function* handleBulletsCollidedWithSteels(context) {
  const bullets = yield select(selectors.bullets);
  const steels = yield select(selectors.map.steels);

  bullets.forEach((bullet) => {
    for (const [row, col] of iterRowsAndCols(ITEM_SIZE_MAP.STEEL, asBox(bullet))) {
      const t = row * N_MAP.STEEL + col;
      if (steels.get(t)) {
        context.expBulletIdSet.add(bullet.bulletId);
        return;
      }
    }
  });
}

const BULLET_EXPLOSION_SPREAD = 4;
function spreadBullet(bullet) {
  const object = asBox(bullet);

  if (bullet.direction === UP || bullet.direction === DOWN) {
    object.x -= BULLET_EXPLOSION_SPREAD;
    object.width += 2 * BULLET_EXPLOSION_SPREAD;
  } else {
    object.y -= BULLET_EXPLOSION_SPREAD;
    object.height += 2 * BULLET_EXPLOSION_SPREAD;
  }
  return object;
}

function* destroySteels(collidedBullets) {
  const steels = yield select(selectors.map.steels);
  const steelsNeedToDestroy = [];

  collidedBullets.forEach((bullet) => {
    if (bullet.power >= STEEL_POWER) {
      for (const [row, col] of iterRowsAndCols(ITEM_SIZE_MAP.STEEL, spreadBullet(bullet))) {
        const t = row * N_MAP.STEEL + col;
        if (steels.get(t)) {
          steelsNeedToDestroy.push(t);
        }
      }
    }
  });

  if (steelsNeedToDestroy.length > 0) {
    yield put({
      type: A.DESTROY_STEELS,
      ts: ISet(steelsNeedToDestroy)
    });
  }
}

function* destroyBricks(collidedBullets) {
  const bricks = yield select(selectors.map.bricks);
  const bricksNeedToDestroy = [];

  collidedBullets.forEach((bullet) => {
    for (const [row, col] of iterRowsAndCols(ITEM_SIZE_MAP.BRICK, spreadBullet(bullet))) {
      const t = row * N_MAP.BRICK + col;
      if (bricks.get(t)) {
        bricksNeedToDestroy.push(t);
      }
    }
  });

  if (bricksNeedToDestroy.length > 0) {
    yield put({
      type: A.DESTROY_BRICKS,
      ts: ISet(bricksNeedToDestroy)
    });
  }
}

function* filterBulletsCollidedWithEagle(bullets) {
  const eagle = yield select(selectors.map.eagle);
  if (eagle.get('broken')) {
    return Map();
  }
  const eagleBox = {
    x: eagle.get('x'),
    y: eagle.get('y'),
    width: BLOCK_SIZE,
    height: BLOCK_SIZE
  };
  return bullets.filter(bullet => testCollide(eagleBox, asBox(bullet)));
}

function* handleBulletsCollidedWithTanks(context) {
  const bullets = yield select(selectors.bullets);

  const tanks = yield select(selectors.tanks);
  for (const bullet of bullets.values()) {
    for (const tank of tanks.values()) {
      if (tank.tankId === bullet.tankId) {
        continue;
      }
      const subject = {
        x: tank.x,
        y: tank.y,
        width: BLOCK_SIZE,
        height: BLOCK_SIZE
      };
      if (testCollide(subject, asBox(bullet), -0.02)) {
        const bulletSide = yield select(selectors.sideOfBullet, bullet.bulletId);
        const tankSide = tank.side;
        if (bulletSide === SIDE.PLAYER && tankSide === SIDE.PLAYER) {
          context.expBulletIdSet.add(bullet.bulletId);
        } else if (bulletSide === SIDE.PLAYER && tankSide === SIDE.AI) {
          context.hurtedTankIds.add(tank.tankId);
          context.expBulletIdSet.add(bullet.bulletId);
        } else if (bulletSide === SIDE.AI && tankSide === SIDE.PLAYER) {
          context.hurtedTankIds.add(tank.tankId);
          context.expBulletIdSet.add(bullet.bulletId);
        } else if (bulletSide === SIDE.AI && tankSide === SIDE.AI) {
          context.noExpBulletIdSet.add(bullet.bulletId);
        } else {
          throw new Error('Error side status');
        }
      }
    }
  }
}

function* handleBulletsCollidedWithBullets(context) {
  const bullets = yield select(selectors.bullets);
  for (const bullet of bullets.values()) {
    const subject = asBox(bullet);
    for (const other of bullets.values()) {
      if (bullet.bulletId === other.bulletId) {
        continue;
      }
      const object = asBox(other);
      if (testCollide(subject, object)) {
        context.noExpBulletIdSet.add(bullet.bulletId);
      }
    }
  }
}

function* handleAfterTick() {
  while (true) {
    yield take(A.AFTER_TICK);
    const bullets = yield select(selectors.bullets);

    const bulletsCollidedWithEagle = yield* filterBulletsCollidedWithEagle(bullets);
    if (!bulletsCollidedWithEagle.isEmpty()) {
      yield put({
        type: A.DESTROY_BULLETS,
        bullets: bulletsCollidedWithEagle,
        spawnExplosion: true
      });
      yield put({ type: A.DESTROY_EAGLE });
    }

    const context = {
      expBulletIdSet: new Set(),
      noExpBulletIdSet: new Set(),
      hurtedTankIds: new Set()
    };

    yield* handleBulletsCollidedWithTanks(context);
    yield* handleBulletsCollidedWithBullets(context);
    yield* handleBulletsCollidedWithBricks(context);
    yield* handleBulletsCollidedWithSteels(context);

    const expBullets = bullets.filter(bullet => context.expBulletIdSet.has(bullet.bulletId));
    if (!expBullets.isEmpty()) {
      yield put({
        type: A.DESTROY_BULLETS,
        bullets: expBullets,
        spawnExplosion: true
      });

      yield* destroyBricks(expBullets);
      yield* destroySteels(expBullets);
    }

    const noExpBullets = bullets.filter(bullet => context.noExpBulletIdSet.has(bullet.bulletId));
    if (context.noExpBulletIdSet.size > 0) {
      yield put({
        type: A.DESTROY_BULLETS,
        bullets: noExpBullets,
        spawnExplosion: false
      });
    }

    const outsideBullets = bullets.filterNot(isBulletInField);
    if (!outsideBullets.isEmpty()) {
      yield put({
        type: A.DESTROY_BULLETS,
        bullets: outsideBullets,
        spawnExplosion: true
      });
    }
  }
}

export default function* bulletsSaga() {
  yield fork(handleTick);
  yield fork(handleAfterTick);

  yield fork(function* handleDestroyBullets() {
    while (true) {
      const { bullets, spawnExplosion } = yield take(A.DESTROY_BULLETS);
      if (spawnExplosion) {
        yield* bullets.toArray().map(makeExplosionFromBullet);
      }
    }
  });
}
