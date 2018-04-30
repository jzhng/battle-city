import React from 'react';
import { connect } from 'react-redux';

import Tank from 'components/Tank';
import Bullet from 'components/Bullet';
import BrickLayer from 'components/BrickLayer';
import SteelLayer from 'components/SteelLayer';
import RiverLayer from 'components/RiverLayer';
import SnowLayer from 'components/SnowLayer';
import ForestLayer from 'components/ForestLayer';
import Eagle from 'components/Eagle';
import Explosion from 'components/Explosion';

import { BLOCK_SIZE } from 'utils/consts';
import * as selectors from 'utils/selectors';
import * as A from 'utils/actions';

function mapStateToProps(state) {
  return {
    player: selectors.player(state),
    bullets: selectors.bullets(state),
    map: selectors.map(state),
    explosions: selectors.explosions(state)
  };
}

@connect(mapStateToProps)
export default class Screen extends React.Component {
  render() {
    const { player, bullets, map, explosions } = this.props;
    const { bricks, steels, rivers, snows, forests } = map.toObject();
    const { direction, x, y, moving } = player.toObject();
    return (
      <g data-role="screen">
        <g data-role="board" transform={`translate(${BLOCK_SIZE},${BLOCK_SIZE})`}>
          <rect width={13 * BLOCK_SIZE} height={13 * BLOCK_SIZE} fill="#000" />
          <g data0role="bullets">
            {bullets
              .map((b, i) => <Bullet key={i} direction={b.direction} x={b.x} y={b.y} />)
              .toArray()}
          </g>
          <SteelLayer steels={steels} />
          <BrickLayer bricks={bricks} />
          <RiverLayer rivers={rivers} />
          <SnowLayer snows={snows} />
          <Tank direction={direction} x={x} y={y} level={0} color="yellow" moving={moving} />
          <ForestLayer forests={forests} />
          <Eagle x={6 * BLOCK_SIZE} y={12 * BLOCK_SIZE} />
          <g data-role="explosion-layer">
            {explosions
              .map(exp => (
                <Explosion
                  key={exp.explosionId}
                  x={exp.x}
                  y={exp.y}
                  delayedAction={{
                    type: A.REMOVE_EXPLOSION,
                    explosionId: exp.explosionId
                  }}
                />
              ))
              .toArray()}
          </g>
        </g>
      </g>
    );
  }
}
