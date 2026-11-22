# FM renderer provenance

`ymfm/` contains the unmodified OPM renderer and its required headers from Aaron Giles' ymfm project, revision `81aec25ccbb98f4873a255f7551ac4dadac59b4a`. The BSD 3-Clause license is preserved in `ymfm/LICENSE` and in each source file. [Upstream ymfm](https://github.com/aaronsgiles/ymfm/tree/81aec25ccbb98f4873a255f7551ac4dadac59b4a)

`src/audio/vendor/ymfm.js` is the generated JavaScript synthesis library. It is built from these files and `tools/fm_bridge.cpp` using Emscripten 6.0.13 with `WASM=0`. The Emscripten runtime license is preserved in `emscripten-LICENSE.txt`.

To rebuild the production JavaScript file, provide the path to an installed Emscripten compiler script.

```sh
python tools/build_fm.py --emcc path/to/emscripten/emcc.py
```

The optional `--reference-wasm path/to/reference.mjs` argument builds a separate reference backend for output comparisons. Those QA binaries belong outside the served project directory. The production build emits JavaScript.

The audio regression tests initialize and exercise the production library with `globalThis.WebAssembly` unavailable. The gameplay state, music interpreter, sample decoder and event routing are separate editable JavaScript modules.
