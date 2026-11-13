import { Matrix } from '../../../maths/matrix/Matrix';
import {
    compileHighShaderGlProgram,
    compileHighShaderGpuProgram
} from '../../../rendering/high-shader/compileHighShaderToProgram';
import { localUniformBit, localUniformBitGl } from '../../../rendering/high-shader/shader-bits/localUniformBit';
import { roundPixelsBit, roundPixelsBitGl } from '../../../rendering/high-shader/shader-bits/roundPixelsBit';
import { Shader } from '../../../rendering/renderers/shared/shader/Shader';
import { UniformGroup } from '../../../rendering/renderers/shared/shader/UniformGroup';
import { Texture } from '../../../rendering/renderers/shared/texture/Texture';
import { getTrimOffset } from '../utils/getTrimOffset';
import { tilingBit, tilingBitGl } from './tilingBit';

import type { GlProgram } from '../../../rendering/renderers/gl/shader/GlProgram';
import type { GpuProgram } from '../../../rendering/renderers/gpu/shader/GpuProgram';

let gpuProgram: GpuProgram;
let glProgram: GlProgram;

/**
 * The shader used by the TilingSprite.
 * @internal
 */
export class TilingSpriteShader extends Shader
{
    /**
     * Tiling-specific mapping from tile-normalized coordinates to source texture
     * coordinates. Contains only the frame placement (scale + translate from the
     * texture uvs); artwork-crop translation is supplied separately through
     * `uTrimOffset` so a cropped region tiles as a standalone image.
     */
    private readonly _tilingMapCoord = new Matrix();
    constructor()
    {
        gpuProgram ??= compileHighShaderGpuProgram({
            name: 'tiling-sprite-shader',
            bits: [
                localUniformBit,
                tilingBit,
                roundPixelsBit,
            ],
        });

        glProgram ??= compileHighShaderGlProgram({
            name: 'tiling-sprite-shader',
            bits: [
                localUniformBitGl,
                tilingBitGl,
                roundPixelsBitGl,
            ]
        });

        const tilingUniforms = new UniformGroup({
            uMapCoord: { value: new Matrix(), type: 'mat3x3<f32>' },
            uClampFrame: { value: new Float32Array([0, 0, 1, 1]), type: 'vec4<f32>' },
            uClampOffset: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
            uTextureTransform: { value: new Matrix(), type: 'mat3x3<f32>' },
            uSizeAnchor: { value: new Float32Array([100, 100, 0.5, 0.5]), type: 'vec4<f32>' },
            uTrimOffset: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
        });

        super({
            glProgram,
            gpuProgram,
            resources: {
                localUniforms: new UniformGroup({
                    uTransformMatrix: { value: new Matrix(), type: 'mat3x3<f32>' },
                    uColor: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
                    uRound: { value: 0, type: 'f32' },
                }),
                tilingUniforms,
                uTexture: Texture.EMPTY.source,
                uSampler: Texture.EMPTY.source.style,
            }
        });
    }

    public updateUniforms(
        width: number, height: number,
        matrix: Matrix,
        anchorX: number, anchorY: number,
        texture: Texture
    ): void
    {
        const tilingUniforms = this.resources.tilingUniforms;

        // Tile against the visible region (the frame), not the original artwork:
        // the tile transform is normalized by the repeated region's own size, the
        // same convention used by the batched path (see setUvs).
        const textureWidth = texture.frame.width;
        const textureHeight = texture.frame.height;
        const textureMatrix = texture.textureMatrix;

        const uTextureTransform = tilingUniforms.uniforms.uTextureTransform;

        uTextureTransform.set(
            matrix.a * textureWidth / width,
            matrix.b * textureWidth / height,
            matrix.c * textureHeight / width,
            matrix.d * textureHeight / height,
            matrix.tx / width,
            matrix.ty / height);

        uTextureTransform.invert();

        // Frame placement only (tile-normalized -> source texture uv). The trim
        // handling in textureMatrix.mapCoord also rescales coordinates back to the
        // original artwork size, which would distort tiling, so the crop is applied
        // separately as a translation in tile space via uTrimOffset.
        const uvs = texture.uvs;
        const tilingMapCoord = this._tilingMapCoord;

        tilingMapCoord.set(
            uvs.x1 - uvs.x0,
            uvs.y1 - uvs.y0,
            uvs.x3 - uvs.x0,
            uvs.y3 - uvs.y0,
            uvs.x0,
            uvs.y0,
        );

        const trimOffset = getTrimOffset(texture);
        const uTrimOffset = tilingUniforms.uniforms.uTrimOffset as Float32Array;

        uTrimOffset[0] = trimOffset.x;
        uTrimOffset[1] = trimOffset.y;

        tilingUniforms.uniforms.uMapCoord = tilingMapCoord;
        tilingUniforms.uniforms.uClampFrame = textureMatrix.uClampFrame;
        tilingUniforms.uniforms.uClampOffset = textureMatrix.uClampOffset;
        tilingUniforms.uniforms.uTextureTransform = uTextureTransform;
        tilingUniforms.uniforms.uSizeAnchor[0] = width;
        tilingUniforms.uniforms.uSizeAnchor[1] = height;
        tilingUniforms.uniforms.uSizeAnchor[2] = anchorX;
        tilingUniforms.uniforms.uSizeAnchor[3] = anchorY;

        if (texture)
        {
            this.resources.uTexture = texture.source;
            this.resources.uSampler = texture.source.style;
        }
    }
}
