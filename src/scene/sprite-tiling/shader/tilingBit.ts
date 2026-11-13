/** @internal */
export const tilingBit = {
    name: 'tiling-bit',
    vertex: {
        header: /* wgsl */`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>,
                uTrimOffset:vec2<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,
        main: /* wgsl */`
            uv = (tilingUniforms.uTextureTransform * vec3(uv, 1.0)).xy;

            position = (position - tilingUniforms.uSizeAnchor.zw) * tilingUniforms.uSizeAnchor.xy;
        `

    },
    fragment: {
        header: /* wgsl */`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>,
                uTrimOffset:vec2<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,
        main: /* wgsl */`

            // Re-anchor tile coordinates on the top-left of the visible region when
            // the texture was cropped out of a larger original artwork (see trim).
            var tileCoord = vUV - tilingUniforms.uTrimOffset;
            var coord = tileCoord + ceil(tilingUniforms.uClampOffset - tileCoord);
            coord = (tilingUniforms.uMapCoord * vec3(coord, 1.0)).xy;
            var unclamped = coord;
            coord = clamp(coord, tilingUniforms.uClampFrame.xy, tilingUniforms.uClampFrame.zw);

            var bias = 0.;

            if(unclamped.x == coord.x && unclamped.y == coord.y)
            {
                bias = -32.;
            }

            outColor = textureSampleBias(uTexture, uSampler, coord, bias);
        `
    }

};

/** @internal */
export const tilingBitGl = {
    name: 'tiling-bit',
    vertex: {
        header: /* glsl */`
            uniform mat3 uTextureTransform;
            uniform vec4 uSizeAnchor;

        `,
        main: /* glsl */`
            uv = (uTextureTransform * vec3(aUV, 1.0)).xy;

            position = (position - uSizeAnchor.zw) * uSizeAnchor.xy;
        `

    },
    fragment: {
        header: /* glsl */`
            uniform sampler2D uTexture;
            uniform mat3 uMapCoord;
            uniform vec4 uClampFrame;
            uniform vec2 uClampOffset;
            uniform vec2 uTrimOffset;
        `,
        main: /* glsl */`

        // Re-anchor tile coordinates on the top-left of the visible region when
        // the texture was cropped out of a larger original artwork (see trim).
        vec2 tileCoord = vUV - uTrimOffset;
        vec2 coord = tileCoord + ceil(uClampOffset - tileCoord);
        coord = (uMapCoord * vec3(coord, 1.0)).xy;
        vec2 unclamped = coord;
        coord = clamp(coord, uClampFrame.xy, uClampFrame.zw);

        outColor = texture(uTexture, coord, unclamped == coord ? 0.0 : -32.0);// lod-bias very negative to force lod 0

        `
    }

};
