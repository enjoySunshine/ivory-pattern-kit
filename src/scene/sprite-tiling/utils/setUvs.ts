import { Matrix } from '../../../maths/matrix/Matrix';
import { applyMatrix } from './applyMatrix';
import { getTrimOffset } from './getTrimOffset';

import type { TilingSprite } from '../TilingSprite';

/**
 * @param tilingSprite
 * @param uvs
 * @internal
 */
export function setUvs(tilingSprite: TilingSprite, uvs: Float32Array)
{
    const texture = tilingSprite.texture;

    const width = texture.frame.width;
    const height = texture.frame.height;

    let anchorX = 0;
    let anchorY = 0;

    if (tilingSprite.applyAnchorToTexture)
    {
        anchorX = tilingSprite.anchor.x;
        anchorY = tilingSprite.anchor.y;
    }

    uvs[0] = uvs[6] = -anchorX;
    uvs[2] = uvs[4] = 1 - anchorX;
    uvs[1] = uvs[3] = -anchorY;
    uvs[5] = uvs[7] = 1 - anchorY;

    // Build the forward transform that maps the [0..1] sprite quad to texture-uv space,
    // then invert it. Matches the formula used in TilingSpriteShader so square and
    // non-square sprites render the same pattern orientation under tileRotation.
    const tileMatrix = tilingSprite._tileTransform.matrix;
    const textureMatrix = Matrix.shared;

    textureMatrix.set(
        (tileMatrix.a * width) / tilingSprite.width,
        (tileMatrix.b * width) / tilingSprite.height,
        (tileMatrix.c * height) / tilingSprite.width,
        (tileMatrix.d * height) / tilingSprite.height,
        tileMatrix.tx / tilingSprite.width,
        tileMatrix.ty / tilingSprite.height,
    );

    textureMatrix.invert();

    applyMatrix(uvs, 2, 0, textureMatrix);

    // The visible region may have been cropped out of a larger original artwork.
    // Shift the tile phase so that tile (0, 0) lines up with the top-left of the
    // visible region rather than the original artwork's top-left. This is a
    // constant offset in tile-normalized units, so it is unaffected by tile
    // rotation, scale or position (and by the sprite anchor, which only shifts
    // the quad corners above).
    const trimOffset = getTrimOffset(texture);

    if (trimOffset.x !== 0 || trimOffset.y !== 0)
    {
        for (let i = 0; i < uvs.length; i += 2)
        {
            uvs[i] -= trimOffset.x;
            uvs[i + 1] -= trimOffset.y;
        }
    }
}
