import { Map } from 'immutable';

export type CooldownsMap = Map<TankId, number>;

export default function cooldowns(state = Map<TankId, number>(), action: Action) {
  if (action.type === 'SET_COOLDOWN') {
    return state.set(action.tankId, action.cooldown);
  } else if (action.type === 'SPAWN_TANK') {
    return state.set(action.tank.tankId, 0);
  } else if (action.type === 'REMOVE_TANK') {
    return state.delete(action.tankId);
  } else {
    return state;
  }
}
