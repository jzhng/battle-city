import Mousetrap from 'mousetrap';
import { take, put, select } from 'redux-saga/effects';
import * as _ from 'lodash';
import * as R from 'ramda';

import { UP, DOWN, LEFT, RIGHT, DIRECTION_MAP } from 'utils/consts';
import * as A from 'utils/actions';
import * as selectors from 'utils/selectors';

export default function* directionController() {
  const pressed = [];
  let moving = false;

  bindKeyWithDirection('w', UP);
  bindKeyWithDirection('a', LEFT);
  bindKeyWithDirection('s', DOWN);
  bindKeyWithDirection('d', RIGHT);

  while (true) {
    const { delta } = yield take(A.TICK);
    const speed = 48 / 1000;
    if (pressed.length > 0) {
      const player = yield select(selectors.player);
      const direction = _.last(pressed);
      if (direction !== player.get('direction')) {
        yield put({ type: A.TURN, direction });
      } else {
        const distance = delta * speed;
        const [xy, incdec] = DIRECTION_MAP[direction];
        const movedPlayer = player.update(
          xy,
          incdec === 'inc' ? R.add(distance) : R.subtract(R.__, distance)
        );
        if (yield select(selectors.canMove, movedPlayer)) {
          yield put({ type: A.MOVE, player: movedPlayer });
          if (!moving) {
            yield put({ type: A.START_MOVE });
            moving = true;
          }
        }
      }
    } else if (moving) {
      yield put({ type: A.STOP_MOVE });
      moving = false;
    }
  }

  function bindKeyWithDirection(key, direction) {
    Mousetrap.bind(
      key,
      () => {
        if (!pressed.includes(direction)) {
          pressed.push(direction);
        }
      },
      'keydown'
    );
    Mousetrap.bind(
      key,
      () => {
        _.pull(pressed, direction);
      },
      'keyup'
    );
  }
}
