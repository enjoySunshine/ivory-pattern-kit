import type { Texture } from '../../../rendering/renderers/shared/texture/Texture';

/**
 * Offset, in tile-normalized units, of the visible texture region (the
 * {@link Texture#frame}) inside the texture's original artwork, as recorded by
 * {@link Texture#trim}.
 *
 * A TilingSprite repeats the visible region as if it were a standalone image:
 * tile coordinate `(0, 0)` corresponds to the top-left of that region. When the
 * region was cropped out of a larger original artwork, `trim` records where it
 * used to live, so the pattern phase has to be shifted back by that amount.
 * The shift is expressed relative to the repeated tile size (the frame size),
 * which keeps it independent of tile rotation, scale and position.
 * @param texture - the texture used by the TilingSprite
 * @returns the offset `{ x, y }` in tile-normalized units (zero when not cropped)
 * @internal
 */
export function getTrimOffset(texture: Texture): { x: number, y: number }
{
    const trim = texture.trim;

    if (!trim)
    {
        return { x: 0, y: 0 };
    }

    return {
        x: trim.x / texture.frame.width,
        y: trim.y / texture.frame.height,
    };
}
