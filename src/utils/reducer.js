import { Map } from 'immutable';
import { combineReducers } from 'redux-immutable';
import * as R from 'ramda';

import { LEFT, BLOCK_SIZE, FIELD_BSIZE, DIRECTION_MAP } from 'utils/consts';
import * as A from 'utils/actions';
import BulletRecord from 'types/BulletRecord';

const playerInitialState = Map({
  x: 0,
  y: 0,
  direction: LEFT,
  moving: false
});

const clamp = R.clamp(0, BLOCK_SIZE * (FIELD_BSIZE - 1));

function player(state = playerInitialState, action) {
  if (action.type === A.MOVE) {
    const { direction, distance } = action;
    if (direction !== state.get('direction')) {
      return state.set('direction', direction);
    }
    const [xy, incdec] = DIRECTION_MAP[direction];
    return state.update(
      xy,
      incdec === 'inc' ? R.pipe(R.add(distance), clamp) : R.pipe(R.subtract(R.__, distance), clamp)
    );
  } else if (action.type === A.START_MOVE) {
    return state.set('moving', true);
  } else if (action.type === A.STOP_MOVE) {
    return state.set('moving', false);
  }

  return state;
}

function bullets(state = Map(), action) {
  if (action.type === A.ADD_BULLET) {
    const { direction, speed, x, y, owner } = action;
    return state.set(owner, BulletRecord({ owner, direction, speed, x, y }));
  } else if (action.type === A.DESTROY_BULLETS) {
    const set = action.bullets.toSet();
    return state.filterNot(bullet => set.has(bullet));
  } else if (action.type === A.UPDATE_BULLETS) {
    return state.merge(action.updatedBullets);
  }
  return state;
}

export default combineReducers({
  player,
  bullets
});
