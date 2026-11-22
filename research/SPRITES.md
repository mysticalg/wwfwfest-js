# Native sprite recipes and paired artwork

`src/sprite-recipes.js` is a hand translation of the original data-format expansion routines. The browser interprets tile recipes through ordinary JavaScript functions. It does not execute 68000 instructions.

The former export attempted every frame without another actor. That left compound poses unresolved and sometimes treated unused table markers as recipe data. The native decoder now supplies a linked wrestler type when the original format requires one, respects missing entries and terminators, and expands actual sprite descriptors at the current projected coordinates.

## Data formats

| Routine | Meaning |
| --- | --- |
| `$00c43c`, `$00cee0` | Missing-frame gate and table lookup |
| `$00c452` | Projected origin, pose-facing flag and format dispatch |
| `$00c4ee` | Six-byte tile-chain records with optional shared prefix/suffix |
| `$00ca42` | Six compressed columns, constant/shared/inline addressing |
| `$00cc52` | Two-wrestler recipe with per-type offsets and layer order |
| `$00ce7c` | Ordered list of recipe parts |
| `$00c67a`, `$00c780` | Shared prefix/suffix expansion, including tail selection |
| `$03813a` | Relative frame-index tables |
| `$0381de` | Per-type recipe base pointers |
| `$06a2d6` | Shared column-data base |

The header's top two bits choose raw, compressed, paired or part-list format. Raw records contain x, y, attributes, palette, tile high byte and tile low byte. Compressed records independently select inline arrays, constant bytes or shared arrays for each column. Prefix/suffix records add byte offsets and can draw only the first or final subset of a shared block.

Paired records choose a frame from the linked wrestler's table, offsets from a twelve-entry table, and a word of interleaving flags. Both figures share the initiating actor's projected origin and mirror flag. Their parts retain the original order, tile palettes and chain attributes. Some pairs intentionally have no artwork because the linked type lacks the requested frame.

Byte additions wrap before sign extension. Hardware clipping uses the original expanded origin ranges `$0000..$015f` and `$0000..$0187`. Output coordinates preserve the sprite descriptor's extra x/y bits. Facing changes both byte coordinates and the chain flip bit; the previous whole-image mirroring was displaced by sixteen pixels. Actual match rendering now follows the original descriptor positions.

Frame tables contain 564 indexed entries per wrestler and eighteen for the referee, followed by `$ffff` terminators. The `$fffe` value inside those ranges marks an unavailable frame. JSON snapshots retain 565/nineteen records so the explorer can label the final marker explicitly; missing entries contain no fabricated pieces. `research/rom-manifest.json` records available, paired and missing counts per type.

## Editing and rendering

`assets/sprite-recipes.bin` contains the original table/data region beginning at `$03813a`, with origin, length, frame counts and SHA-256 in `sprite-recipes.json`. This is graphics data consumed by the translated parser. The earlier standalone JSON records remain editable snapshots. Set a frame's `override` property to `true` to render its edited `pieces` array instead of its native recipe. This supports custom artwork placement without editing binary data. Native recipes remain the default.

The animation explorer's **Other wrestler** picker supplies the paired type. This previews the recovered shared artwork; it does not imply that the corresponding gameplay action is connected yet. Match rendering accepts `linkedActor` for subsequent paired move integration.

## Verification

The standalone original-program tracer uses an external offline CPU interpreter, excluded from delivery. There are 936 reference groups totaling **488,592 frame expansions** and 2,921,319 emitted sprite chains. These cover:

- Every indexed frame for all thirteen actor types, all twelve linked types and both facings at the central reference origin.
- Every indexed frame for all actor types, linked types 0/6/11, both facings and eight additional origins at or beyond screen edges.
- Missing table entries, parts, shared prefix/suffix data, compressed columns, paired offsets, interleaving and coordinate clipping through those complete expansions.

Each group hashes every original descriptor's six hardware-significant bytes in order and compares both its total chains and SHA-256 against the native decoder. Separate tests check archive-data identity, terminators, required context and hardware coordinate conversion.

An independent Python rasterizer decodes the original sprite ROMs and palette words, then draws **210 original CPU descriptor captures**. Native browser Canvas output matches every resulting full 320-by-240 RGBA hash exactly. Cases include normal/run/rebound poses, paired holds across several types, both facings, missing combinations and edge clipping. Two additional browser checks confirm that editable standalone overrides match the corresponding original image in both directions. Paired explorer selection and unused-entry labels also passed browser checks without page errors.

These are sprite-rendering comparisons, not proof of complete gameplay parity. Ordinary running attacks and their paired physics now have separate native comparisons in [running action research](RUNNING_ATTACKS.md). Standing grapples, other paired actions, original match rules and remaining audio routing still need their own native logic and reference runs.

## Reproduction

```sh
python tools/extract_sprite_recipes.py path/to/wwfwfest.zip
node tools/export_sprite_poses.mjs
node tools/trace_sprite_recipes.mjs path/to/mc68000.js path/to/program.bin tests/fixtures/sprite-recipes-reference.json
npm run check
```

The tracer also accepts JSON environment variables `TYPES`, `TARGETS` and `ORIGINS`. The default is all types/targets at `[128,128]`. The edge groups were appended with `APPEND=1`, `TARGETS=[0,6,11]` and `ORIGINS=[[-32,-64],[0,0],[0,248],[320,0],[320,248],[352,304],[128,-64],[128,304]]`.

For the independent pixel fixtures, set `PIXEL_CASES` to `tests/fixtures/sprite-pixels-reference.json` and run the tracer with a temporary output path. Then run `python tools/hash_sprite_frames.py path/to/wwfwfest.zip path/to/temporary-captures.json tests/fixtures/sprite-pixels-reference.json`. The temporary descriptors and analysis CPU are not browser dependencies.
