"""Build the licensed FM renderer as JavaScript, or a separate QA reference."""
import argparse
import subprocess
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--emcc', type=Path, required=True)
    parser.add_argument('--reference-wasm', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    source = root / 'third_party/ymfm'
    output = args.reference_wasm or root / 'src/audio/vendor/ymfm.js'
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [sys.executable, str(args.emcc), str(root / 'tools/fm_bridge.cpp'),
               str(source / 'ymfm_opm.cpp'), '-I' + str(source), '-O2', '-g2',
               '-fno-exceptions', '-fno-rtti', '-sDEFAULT_TO_CXX=1', '--no-entry',
               '-sWASM=' + ('1' if args.reference_wasm else '0'),
               '-sMODULARIZE=1', '-sEXPORT_ES6=1',
               '-sENVIRONMENT=' + ('web,worker,node' if args.reference_wasm else 'web,worker'),
               '-sFILESYSTEM=0', '-sWASM_ASYNC_COMPILATION=0',
               '-sINITIAL_MEMORY=8388608', '-sSTACK_SIZE=65536',
               '-sEXPORTED_FUNCTIONS=_fm_create,_fm_destroy,_fm_write,_fm_sample',
               '-sASSERTIONS=0', '-o', str(output)]
    subprocess.run(command, check=True)
    print(f'Built {output}')


if __name__ == '__main__':
    main()
