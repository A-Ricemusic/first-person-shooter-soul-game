# Original station PBR materials

These textures were authored as procedural Blender shader graphs and baked with
Cycles on CPU using `tools/build_materials.py`. No source photographs, downloaded
textures, or generated bitmap images were used. The packed source graphs and
images are retained in `../station-materials.blend`.

Each set has 1024 × 1024 PNG maps:

| Suffix | Texture color space | Material input |
| --- | --- | --- |
| `-color.png` | sRGB | Albedo / base color |
| `-roughness.png` | Linear / non-color | Roughness (all RGB channels equal) |
| `-normal.png` | Linear / non-color | OpenGL +Y tangent-space normal |

`floor-concrete` represents a roughly 4 m surface patch; `wall-concrete` a 3 m
patch. They contain broad capillary dampening, fine aggregate, shallow pitting,
and sparse interrupted hairline fractures. The material is a dielectric:
metalness should be zero. Use a white material tint and a roughness multiplier of
1 as the starting point. Start normal strength around 0.45–0.6 and evaluate at
actual gameplay camera height. All three textures must use the same UV mapping,
repeat, anisotropy, and wrapping.

Noise is mapped around a 4D torus so it tiles without hard seams. The fissure
field is also periodic. These are material surface maps, not pre-lit images;
reflected lights and puddle reflections remain the runtime renderer's job.

Example rebuild on the authoring machine:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_materials.py
```

The `materials-manifest.json` records the actual Blender version, output sizes,
bake passes, resolution, intended tile scale, and elapsed time.
