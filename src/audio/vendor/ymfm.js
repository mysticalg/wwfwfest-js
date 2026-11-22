// This code implements the `-sMODULARIZE` settings by taking the generated
// JS program code (INNER_JS_CODE) and wrapping it in a factory function.

// When targeting node and ES6 we use `await import ..` in the generated code
// so the outer function needs to be marked as async.
async function Module(moduleArg = {}) {
  var Module = moduleArg;
// include: shell.js
// include: minimum_runtime_check.js
// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).
// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;

var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;

// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
var programArgs = [];

var thisProgram = "./this.program";

var _scriptName = import.meta.url;

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = "";

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL(".", _scriptName).href;
  } catch {}
  {
    // include: web_or_worker_shell_read.js
    if (ENVIRONMENT_IS_WORKER) {
      readBinary = url => {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(/** @type{!ArrayBuffer} */ (xhr.response));
      };
    }
    readAsync = async url => {
      var response = await fetch(url, {
        credentials: "same-origin"
      });
      if (response.ok) {
        return response.arrayBuffer();
      }
      throw new Error(response.status + " : " + response.url);
    };
  }
} else {}

var out = console.log.bind(console);

var err = console.error.bind(console);

// end include: shell.js
// include: preamble.js
// === Preamble library stuff ===
// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html
var wasmBinary;

// WASM == 2 includes wasm2js.js separately.
// include: wasm2js.js
// wasm2js.js - enough of a polyfill for the WebAssembly object so that we can load
// wasm2js code that way.
/** @suppress{duplicate, const, checkTypes} */ var WebAssembly = {
  // Note that we do not use closure quoting (this['buffer'], etc.) on these
  // functions, as they are just meant for internal use. In other words, this is
  // not a fully general polyfill.
  /** @constructor */ Memory: function(opts) {
    this.buffer = new ArrayBuffer(opts["initial"] * 65536);
  },
  Module: function(binary) {},
  /** @constructor */ Instance: function(module, info) {
    // TODO: use the module somehow - right now the wasm2js output is embedded in
    // the main JS
    // This will be replaced by the actual wasm2js code.
    this.exports = (
function instantiate(info) {
function Table(ret) {
  // grow method not included; table is not growable
  ret.set = function(i, func) {
    this[i] = func;
  };
  ret.get = function(i) {
    return this[i];
  };
  return ret;
}

  var bufferView;
  var base64ReverseLookup = new Uint8Array(123/*'z'+1*/);
  for (var i = 25; i >= 0; --i) {
    base64ReverseLookup[48+i] = 52+i; // '0-9'
    base64ReverseLookup[65+i] = i; // 'A-Z'
    base64ReverseLookup[97+i] = 26+i; // 'a-z'
  }
  base64ReverseLookup[43] = 62; // '+'
  base64ReverseLookup[47] = 63; // '/'
  /** @noinline Inlining this function would mean expanding the base64 string 4x times in the source code, which Closure seems to be happy to do. */
  function base64DecodeToExistingUint8Array(uint8Array, offset, b64) {
    var b1, b2, i = 0, j = offset, bLength = b64.length, end = offset + (bLength*3>>2) - (b64[bLength-2] == '=') - (b64[bLength-1] == '=');
    for (; i < bLength; i += 4) {
      b1 = base64ReverseLookup[b64.charCodeAt(i+1)];
      b2 = base64ReverseLookup[b64.charCodeAt(i+2)];
      uint8Array[j++] = base64ReverseLookup[b64.charCodeAt(i)] << 2 | b1 >> 4;
      if (j < end) uint8Array[j++] = b1 << 4 | b2 >> 2;
      if (j < end) uint8Array[j++] = b2 << 6 | base64ReverseLookup[b64.charCodeAt(i+3)];
    }
    return uint8Array;
  }
function initActiveSegments(imports) {
  base64DecodeToExistingUint8Array(bufferView, 1032, "AQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACg==");
  base64DecodeToExistingUint8Array(bufferView, 1080, "CwAAAAwAAAANAAAADgAAAA8AAABtX29wWzNdICE9IG51bGxwdHIAbV9vcFsyXSAhPSBudWxscHRyAG1fb3BbMV0gIT0gbnVsbHB0cgBtX29wWzBdICE9IG51bGxwdHIAQzpcVXNlcnNcZHJob29cRG9jdW1lbnRzXENvZGV4XDIwMjYtMTEtMjFcY2FuLXgyMFxvdXRwdXRzXHd3ZndmZXN0LWpzXHRoaXJkX3BhcnR5XHltZm1ceW1mbV9mbS5pcHAAQzpcVXNlcnNcZHJob29cRG9jdW1lbnRzXENvZGV4XDIwMjYtMTEtMjFcY2FuLXgyMFxvdXRwdXRzXHd3ZndmZXN0LWpzXHRoaXJkX3BhcnR5XHltZm1ceW1mbV9vcG0uY3BwAG91dHB1dF80b3AAd3JpdGUAZW5naW5lX3RpbWVyX2V4cGlyZWQAaW5kZXggPCBSRUdJU1RFUlMAdG51bSA9PSAwIHx8IHRudW0gPT0gMQAAAIAB9AFgAg==");
  base64DecodeToExistingUint8Array(bufferView, 1472, "WQjDBgcGiwUuBeQEpgRxBEMEGgT1A9MDtQOYA34DZQNOAzkDJAMRA/8C7QLcAs0CvQKvAqACkwKGAnkCbQJhAlYCSwJAAjYCLAIiAhgCDwIGAv0B9QHsAeQB3AHUAc0BxQG+AbcBsAGpAaIBmwGVAY8BiAGCAXwBdwFxAWsBZgFgAVsBVQFQAUsBRgFBATwBNwEzAS4BKQElASEBHAEYARQBDwELAQcBAwH/APsA+AD0APAA7ADpAOUA4gDeANsA1wDUANEAzQDKAMcAxADBAL4AuwC4ALUAsgCvAKwAqQCnAKQAoQCfAJwAmQCXAJQAkgCPAI0AigCIAIYAgwCBAH8AfQB6AHgAdgB0AHIAcABuAGwAagBoAGYAZABiAGAAXgBcAFsAWQBXAFUAUwBSAFAATgBNAEsASgBIAEYARQBDAEIAQAA/AD4APAA7ADkAOAA3ADUANAAzADEAMAAvAC4ALQArACoAKQAoACcAJgAlACQAIwAiACEAIAAfAB4AHQAcABsAGgAZABgAFwAXABYAFQAUABQAEwASABEAEQAQAA8ADwAOAA0ADQAMAAwACwAKAAoACQAJAAgACAAHAAcABwAGAAYABQAFAAUABAAEAAQAAwADAAMAAgACAAIAAgABAAEAAQABAAEAAQAB");
  base64DecodeToExistingUint8Array(bufferView, 1986, "AQIAAAECAAABAgAAAQIAAQICAAECAwABAgMAAQIDAAECBAABAwQAAQMEAAEDBQACBAUAAgQGAAIEBgACBQcAAgUIAAMGCAADBgkAAwcKAAQICwAECAwABAkNAAUKDgAFCxAABgwRAAYNEwAHDhQACBAWAAgQFgAIEBYACBAWYKIAAICiAACgogAAwKIAAOCiAAAAowAAIKMAAECjAACAowAAoKMAAMCjAADgowAAIKQAAECkAABgpAAAgKQAAMCkAADgpAAAAKUAACClAABApQAAYKUAAIClAACgpQAA4KUAAACmAAAgpgAAQKYAAICmAACgpgAAwKYAAOCmAAAgpwAAQKcAAGCnAACApwAAoKcAAMCnAADgpwAAAKgAAECoAABgqAAAgKgAAKCoAADgqAAAAKkAACCpAABAqQAAgKkAAKCpAADAqQAA4KkAACCqAABAqgAAYKoAAICqAADAqgAA4KoAAACrAAAgqwAAYKsAAICrAACgqwAAwKsAAACsAAAgrAAAQKwAAGCsAACgrAAAwKwAAOCsAAAArQAAQK0AAGCtAACArQAAoK0AAOCtAAAArgAAIK4AAECuAACArgAAoK4AAMCuAADgrgAAIK8AAECvAABgrwAAgK8AAMCvAADgrwAAALAAACCwAABgsAAAgLAAAKCwAADAsAAAALEAACCxAABAsQAAYLEAAKCxAADAsQAA4LEAAACyAABAsgAAYLIAAKCyAADAsgAA4LIAAACzAABAswAAYLMAAKCzAADAswAA4LMAAAC0AABAtAAAYLQAAIC0AACgtAAA4LQAAAC1AAAgtQAAQLUAAIC1AACgtQAAwLUAAOC1AABAtgAAYLYAAIC2AACgtgAA4LYAAAC3AAAgtwAAQLcAAIC3AACgtwAA4LcAAAC4AAAguAAAQLgAAIC4AACguAAA4LgAAAC5AAAguQAAQLkAAIC5AACguQAAwLkAAOC5AAAgugAAQLoAAIC6AACgugAAwLoAAOC6AAAguwAAQLsAAKC7AADAuwAA4LsAAAC8AABAvAAAYLwAAKC8AADAvAAAAL0AACC9AABAvQAAYL0AAKC9AADAvQAAAL4AACC+AABgvgAAgL4AAKC+AADAvgAAAL8AACC/AABgvwAAgL8AAMC/AADgvwAAAMAAACDAAABgwAAAgMAAAMDAAADgwAAAIMEAAEDBAABgwQAAgMEAAMDBAADgwQAAIMIAAEDCAACAwgAAoMIAAMDCAADgwgAAIMMAAEDDAACAwwAAoMMAAODDAAAAxAAAIMQAAEDEAACAxAAAoMQAAODEAAAAxQAAQMUAAGDFAACAxQAAoMUAAODFAAAAxgAAQMYAAGDGAADAxgAA4MYAAADHAAAgxwAAYMcAAIDHAADAxwAA4McAACDIAABAyAAAgMgAAKDIAADgyAAAAMkAACDJAABAyQAAoMkAAMDJAADgyQAAAMoAAEDKAABgygAAoMoAAMDKAAAAywAAIMsAAGDLAACAywAAwMsAAODLAAAAzAAAIMwAAKDMAADAzAAA4MwAAADNAABAzQAAYM0AAKDNAADAzQAAAM4AACDOAABgzgAAgM4AAMDOAADgzgAAAM8AACDPAACAzwAAoM8AAODPAAAA0AAAQNAAAGDQAACg0AAAwNAAAADRAAAg0QAAYNEAAIDRAADA0QAA4NEAACDSAABA0gAAoNIAAMDSAAAA0wAAINMAAGDTAACA0wAAwNMAAODTAAAg1AAAQNQAAIDUAACg1AAA4NQAAADVAABA1QAAYNUAAKDVAADA1QAAANYAACDWAABg1gAAgNYAAMDWAADg1gAAINcAAEDXAACA1wAAoNcAAODXAAAA2AAAQNgAAGDYAADA2AAA4NgAACDZAABA2QAAgNkAAKDZAADg2QAAANoAAEDaAACA2gAAoNoAAODaAAAA2wAAQNsAAGDbAACg2wAA4NsAAADcAABA3AAAYNwAAKDcAADA3AAAAN0AACDdAABg3QAAoN0AAMDdAAAA3gAAIN4AAGDeAACA3gAAwN4AACDfAABA3wAAgN8AAKDfAADg3wAAIOAAAEDgAACA4AAAwOAAAODgAAAg4QAAQOEAAIDhAADA4QAA4OEAACDiAABg4gAAgOIAAMDiAADg4gAAIOMAAGDjAACA4wAAwOMAAADkAAAg5AAAYOQAAIDkAADA5AAAAOUAACDlAABg5QAAoOUAAMDlAAAA5gAAIOYAAGDmAACg5gAAwOYAAADnAABA5wAAYOcAAKDnAADA5wAAAOgAAEDoAABg6AAAoOgAAADpAAAg6QAAYOkAAIDpAADA6QAAAOoAACDqAABg6gAAoOoAAODqAAAA6wAAQOsAAIDrAACg6wAA4OsAAADsAABg7AAAgOwAAMDsAADg7AAAIO0AAGDtAACA7QAAwO0AAADuAABA7gAAYO4AAKDuAADg7gAAAO8AAEDvAABg7wAAwO8AAODvAAAg8AAAYPAAAKDwAADA8AAAAPEAAEDxAACA8QAAoPEAAODxAAAg8gAAYPIAAIDyAADA8gAAAPMAAEDzAABg8wAAoPMAAODzAAAg9AAAQPQAAID0AADA9AAAAPUAACD1AABg9QAAoPUAAOD1AAAA9gAAQPYAAID2AADg9gAAAPcAAED3AACA9wAAwPcAAOD3AAAg+AAAYPgAAKD4AADA+AAAAPkAAED5AACA+QAAoPkAAOD5AAAg+gAAYPoAAID6AADA+gAAAPsAAED7AABg+wAAoPsAAOD7AAAg/AAAYPwAAKD8AADA/AAAAP0AAED9AACA/QAAoP0AAAD+AAAg/gAAYP4AAKD+AADg/gAAIP8AAGD/AACA/wAA4P8AAAAAAQBAAAEAgAABAMAAAQAAAQEAQAEBAGABAQDAAQEA4AEBACACAQBgAgEAoAIBAOACAQAgAwEAQAMBAKADAQDAAwEAAAQBAEAEAQCABAEAwAQBAAAFAQAgBQEAgAUBAKAFAQDgBQEAIAYBAGAGAQCgBgEA4AYBAAAHAQBgBwEAgAcBAMAHAQAACAEAQAgBAIAIAQDACAEA4AgBAEAJAQBgCQEAoAkBAOAJAQAgCgEAYAoBAKAKAQDACgEAIAsBAGALAQCgCwEAwAsBACAMAQBADAEAgAwBAMAMAQAgDQEAQA0BAIANAQDADQEAAA4BAEAOAQCADgEAoA4BAAAPAQBADwEAgA8BAKAPAQAAEAEAIBABAGAQAQCgEAEAIBEBAEARAQCAEQEAwBEBAAASAQBAEgEAgBIBAKASAQAAEwEAQBMBAIATAQCgEwEAABQBACAUAQBgFAEAoBQBAAAVAQBAFQEAgBUBAMAVAQDgFQEAQBYBAGAWAQDAFgEAABcBAEAXAQCAFwEAwBcBAOAXAQBAGAEAYBgBAMAYAQAgGQEAYBkBAKAZAQDgGQEAABoBAGAaAQCAGgEA4BoBACAbAQBgGwEAoBsBAOAbAQAAHAEAYBwBAIAcAQDgHAEAIB0BAGAdAQCgHQEA4B0BAAAeAQBgHgEAgB4BAOAeAQAgHwEAYB8BAKAfAQDgHwEAACABAGAgAQCAIAEA4CABAGAhAQCgIQEA4CEBACAiAQBAIgEAoCIBAMAiAQAgIwEAYCMBAKAjAQDgIwEAICQBAEAkAQCgJAEAwCQBACAlAQCAJQEAwCUBAAAmAQBAJgEAYCYBAMAmAQDgJgEAQCcBAIAnAQDAJwEAACgBAEAoAQBgKAEAwCgBAOAoAQBAKQEAwCkBAAAqAQBAKgEAgCoBAKAqAQAAKwEAICsBAIArAQDAKwEAACwBAEAsAQCALAEA4CwBAEAtAQBgLQEAwC0BACAuAQBgLgEAoC4BAOAuAQAALwEAYC8BAIAvAQDgLwEAIDABAGAwAQCgMAEA4DABAEAxAQCgMQEAwDEBACAyAQCAMgEAwDIBAAAzAQBAMwEAYDMBAMAzAQDgMwEAQDQBAIA0AQDANAEAADUBAEA1AQCgNQEAADYBACA2AQCANgEAADcBAEA3AQCANwEAwDcBAOA3AQBAOAEAYDgBAMA4AQAAOQEAQDkBAIA5AQDAOQEAIDoBAIA6AQCgOgEAADsBAIA7AQDAOwEAADwBAEA8AQBgPAEAwDwBAOA8AQBAPQEAgD0BAMA9AQAAPgEAQD4BAKA+AQAAPwEAID8BAIA/AQAgQAEAYEABAKBAAQDgQAEAAEEBAGBBAQCAQQEA4EEBACBCAQBgQgEAoEIBAOBCAQBAQwEAoEMBAMBDAQAgRAE=");
  base64DecodeToExistingUint8Array(bufferView, 5192, "EBAQEBAQEBAQEBAQEBAQEBAREBEQERAREBAQEBAQERAQERAREBERERAQEBAQEBEQEBEQERAREREQEBAQEBAREBAREBEQEREREBAQEBAQERAQERAREBERERAQEBAQEBEQEBEQERAREREQEBAQEBAREBAREBEQEREREBAQEBAQERAQERAREBERERAQEBAQEBEQEBEQERAREREQEBAQEBAREBAREBEQEREREBAQEBAQERAQERAREBERERERERERIREhISEhISEiISIiIiIiIkIiQkJCQkJCREJERERERESERISEhISEhIiEiIiIiIiIiIiIiIiIiIiIiIjoH9QfvB+oH5AffB9oH1AfPB8kHxAf/B7kHtAeuB6kHpAefB5kHlAePB4oHhAe/B3oHdQdwB2oHZQdgB1sHVgdRB0wHRwdCB30HOAczBy4HKQckBx8HGgcVBxAHCwcGBwIHPQb4BvMG7gbpBuUG4AbbBtYG0gbNBsgGxAb/BroGtQaxBqwGqAajBp4GmgaVBpEGjAaIBoMGvwZ6BnYGcQZtBmgGZAZfBlsGVwZSBk4GSQZFBkEGfAY4BjQGMAYrBicGIwYeBhoGFgYSBg4GCQYFBgEGPQX5BfUF8AXsBegF5AXgBdwF2AXUBdAFzAXIBcQFwAX8BbgFtAWwBawFqAWkBaAFnAWZBZUFkQWNBYkFhQWBBb4FegV2BXIFbwVrBWcFYwVgBVwFWAVUBVEFTQVJBUYFQgV+BTsFNwU0BTAFLAUpBSUFIgUeBRsFFwUUBRAFDAUJBQYFAgU/BPsE+AT0BPEE7QTqBOcE4wTgBNwE2QTWBNIEzwTMBMgExQTCBP4EuwS4BLUEsQSuBKsEqASkBKEEngSbBJgElASRBI4EiwSIBIUEggS+BHsEeAR1BHIEbwRsBGkEZgRjBGAEXQRaBFcEVARRBE4ESwRIBEUEQgR/BDwEOQQ2BDMEMAQtBCoEKAQlBCIEHwQcBBkEFgQUBBEEDgQLBAgEBgQDBAAEDUAOgBkAHEAMQETAwEDgAM1ALQAMQGEAg==");
  base64DecodeToExistingUint8Array(bufferView, 5976, "YBkB");
}

  function wasm2js_memory_fill(dest, value, size) {
    dest = dest >>> 0;
    size = size >>> 0;
    if (dest + size > bufferView.length) throw "trap: invalid memory.fill";
    bufferView.fill(value, dest, dest + size);
  }
      function wasm2js_trap() { throw new Error('abort'); }

function asmFunc(imports) {
 var buffer = new ArrayBuffer(8388608);
 var HEAP8 = new Int8Array(buffer);
 var HEAP16 = new Int16Array(buffer);
 var HEAP32 = new Int32Array(buffer);
 var HEAPU8 = new Uint8Array(buffer);
 var HEAPU16 = new Uint16Array(buffer);
 var HEAPU32 = new Uint32Array(buffer);
 var HEAPF32 = new Float32Array(buffer);
 var HEAPF64 = new Float64Array(buffer);
 var Math_imul = Math.imul;
 var Math_fround = Math.fround;
 var Math_abs = Math.abs;
 var Math_clz32 = Math.clz32;
 var Math_min = Math.min;
 var Math_max = Math.max;
 var Math_floor = Math.floor;
 var Math_ceil = Math.ceil;
 var Math_trunc = Math.trunc;
 var Math_sqrt = Math.sqrt;
 var env = imports.env;
 var __assert_fail = env.__assert_fail;
 var _abort_js = env._abort_js;
 var emscripten_resize_heap = env.emscripten_resize_heap;
 var __stack_pointer = 72032;
 var tempRet0 = 0;
 // EMSCRIPTEN_START_FUNCS
;
 function __wasm_call_ctors() {
  
 }
 
 function fm_create() {
  var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0;
  $7 = operator_new_unsigned_long_(4580);
  HEAP32[$7 >> 2] = 1032;
  $5 = $7 + 8 | 0;
  HEAP8[$5 + 4 | 0] = 0;
  HEAP32[$5 >> 2] = 0;
  $2 = $5 + 8 | 0;
  HEAP32[$2 + 36 >> 2] = 1;
  HEAP32[$2 + 40 >> 2] = 0;
  HEAP32[$2 + 28 >> 2] = 0;
  HEAP32[$2 + 32 >> 2] = 0;
  HEAP32[$2 + 20 >> 2] = 255;
  HEAP32[$2 + 24 >> 2] = 255;
  HEAP8[$2 + 15 | 0] = 0;
  HEAP8[$2 + 16 | 0] = 0;
  HEAP8[$2 + 17 | 0] = 0;
  HEAP8[$2 + 18 | 0] = 0;
  HEAP8[$2 + 14 | 0] = 3;
  HEAP16[$2 + 12 >> 1] = 512;
  HEAP32[$2 + 8 >> 2] = 0;
  HEAP32[$2 + 4 >> 2] = $7;
  HEAP32[$2 >> 2] = 1080;
  $1 = $2 + 2348 | 0;
  $10 = $2 + 32 | 0;
  while (1) {
   $3 = $0 << 6 & -32768;
   $4 = $0 << 23 >> 31;
   HEAP16[$1 + ($0 << 1) >> 1] = $3 | HEAPU16[((($4 ^ $0) & 255) << 1) + 1472 >> 1];
   $6 = $0 | 1;
   HEAP16[$1 + ($6 << 1) >> 1] = $3 | HEAPU16[((($4 ^ $6) & 255) << 1) + 1472 >> 1];
   $0 = $0 + 2 | 0;
   if (($0 | 0) != 1024) {
    continue
   }
   break;
  };
  $4 = $2 + 1836 | 0;
  $3 = $2 + 1324 | 0;
  $6 = $2 + 812 | 0;
  $9 = $2 + 300 | 0;
  $0 = 0;
  while (1) {
   $1 = $0 << 1;
   $8 = $0 ^ 255;
   HEAP16[$1 + $9 >> 1] = $8 + ($0 << 8);
   $11 = $0 >>> 0 < 128;
   HEAP16[$1 + $6 >> 1] = -32768 - $11;
   $8 = ($11 ? $8 : $0) << 1;
   HEAP16[$1 + $3 >> 1] = ($8 ^ ($0 >>> 6 & 1) - 1) << 8 | $8 & 254;
   HEAP16[$1 + $4 >> 1] = 0;
   $0 = $0 + 1 | 0;
   if (($0 | 0) != 256) {
    continue
   }
   break;
  };
  $3 = $2 + 4396 | 0;
  wasm2js_memory_fill($3, 0, 160);
  HEAP32[$7 + 4 >> 2] = $2;
  $6 = $2 + 4428 | 0;
  $1 = 0;
  while (1) {
   $0 = operator_new_unsigned_long_(36);
   HEAP32[$0 + 12 >> 2] = 0;
   HEAP32[$0 + 16 >> 2] = 0;
   HEAP16[$0 + 8 >> 1] = 0;
   HEAP32[$0 + 4 >> 2] = 0;
   HEAP32[$0 >> 2] = $1;
   HEAP32[$0 + 20 >> 2] = 0;
   HEAP32[$0 + 24 >> 2] = 0;
   HEAP32[$0 + 32 >> 2] = $2;
   HEAP32[$0 + 28 >> 2] = $10;
   $9 = $3 + ($1 << 2) | 0;
   $4 = HEAP32[$9 >> 2];
   HEAP32[$9 >> 2] = $0;
   if ($4) {
    operator_delete_void__($4)
   }
   $1 = $1 + 1 | 0;
   if (($1 | 0) != 8) {
    continue
   }
   break;
  };
  $1 = 0;
  while (1) {
   $0 = operator_new_unsigned_long_(68);
   HEAP32[$0 + 64 >> 2] = $2;
   HEAP32[$0 + 60 >> 2] = $10;
   HEAP8[$0 + 58 | 0] = 0;
   HEAP8[$0 + 22 | 0] = 0;
   HEAP16[$0 + 20 >> 1] = 0;
   HEAP32[$0 + 16 >> 2] = 4;
   HEAP16[$0 + 12 >> 1] = 1023;
   HEAP32[$0 + 8 >> 2] = 0;
   HEAP32[$0 + 4 >> 2] = $1;
   HEAP32[$0 >> 2] = 0;
   $3 = $6 + ($1 << 2) | 0;
   $4 = HEAP32[$3 >> 2];
   HEAP32[$3 >> 2] = $0;
   if ($4) {
    operator_delete_void__($4)
   }
   $1 = $1 + 1 | 0;
   if (($1 | 0) != 32) {
    continue
   }
   break;
  };
  $0 = HEAP32[$2 + 4396 >> 2];
  $1 = HEAP32[$2 + 4428 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4492 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4460 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4524 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4400 >> 2];
  $1 = HEAP32[$2 + 4432 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4496 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4464 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4528 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4404 >> 2];
  $1 = HEAP32[$2 + 4436 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4500 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4468 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4532 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4408 >> 2];
  $1 = HEAP32[$2 + 4440 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4504 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4472 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4536 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4412 >> 2];
  $1 = HEAP32[$2 + 4444 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4508 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4476 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4540 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4416 >> 2];
  $1 = HEAP32[$2 + 4448 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4512 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4480 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4544 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4420 >> 2];
  $1 = HEAP32[$2 + 4452 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4516 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4484 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4548 >> 2];
  HEAP32[$0 + 24 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $0 = HEAP32[$2 + 4424 >> 2];
  $1 = HEAP32[$2 + 4456 >> 2];
  HEAP32[$0 + 12 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4520 >> 2];
  HEAP32[$0 + 16 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $1 = HEAP32[$2 + 4488 >> 2];
  HEAP32[$0 + 20 >> 2] = $1;
  if ($1) {
   HEAP32[$1 >> 2] = HEAP32[$0 >> 2]
  }
  $2 = HEAP32[$2 + 4552 >> 2];
  HEAP32[$0 + 24 >> 2] = $2;
  if ($2) {
   HEAP32[$2 >> 2] = HEAP32[$0 >> 2]
  }
  $2 = $5 + 8 | 0;
  HEAP8[$2 + 12 | 0] = 0;
  $0 = HEAP32[$2 + 4 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 12 >> 2]]($0);
  wasm2js_memory_fill($2 + 44 | 0, 0, 256);
  HEAP32[$2 + 76 >> 2] = -1061109568;
  HEAP32[$2 + 80 >> 2] = -1061109568;
  $0 = HEAP32[$2 + 4 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 8 >> 2]]($0, 0);
  $0 = HEAP32[$2 + 4396 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4400 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4404 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4408 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4412 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4416 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4420 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $0 = HEAP32[$2 + 4424 >> 2];
  HEAP16[$0 + 8 >> 1] = 0;
  HEAP32[$0 + 4 >> 2] = 0;
  $1 = 4428;
  while (1) {
   $5 = $1 + $2 | 0;
   $0 = HEAP32[$5 >> 2];
   HEAP8[$0 + 22 | 0] = 0;
   HEAP16[$0 + 20 >> 1] = 0;
   HEAP32[$0 + 16 >> 2] = 4;
   HEAP16[$0 + 12 >> 1] = 1023;
   HEAP32[$0 + 8 >> 2] = 0;
   $0 = HEAP32[$5 + 4 >> 2];
   HEAP8[$0 + 22 | 0] = 0;
   HEAP16[$0 + 20 >> 1] = 0;
   HEAP32[$0 + 16 >> 2] = 4;
   HEAP16[$0 + 12 >> 1] = 1023;
   HEAP32[$0 + 8 >> 2] = 0;
   $1 = $1 + 8 | 0;
   if (($1 | 0) != 4556) {
    continue
   }
   break;
  };
  return $7 | 0;
 }
 
 function fm_destroy($0) {
  $0 = $0 | 0;
  if ($0) {
   ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base__($0 + 16 | 0);
   operator_delete_void__($0);
  }
 }
 
 function ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base__($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0;
  HEAP32[$0 >> 2] = 1080;
  $1 = 4556;
  while (1) {
   $1 = $1 - 4 | 0;
   $2 = $1 + $0 | 0;
   $3 = HEAP32[$2 >> 2];
   HEAP32[$2 >> 2] = 0;
   if ($3) {
    operator_delete_void__($3)
   }
   if (($1 | 0) != 4428) {
    continue
   }
   break;
  };
  $1 = HEAP32[$0 + 4424 >> 2];
  HEAP32[$0 + 4424 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4420 >> 2];
  HEAP32[$0 + 4420 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4416 >> 2];
  HEAP32[$0 + 4416 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4412 >> 2];
  HEAP32[$0 + 4412 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4408 >> 2];
  HEAP32[$0 + 4408 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4404 >> 2];
  HEAP32[$0 + 4404 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4400 >> 2];
  HEAP32[$0 + 4400 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  $1 = HEAP32[$0 + 4396 >> 2];
  HEAP32[$0 + 4396 >> 2] = 0;
  if ($1) {
   operator_delete_void__($1)
  }
  return $0 | 0;
 }
 
 function fm_write($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  var $3 = 0;
  $3 = $0 + 8 | 0;
  HEAP8[$3 + 4 | 0] = $1;
  $1 = $3 + 8 | 0;
  $0 = $2 & 255;
  $2 = HEAPU8[$3 + 4 | 0];
  block : {
   if (($2 | 0) == 20) {
    $1 = HEAP32[$1 + 4 >> 2];
    FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 8 >> 2]]($1, $0);
    break block;
   }
   HEAP32[$1 + 24 >> 2] = 255;
   block2 : {
    switch ($2 - 25 | 0) {
    case 0:
     HEAP8[($1 + ($0 >>> 7 | 0) | 0) + 69 | 0] = $0;
     break block;
    case 1:
     break block;
    default:
     break block2;
    };
   }
   HEAP8[($1 + $2 | 0) + 44 | 0] = $0;
   if (($2 | 0) != 8) {
    break block
   }
   $1 = HEAP32[($1 + (($0 & 7) << 2) | 0) + 4396 >> 2];
   $2 = HEAP32[$1 + 12 >> 2];
   if ($2) {
    HEAP8[$2 + 22 | 0] = HEAPU8[$2 + 22 | 0] & 254 | $0 >>> 3 & 1
   }
   $2 = HEAP32[$1 + 16 >> 2];
   if ($2) {
    HEAP8[$2 + 22 | 0] = HEAPU8[$2 + 22 | 0] & 254 | $0 >>> 4 & 1
   }
   $2 = HEAP32[$1 + 20 >> 2];
   if ($2) {
    HEAP8[$2 + 22 | 0] = HEAPU8[$2 + 22 | 0] & 254 | $0 >>> 5 & 1
   }
   $1 = HEAP32[$1 + 24 >> 2];
   if (!$1) {
    break block
   }
   HEAP8[$1 + 22 | 0] = HEAPU8[$1 + 22 | 0] & 254 | $0 >>> 6 & 1;
  }
  if (HEAPU8[$3 + 4 | 0] == 27) {
   $1 = HEAP32[$3 + 12 >> 2];
   FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 36 >> 2]]($1, 0, 0, $0 >>> 6 | 0);
  }
  $0 = HEAP32[$3 + 12 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 20 >> 2]]($0, HEAPU8[$3 + 21 | 0] << 5);
 }
 
 function fm_sample($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
  $6 = $0 + 4572 | 0;
  $2 = $0 + 16 | 0;
  HEAP8[$2 + 18 | 0] = HEAPU8[$2 + 18 | 0] + 1;
  block : {
   if (!HEAP32[$2 + 24 >> 2]) {
    $1 = HEAP32[$2 + 28 >> 2];
    HEAP32[$2 + 28 >> 2] = $1 + 1;
    if ($1 >>> 0 < 4096) {
     break block
    }
   }
   HEAP32[$2 + 20 >> 2] = 0;
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4396 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 1
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4400 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 2
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4404 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 4
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4408 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 8
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4412 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 16
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4416 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 32
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4420 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 64
   }
   if (ymfm__fm_channel_ymfm__opm_registers___prepare__(HEAP32[$2 + 4424 >> 2])) {
    HEAP32[$2 + 20 >> 2] = HEAP32[$2 + 20 >> 2] | 128
   }
   HEAP32[$2 + 24 >> 2] = 0;
   HEAP32[$2 + 28 >> 2] = 0;
  }
  $3 = HEAP32[$2 + 8 >> 2];
  $1 = $3 + 1 | 0;
  HEAP32[$2 + 8 >> 2] = ($1 & 3) == 3 ? $3 + 2 | 0 : $1;
  $9 = $2 + 4396 | 0;
  $1 = $2 + 32 | 0;
  $4 = HEAP32[$1 + 4 >> 2];
  $5 = $4 << 1;
  $3 = $5 >>> 17 | 0;
  $4 = $5 | ($3 ^ $4 >>> 13) & 1;
  $8 = (HEAPU8[$1 + 27 | 0] ^ -1) & 31;
  $5 = HEAPU8[$1 + 8 | 0];
  block1 : {
   if ($8 >>> 0 > $5 >>> 0) {
    $3 = $5 + 1 | 0;
    break block1;
   }
   HEAP8[$1 + 9 | 0] = $3 & 1;
   $3 = 0;
  }
  $4 = $4 << 1;
  $5 = $4 >>> 17 | 0;
  if (($3 & 255) >>> 0 < $8 >>> 0) {
   $3 = $3 + 1 | 0
  } else {
   HEAP8[$1 + 9 | 0] = $5 & 1;
   $3 = 0;
  }
  HEAP8[$1 + 8 | 0] = $3;
  HEAP32[$1 + 4 >> 2] = ($4 | ($5 ^ $4 >>> 14) & 1) ^ 3;
  $3 = HEAPU8[$1 + 36 | 0];
  $3 = HEAPU8[$1 + 13 | 0] & 2 ? 0 : HEAP32[$1 >> 2] + (($3 & 15 | 16) << ($3 >>> 4)) | 0;
  HEAP32[$1 >> 2] = $3;
  $4 = $4 >>> 17 | 0;
  HEAP16[($1 + ((($3 >>> 22 | 0) + 1 & 255) << 1) | 0) + 1804 >> 1] = $4 & 255 | $4 << 8;
  $3 = HEAP16[(($1 + ((HEAPU8[$1 + 39 | 0] & 3) << 9) | 0) + ($3 >>> 21 & 510) | 0) + 268 >> 1];
  HEAP8[$1 + 11 | 0] = Math_imul($3 & 255, HEAPU8[$1 + 37 | 0] & 127) >>> 7;
  $3 = Math_imul(HEAPU8[$1 + 38 | 0] & 127, $3 >> 8) >> 7;
  while (1) {
   block2 : {
    if (!(255 >>> $7 & 1)) {
     break block2
    }
    $4 = HEAP32[$2 + 8 >> 2];
    $1 = HEAP32[($7 << 2) + $9 >> 2];
    HEAP32[$1 + 4 >> 2] = HEAPU16[$1 + 6 >> 1] | HEAPU16[$1 + 8 >> 1] << 16;
    $5 = HEAP32[$1 + 12 >> 2];
    if ($5) {
     ymfm__fm_operator_ymfm__opm_registers___clock_unsigned_int__int_($5, $4, $3)
    }
    $5 = HEAP32[$1 + 16 >> 2];
    if ($5) {
     ymfm__fm_operator_ymfm__opm_registers___clock_unsigned_int__int_($5, $4, $3)
    }
    $5 = HEAP32[$1 + 20 >> 2];
    if ($5) {
     ymfm__fm_operator_ymfm__opm_registers___clock_unsigned_int__int_($5, $4, $3)
    }
    $1 = HEAP32[$1 + 24 >> 2];
    if (!$1) {
     break block2
    }
    ymfm__fm_operator_ymfm__opm_registers___clock_unsigned_int__int_($1, $4, $3);
   }
   $7 = $7 + 1 | 0;
   if (($7 | 0) != 8) {
    continue
   }
   break;
  };
  HEAP32[$6 >> 2] = 0;
  HEAP32[$6 + 4 >> 2] = 0;
  $1 = HEAP32[$2 + 20 >> 2] & 255;
  if ($1 & 1) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4396 >> 2], $6)
  }
  if ($1 & 2) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4400 >> 2], $6)
  }
  if ($1 & 4) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4404 >> 2], $6)
  }
  if ($1 & 8) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4408 >> 2], $6)
  }
  if ($1 & 16) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4412 >> 2], $6)
  }
  if ($1 & 32) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4416 >> 2], $6)
  }
  if ($1 & 64) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4420 >> 2], $6)
  }
  if ($1 & 128) {
   ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const(HEAP32[$2 + 4424 >> 2], $6)
  }
  $7 = -32768;
  $1 = HEAP32[$6 >> 2];
  $3 = -32768;
  block3 : {
   if (($1 | 0) < -32768) {
    break block3
   }
   $3 = 32767;
   if (($1 | 0) > 32767) {
    break block3
   }
   $3 = $1;
   $1 = 7 - Math_clz32(($1 ^ $1 >> 31) << 17) | 0;
   $3 = ($3 & -1 << (($1 | 0) <= 1 ? 1 : $1) - 1) << 16 >> 16;
  }
  HEAP32[$6 >> 2] = $3;
  $1 = HEAP32[$6 + 4 >> 2];
  block4 : {
   if (($1 | 0) < -32768) {
    break block4
   }
   $7 = 32767;
   if (($1 | 0) > 32767) {
    break block4
   }
   $7 = 7 - Math_clz32(($1 ^ $1 >> 31) << 17) | 0;
   $7 = ($1 & -1 << (($7 | 0) <= 1 ? 1 : $7) - 1) << 16 >> 16;
  }
  HEAP32[$6 + 4 >> 2] = $7;
  return HEAP32[$0 + 4576 >> 2] + HEAP32[$0 + 4572 >> 2] | 0;
 }
 
 function ymfm__ymfm_interface___ymfm_interface__($0) {
  $0 = $0 | 0;
  return $0 | 0;
 }
 
 function ymfm__ymfm_interface___ymfm_interface___10($0) {
  $0 = $0 | 0;
  operator_delete_void__($0);
 }
 
 function ymfm__ymfm_interface__ymfm_sync_mode_write_unsigned_char_($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $0 = HEAP32[$0 + 4 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 16 >> 2]]($0, $1);
 }
 
 function ymfm__ymfm_interface__ymfm_sync_check_interrupts__($0) {
  $0 = $0 | 0;
  $0 = HEAP32[$0 + 4 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 12 >> 2]]($0);
 }
 
 function ymfm__ymfm_interface__ymfm_set_timer_unsigned_int__int_($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
 }
 
 function ymfm__ymfm_interface__ymfm_set_busy_end_unsigned_int_($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
 }
 
 function ymfm__ymfm_interface__ymfm_is_busy__($0) {
  $0 = $0 | 0;
  return 0;
 }
 
 function ymfm__ymfm_interface__ymfm_external_read_ymfm__access_class__unsigned_int_($0, $1, $2) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  return 0;
 }
 
 function ymfm__ymfm_interface__ymfm_external_write_ymfm__access_class__unsigned_int__unsigned_char_($0, $1, $2, $3) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  $2 = $2 | 0;
  $3 = $3 | 0;
 }
 
 function ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base___19($0) {
  $0 = $0 | 0;
  operator_delete_void__(ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base__($0));
 }
 
 function ymfm__fm_channel_ymfm__opm_registers___prepare__($0) {
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0;
  $13 = $0 + 12 | 0;
  while (1) {
   $0 = HEAP32[($9 << 2) + $13 >> 2];
   block : {
    if (!$0) {
     break block
    }
    $4 = HEAP32[$0 >> 2];
    $5 = HEAP32[$0 + 4 >> 2];
    $3 = $0 + 24 | 0;
    $2 = HEAP32[$0 + 60 >> 2];
    HEAP32[$3 >> 2] = $2 + 2316;
    $1 = $2 + $4 | 0;
    $4 = HEAPU8[$1 + 52 | 0];
    $6 = $4 & 127;
    $10 = $6 << 6;
    $11 = HEAPU8[$1 + 60 | 0] >>> 2 | 0;
    HEAP32[$3 + 12 >> 2] = $10 | $11;
    $8 = $4 & 124;
    $4 = $2 + $5 | 0;
    $7 = $4 + 76 | 0;
    $5 = HEAPU8[$7 | 0];
    $8 = HEAPU8[($8 | $5 >>> 4 & 3) + 1984 | 0];
    $8 = $5 & 64 ? 0 - $8 | 0 : $8;
    HEAP32[$3 + 16 >> 2] = $8;
    $7 = HEAPU8[$7 | 0] << 1 & 30;
    $7 = $7 >>> 0 <= 1 ? 1 : $7;
    HEAP32[$3 + 20 >> 2] = $7;
    $5 = $6 >>> 2 | 0;
    if (HEAPU8[$1 + 68 | 0] & 112 ? HEAPU8[$2 + 38 | 0] & 127 : 0) {
     $1 = 1
    } else {
     block3 : {
      block4 : {
       $1 = $6 >>> 4 | 0;
       $2 = HEAP16[(HEAPU8[$4 + 204 | 0] >>> 5 & 6) + 1454 >> 1] + (($10 & 960) - ($6 << 4 & 192) | $11) | 0;
       block2 : {
        if ($2 >>> 0 < 768) {
         break block2
        }
        if (($2 | 0) < 0) {
         if ($1) {
          $2 = $2 + 768 | 0;
          $1 = $1 - 1 | 0;
          break block2;
         }
         $1 = 324;
         break block3;
        }
        $6 = $2 >>> 0 > 1535;
        $1 = $6 + $1 | 0;
        if ($1 >>> 0 > 6) {
         break block4
        }
        $2 = ($6 ? -1536 : -768) + $2 | 0;
        $1 = $1 + 1 | 0;
       }
       $1 = HEAP32[($2 << 2) + 2112 >> 2] >>> ($1 ^ 7) | 0;
       break block3;
      }
      $1 = 82976;
     }
     $1 = Math_imul($1 + $8 | 0, $7) >>> 1 | 0;
    }
    HEAP32[$3 + 4 >> 2] = $1;
    HEAP32[$3 + 8 >> 2] = (HEAPU8[$4 + 108 | 0] & 127) << 3;
    $6 = $4 + 236 | 0;
    $2 = HEAPU8[$6 | 0] >>> 4 | 0;
    HEAP32[$3 + 24 >> 2] = ($2 + 1 & 16 | $2) << 5;
    $1 = HEAPU8[$4 + 140 | 0];
    $2 = $5 >>> ((($1 ^ -1) & 192) >>> 6) | 0;
    $1 = $1 << 1 & 62;
    $5 = $2 + $1 | 0;
    HEAP8[$3 + 29 | 0] = $1 ? ($5 >>> 0 >= 63 ? 63 : $5) : 0;
    $1 = HEAPU8[$4 + 172 | 0] << 1 & 62;
    $5 = $1 + $2 | 0;
    HEAP8[$3 + 30 | 0] = $1 ? ($5 >>> 0 >= 63 ? 63 : $5) : 0;
    $4 = HEAPU8[$4 + 204 | 0] << 1 & 62;
    $1 = $4 + $2 | 0;
    HEAP8[$3 + 31 | 0] = $4 ? ($1 >>> 0 >= 63 ? 63 : $1) : 0;
    $1 = $3;
    $3 = ($2 + (HEAPU8[$6 | 0] << 2 & 60) | 0) + 2 | 0;
    HEAP8[$1 + 32 | 0] = $3 >>> 0 >= 63 ? 63 : $3;
    block7 : {
     block8 : {
      block5 : {
       $2 = HEAPU8[$0 + 22 | 0];
       $3 = ($2 | 0) != 0;
       if (($3 | 0) == HEAPU8[$0 + 21 | 0]) {
        $3 = HEAP32[$0 + 16 >> 2];
        break block5;
       }
       HEAP8[$0 + 21 | 0] = $3;
       $3 = HEAP32[$0 + 16 >> 2];
       if ($2) {
        block6 : {
         if (($3 | 0) == 1) {
          break block6
         }
         HEAP32[$0 + 8 >> 2] = 0;
         HEAP32[$0 + 16 >> 2] = 1;
         if (HEAPU8[$0 + 53 | 0] < 62) {
          break block6
         }
         HEAP16[$0 + 12 >> 1] = 0;
        }
        HEAP8[$0 + 22 | 0] = $2 & 251;
        break block7;
       }
       if ($3 >>> 0 > 3) {
        break block5
       }
       HEAP32[$0 + 16 >> 2] = 4;
       break block8;
      }
      HEAP8[$0 + 22 | 0] = $2 & 251;
      if (($3 | 0) != 4) {
       break block7
      }
     }
     if (HEAPU16[$0 + 12 >> 1] > 895) {
      break block
     }
    }
    $12 = 1 << $9 | $12;
   }
   $9 = $9 + 1 | 0;
   if (($9 | 0) != 4) {
    continue
   }
   break;
  };
  return ($12 | 0) != 0;
 }
 
 function ymfm__fm_operator_ymfm__opm_registers___clock_unsigned_int__int_($0, $1, $2) {
  var $3 = 0, $4 = 0, $5 = 0, $6 = 0;
  HEAP8[$0 + 20 | 0] = 0;
  block : {
   if ($1 & 3) {
    break block
   }
   $3 = $1 >>> 2 | 0;
   $4 = HEAPU16[$0 + 12 >> 1];
   $1 = HEAP32[$0 + 16 >> 2];
   block3 : {
    block2 : {
     if (!($4 | ($1 | 0) != 1)) {
      HEAP32[$0 + 16 >> 2] = 2;
      break block2;
     }
     if (($1 | 0) != 2) {
      break block3
     }
    }
    $1 = 2;
    if ($4 >>> 0 < HEAPU32[$0 + 48 >> 2]) {
     break block3
    }
    $1 = 3;
    HEAP32[$0 + 16 >> 2] = 3;
   }
   $5 = $3;
   $3 = HEAPU8[($0 + $1 | 0) + 52 | 0];
   $6 = $3 >>> 2 | 0;
   $5 = $5 << $6;
   if ($5 & 2047) {
    break block
   }
   $6 = HEAP32[($3 << 2) + 5184 >> 2] >>> ($5 >>> ($3 >>> 0 < 48 ? 11 : $6) << 2) & 15;
   block4 : {
    if (($1 | 0) == 1) {
     if ($3 >>> 0 > 61) {
      break block
     }
     $1 = $4 + (Math_imul($6, $4 ^ -1) >>> 4 | 0) | 0;
     break block4;
    }
    $1 = $4 + $6 & 65535;
    $1 = $1 >>> 0 >= 1023 ? 1023 : $1;
   }
   HEAP16[$0 + 12 >> 1] = $1;
  }
  $1 = HEAP32[$0 + 28 >> 2];
  if (($1 | 0) == 1) {
   $4 = $0 + 24 | 0;
   $3 = HEAP32[$0 + 60 >> 2];
   $1 = HEAP16[(HEAPU8[($3 + HEAP32[$0 + 4 >> 2] | 0) + 204 | 0] >>> 5 & 6) + 1454 >> 1];
   $3 = HEAPU8[($3 + HEAP32[$0 >> 2] | 0) + 68 | 0] >>> 4 & 7;
   block5 : {
    if (!$3) {
     break block5
    }
    if ($3 >>> 0 <= 5) {
     $1 = ($2 >> 6 - $3) + $1 | 0;
     break block5;
    }
    $1 = ($2 << $3 - 5) + $1 | 0;
   }
   $3 = HEAP32[$4 + 12 >> 2];
   $2 = $3 >>> 10 & 7;
   $5 = HEAP32[$4 + 20 >> 2];
   block7 : {
    block8 : {
     $1 = ($3 & 63) + $1 + (($3 & 960) - ($3 >>> 2 & 192)) | 0;
     block6 : {
      if ($1 >>> 0 < 768) {
       break block6
      }
      if (($1 | 0) < 0) {
       if ($2) {
        $2 = $2 - 1 | 0;
        $1 = $1 + 768 | 0;
        break block6;
       }
       $1 = 324;
       break block7;
      }
      $3 = $1 >>> 0 > 1535;
      $2 = $3 + $2 | 0;
      if ($2 >>> 0 > 6) {
       break block8
      }
      $2 = $2 + 1 | 0;
      $1 = ($3 ? -1536 : -768) + $1 | 0;
     }
     $1 = HEAP32[($1 << 2) + 2112 >> 2] >>> ($2 ^ 7) | 0;
     break block7;
    }
    $1 = 82976;
   }
   $1 = Math_imul($5, $1 + HEAP32[$4 + 16 >> 2] | 0) >>> 1 | 0;
  }
  HEAP32[$0 + 8 >> 2] = HEAP32[$0 + 8 >> 2] + $1;
 }
 
 function ymfm__fm_channel_ymfm__opm_registers___output_4op_ymfm__ymfm_output_2____unsigned_int__int__const($0, $1) {
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0;
  $7 = __stack_pointer - 16 | 0;
  __stack_pointer = $7;
  block2 : {
   block1 : {
    block : {
     $4 = HEAP32[$0 + 12 >> 2];
     if ($4) {
      $2 = HEAP32[$0 + 16 >> 2];
      if (!$2) {
       break block
      }
      $10 = HEAP32[$0 + 20 >> 2];
      if (!$10) {
       break block1
      }
      $3 = HEAP32[$0 + 24 >> 2];
      if (!$3) {
       break block2
      }
      $12 = HEAP32[$0 + 28 >> 2];
      $14 = HEAP32[$0 >> 2];
      $8 = $12 + $14 | 0;
      $5 = HEAPU8[$8 + 68 | 0] & 3;
      $9 = HEAPU8[$12 + 11 | 0] << $5 - 1;
      $13 = $8 + 44 | 0;
      $8 = HEAPU8[$13 | 0] >>> 3 & 7;
      if ($8) {
       $6 = HEAP16[$0 + 6 >> 1] + HEAP16[$0 + 4 >> 1] >> 10 - $8
      }
      $8 = $5 ? $9 : 0;
      $5 = HEAPU16[$4 + 12 >> 1];
      if ($5 >>> 0 <= 896) {
       $5 = (HEAP32[$4 + 32 >> 2] + ($5 >>> HEAPU8[$4 + 58 | 0] | 0) | 0) + ($8 & HEAP8[(HEAP32[$4 + 60 >> 2] + HEAP32[$4 + 4 >> 2] | 0) + 172 | 0] >> 31) | 0;
       $4 = HEAP16[HEAP32[$4 + 24 >> 2] + (((HEAP32[$4 + 8 >> 2] >>> 10 | 0) + $6 & 1023) << 1) >> 1];
       $6 = (($5 >>> 0 >= 1023 ? 1023 : $5) << 2) + ($4 & 32767) | 0;
       $6 = HEAPU16[(($6 & 255) << 1) + 5440 >> 1] >>> ($6 >>> 8) | 0;
       $11 = ($4 | 0) < 0 ? 0 - $6 | 0 : $6;
      }
      HEAP16[$0 + 8 >> 1] = $11;
      $4 = HEAPU8[$13 | 0];
      block3 : {
       if ($4 >>> 0 < 64) {
        break block3
       }
       HEAP16[$7 + 2 >> 1] = $11;
       $6 = 0;
       HEAP16[$7 >> 1] = 0;
       $5 = HEAPU16[(($4 & 7) << 1) + 5952 >> 1];
       $9 = 0;
       $0 = HEAPU16[$2 + 12 >> 1];
       if ($0 >>> 0 <= 896) {
        $0 = (HEAP32[$2 + 32 >> 2] + ($0 >>> HEAPU8[$2 + 58 | 0] | 0) | 0) + ($8 & HEAP8[(HEAP32[$2 + 60 >> 2] + HEAP32[$2 + 4 >> 2] | 0) + 172 | 0] >> 31) | 0;
        $9 = ($0 >>> 0 >= 1023 ? 1023 : $0) << 2;
        $0 = HEAP16[HEAP32[$2 + 24 >> 2] + (((HEAP32[$2 + 8 >> 2] >>> 10) + (HEAPU16[(($5 & 1) << 1 | $7) >> 1] >>> 1) & 1023) << 1) >> 1];
        $2 = $9 + ($0 & 32767) | 0;
        $2 = HEAPU16[(($2 & 255) << 1) + 5440 >> 1] >>> ($2 >>> 8) | 0;
        $9 = ($0 | 0) < 0 ? 0 - $2 | 0 : $2;
       }
       HEAP16[$7 + 4 >> 1] = $9;
       HEAP16[$7 + 10 >> 1] = $9 + $11;
       $0 = HEAPU16[$10 + 12 >> 1];
       if ($0 >>> 0 <= 896) {
        $0 = (HEAP32[$10 + 32 >> 2] + ($0 >>> HEAPU8[$10 + 58 | 0] | 0) | 0) + ($8 & HEAP8[(HEAP32[$10 + 60 >> 2] + HEAP32[$10 + 4 >> 2] | 0) + 172 | 0] >> 31) | 0;
        $2 = ($0 >>> 0 >= 1023 ? 1023 : $0) << 2;
        $0 = HEAP16[HEAP32[$10 + 24 >> 2] + (((HEAP32[$10 + 8 >> 2] >>> 10) + (HEAPU16[($5 & 14 | $7) >> 1] >>> 1) & 1023) << 1) >> 1];
        $2 = $2 + ($0 & 32767) | 0;
        $2 = HEAPU16[(($2 & 255) << 1) + 5440 >> 1] >>> ($2 >>> 8) | 0;
        $6 = ($0 | 0) < 0 ? 0 - $2 | 0 : $2;
       }
       HEAP16[$7 + 6 >> 1] = $6;
       HEAP16[$7 + 14 >> 1] = $6 + $9;
       HEAP16[$7 + 12 >> 1] = $6 + $11;
       $2 = HEAPU16[$3 + 12 >> 1];
       block5 : {
        if (!(($14 | 0) != 7 | HEAP8[$12 + 27 | 0] >= 0)) {
         $0 = HEAP32[$3 + 60 >> 2];
         $3 = (HEAP32[$3 + 32 >> 2] + ($2 >>> HEAPU8[$3 + 58 | 0] | 0) | 0) + ($8 & HEAP8[($0 + HEAP32[$3 + 4 >> 2] | 0) + 172 | 0] >> 31) | 0;
         $3 = ($3 >>> 0 >= 1023 ? 1023 : $3) << 1 ^ 2046;
         $0 = HEAP8[$0 + 9 | 0] & 1 ? 0 - $3 | 0 : $3;
         break block5;
        }
        $0 = 0;
        if ($2 >>> 0 > 896) {
         break block5
        }
        $0 = (HEAP32[$3 + 32 >> 2] + ($2 >>> HEAPU8[$3 + 58 | 0] | 0) | 0) + ($8 & HEAP8[(HEAP32[$3 + 60 >> 2] + HEAP32[$3 + 4 >> 2] | 0) + 172 | 0] >> 31) | 0;
        $2 = ($0 >>> 0 >= 1023 ? 1023 : $0) << 2;
        $0 = HEAP16[HEAP32[$3 + 24 >> 2] + (((HEAP32[$3 + 8 >> 2] >>> 10) + (HEAPU16[($5 >>> 3 & 14 | $7) >> 1] >>> 1) & 1023) << 1) >> 1];
        $3 = $2 + ($0 & 32767) | 0;
        $3 = HEAPU16[(($3 & 255) << 1) + 5440 >> 1] >>> ($3 >>> 8) | 0;
        $0 = ($0 | 0) < 0 ? 0 - $3 | 0 : $3;
       }
       if ($5 & 128) {
        $0 = ($11 << 16 >> 16) + $0 | 0;
        $0 = ($0 | 0) < -32768 ? -32768 : ($0 | 0) >= 32767 ? 32767 : $0;
       }
       if ($5 & 256) {
        $0 = ($9 << 16 >> 16) + $0 | 0;
        $0 = ($0 | 0) < -32768 ? -32768 : ($0 | 0) >= 32767 ? 32767 : $0;
       }
       if ($5 & 512) {
        $0 = ($6 << 16 >> 16) + $0 | 0;
        $0 = ($0 | 0) < -32768 ? -32768 : ($0 | 0) >= 32767 ? 32767 : $0;
       }
       if ($4 & 64) {
        HEAP32[$1 >> 2] = HEAP32[$1 >> 2] + $0;
        $4 = HEAP8[$13 | 0];
       }
       if ($4 << 24 >> 24 >= 0) {
        break block3
       }
       HEAP32[$1 + 4 >> 2] = HEAP32[$1 + 4 >> 2] + $0;
      }
      __stack_pointer = $7 + 16 | 0;
      return;
     }
     __assert_fail(1157, 1176, 972, 1375);
     wasm2js_trap();
    }
    __assert_fail(1138, 1176, 973, 1375);
    wasm2js_trap();
   }
   __assert_fail(1119, 1176, 974, 1375);
   wasm2js_trap();
  }
  __assert_fail(1100, 1176, 975, 1375);
  wasm2js_trap();
 }
 
 function ymfm__fm_engine_base_ymfm__opm_registers___engine_timer_expired_unsigned_int_($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
  if ($1 >>> 0 < 2) {
   $2 = HEAPU8[$0 + 64 | 0];
   block : {
    if (!$1) {
     if ($2 & 4) {
      HEAP8[$0 + 12 | 0] = HEAPU8[$0 + 12 | 0] & 126 | 1;
      $2 = HEAP32[$0 + 4 >> 2];
      FUNCTION_TABLE[HEAP32[HEAP32[$2 >> 2] + 12 >> 2]]($2);
      $2 = HEAP8[$0 + 64 | 0];
     }
     if ($2 << 24 >> 24 < 0) {
      $6 = $0 + 4396 | 0;
      $5 = HEAP32[$0 + 24 >> 2];
      $2 = 0;
      while (1) {
       $3 = HEAP32[($2 << 2) + $6 >> 2];
       $4 = HEAP32[$3 + 12 >> 2];
       if ($4) {
        HEAP8[$4 + 22 | 0] = HEAPU8[$4 + 22 | 0] | 4
       }
       $4 = HEAP32[$3 + 16 >> 2];
       if ($4) {
        HEAP8[$4 + 22 | 0] = HEAPU8[$4 + 22 | 0] | 4
       }
       $4 = HEAP32[$3 + 20 >> 2];
       if ($4) {
        HEAP8[$4 + 22 | 0] = HEAPU8[$4 + 22 | 0] | 4
       }
       $3 = HEAP32[$3 + 24 >> 2];
       if ($3) {
        HEAP8[$3 + 22 | 0] = HEAPU8[$3 + 22 | 0] | 4
       }
       $5 = 1 << $2 | $5;
       $2 = $2 + 1 | 0;
       if (($2 | 0) != 8) {
        continue
       }
       break;
      };
      HEAP32[$0 + 24 >> 2] = $5;
     }
     HEAP8[$0 + 16 | 0] = 0;
     $5 = 1024 - (HEAPU8[$0 + 61 | 0] & 3 | HEAPU8[$0 + 60 | 0] << 2) | 0;
     $2 = $0 + 16 | 0;
     break block;
    }
    if ($2 & 8) {
     HEAP8[$0 + 12 | 0] = HEAPU8[$0 + 12 | 0] & 125 | 2;
     $2 = HEAP32[$0 + 4 >> 2];
     FUNCTION_TABLE[HEAP32[HEAP32[$2 >> 2] + 12 >> 2]]($2);
    }
    HEAP8[$0 + 17 | 0] = 0;
    $5 = 4096 - (HEAPU8[$0 + 62 | 0] << 4) | 0;
    $2 = $0 + 17 | 0;
   }
   $3 = HEAP32[$0 + 4 >> 2];
   FUNCTION_TABLE[HEAP32[HEAP32[$3 >> 2] + 16 >> 2]]($3, $1, Math_imul($5, HEAPU8[$0 + 13 | 0]) << 5);
   HEAP8[$2 | 0] = 1;
   return;
  }
  __assert_fail(1431, 1176, 1507, 1392);
  wasm2js_trap();
 }
 
 function ymfm__fm_engine_base_ymfm__opm_registers___engine_check_interrupts__($0) {
  $0 = $0 | 0;
  var $1 = 0, $2 = 0;
  $2 = HEAPU8[$0 + 15 | 0];
  $1 = (HEAPU8[$0 + 14 | 0] & HEAPU8[$0 + 12 | 0]) != 0;
  HEAP8[$0 + 15 | 0] = $1;
  if (($1 | 0) != ($2 | 0)) {
   $0 = HEAP32[$0 + 4 >> 2];
   FUNCTION_TABLE[HEAP32[HEAP32[$0 >> 2] + 28 >> 2]]($0, $1);
  }
 }
 
 function ymfm__fm_engine_base_ymfm__opm_registers___engine_mode_write_unsigned_char_($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  HEAP8[$0 + 64 | 0] = $1;
  HEAP32[$0 + 24 >> 2] = 255;
  HEAP8[$0 + 12 | 0] = HEAPU8[$0 + 12 | 0] & ($1 >>> 4 & 3 ^ 127);
  $1 = HEAP32[$0 + 4 >> 2];
  FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 12 >> 2]]($1);
  block : {
   if (HEAPU8[$0 + 64 | 0] & 2) {
    if (HEAPU8[$0 + 17 | 0]) {
     break block
    }
    $1 = HEAP32[$0 + 4 >> 2];
    FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 16 >> 2]]($1, 1, Math_imul(HEAPU8[$0 + 13 | 0], 131072 - (HEAPU8[$0 + 62 | 0] << 9 | (HEAPU8[$0 + 18 | 0] & 15) << 5) | 0));
    HEAP8[$0 + 17 | 0] = 1;
    break block;
   }
   $1 = HEAP32[$0 + 4 >> 2];
   FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 16 >> 2]]($1, 1, -1);
   HEAP8[$0 + 17 | 0] = 0;
  }
  block1 : {
   if (HEAP8[$0 + 64 | 0] & 1) {
    if (HEAPU8[$0 + 16 | 0]) {
     break block1
    }
    $1 = HEAP32[$0 + 4 >> 2];
    FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 16 >> 2]]($1, 0, Math_imul(HEAPU8[$0 + 13 | 0], 32768 - (HEAPU8[$0 + 61 | 0] << 5 & 96 | HEAPU8[$0 + 60 | 0] << 7) | 0));
    HEAP8[$0 + 16 | 0] = 1;
    return;
   }
   $1 = HEAP32[$0 + 4 >> 2];
   FUNCTION_TABLE[HEAP32[HEAP32[$1 >> 2] + 16 >> 2]]($1, 0, -1);
   HEAP8[$0 + 16 | 0] = 0;
  }
 }
 
 function sbrk($0) {
  var $1 = 0, $2 = 0;
  $0 = $0 + 7 | 0;
  $2 = $0 >>> 0 < 7;
  block : {
   $1 = HEAP32[1494];
   $0 = $1 + ($0 & -8) | 0;
   if (!($1 >>> 0 > $0 >>> 0 ? $2 + 1 | 0 : $2)) {
    if ($0 >>> 0 <= __wasm_memory_size() << 16 >>> 0) {
     break block
    }
    if (emscripten_resize_heap($0 | 0) | 0) {
     break block
    }
   }
   HEAP32[1495] = 48;
   return -1;
  }
  HEAP32[1494] = $0;
  return $1;
 }
 
 function operator_new_unsigned_long_($0) {
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $10 = 0, $11 = 0, $12 = 0;
  $11 = $0 >>> 0 <= 1 ? 1 : $0;
  while (1) {
   block55 : {
    $2 = 0;
    $12 = __stack_pointer - 16 | 0;
    __stack_pointer = $12;
    block1 : {
     block6 : {
      block12 : {
       block28 : {
        block23 : {
         block20 : {
          block16 : {
           block18 : {
            block21 : {
             block13 : {
              block7 : {
               block2 : {
                if ($11 >>> 0 <= 244) {
                 $4 = HEAP32[1496];
                 $6 = $11 >>> 0 < 11 ? 16 : $11 + 11 & 504;
                 $1 = $6 >>> 3 | 0;
                 $0 = $4 >>> $1 | 0;
                 if ($0 & 3) {
                  $0 = $1 + (($0 ^ -1) & 1) | 0;
                  $5 = $0 << 3;
                  $2 = $5 + 6024 | 0;
                  $3 = HEAP32[$5 + 6032 >> 2];
                  $1 = HEAP32[$3 + 8 >> 2];
                  block : {
                   if (($2 | 0) == ($1 | 0)) {
                    HEAP32[1496] = __wasm_rotl_i32($0) & $4;
                    break block;
                   }
                   HEAP32[$1 + 12 >> 2] = $2;
                   HEAP32[$2 + 8 >> 2] = $1;
                  }
                  $0 = $3 + 8 | 0;
                  HEAP32[$3 + 4 >> 2] = $5 | 3;
                  $1 = $3 + $5 | 0;
                  HEAP32[$1 + 4 >> 2] = HEAP32[$1 + 4 >> 2] | 1;
                  break block1;
                 }
                 $10 = HEAP32[1498];
                 if ($10 >>> 0 >= $6 >>> 0) {
                  break block2
                 }
                 if ($0) {
                  $3 = $0 << $1;
                  $0 = 2 << $1;
                  $0 = __wasm_ctz_i32($3 & (0 - $0 | $0));
                  $5 = $0 << 3;
                  $2 = $5 + 6024 | 0;
                  $7 = HEAP32[$5 + 6032 >> 2];
                  $1 = HEAP32[$7 + 8 >> 2];
                  block3 : {
                   if (($2 | 0) == ($1 | 0)) {
                    $4 = __wasm_rotl_i32($0) & $4;
                    HEAP32[1496] = $4;
                    break block3;
                   }
                   HEAP32[$1 + 12 >> 2] = $2;
                   HEAP32[$2 + 8 >> 2] = $1;
                  }
                  HEAP32[$7 + 4 >> 2] = $6 | 3;
                  $2 = $6 + $7 | 0;
                  $3 = $5 - $6 | 0;
                  HEAP32[$2 + 4 >> 2] = $3 | 1;
                  HEAP32[$5 + $7 >> 2] = $3;
                  if ($10) {
                   $1 = ($10 & -8) + 6024 | 0;
                   $5 = HEAP32[1501];
                   $0 = 1 << ($10 >>> 3);
                   block4 : {
                    if (!($0 & $4)) {
                     HEAP32[1496] = $0 | $4;
                     $0 = $1;
                     break block4;
                    }
                    $0 = HEAP32[$1 + 8 >> 2];
                   }
                   HEAP32[$1 + 8 >> 2] = $5;
                   HEAP32[$0 + 12 >> 2] = $5;
                   HEAP32[$5 + 12 >> 2] = $1;
                   HEAP32[$5 + 8 >> 2] = $0;
                  }
                  $0 = $7 + 8 | 0;
                  HEAP32[1501] = $2;
                  HEAP32[1498] = $3;
                  break block1;
                 }
                 $9 = HEAP32[1497];
                 if (!$9) {
                  break block2
                 }
                 $1 = HEAP32[(__wasm_ctz_i32($9) << 2) + 6288 >> 2];
                 $7 = (HEAP32[$1 + 4 >> 2] & -8) - $6 | 0;
                 $3 = $1;
                 while (1) {
                  block5 : {
                   $0 = HEAP32[$1 + 16 >> 2];
                   if (!$0) {
                    $0 = HEAP32[$1 + 20 >> 2];
                    if (!$0) {
                     break block5
                    }
                   }
                   $1 = (HEAP32[$0 + 4 >> 2] & -8) - $6 | 0;
                   $2 = $1 >>> 0 < $7 >>> 0;
                   $7 = $2 ? $1 : $7;
                   $3 = $2 ? $0 : $3;
                   $1 = $0;
                   continue;
                  }
                  break;
                 };
                 $8 = HEAP32[$3 + 24 >> 2];
                 $0 = HEAP32[$3 + 12 >> 2];
                 if (($3 | 0) != ($0 | 0)) {
                  $1 = HEAP32[$3 + 8 >> 2];
                  HEAP32[$1 + 12 >> 2] = $0;
                  HEAP32[$0 + 8 >> 2] = $1;
                  break block6;
                 }
                 $1 = HEAP32[$3 + 20 >> 2];
                 if ($1) {
                  $2 = $3 + 20 | 0
                 } else {
                  $1 = HEAP32[$3 + 16 >> 2];
                  if (!$1) {
                   break block7
                  }
                  $2 = $3 + 16 | 0;
                 }
                 while (1) {
                  $5 = $2;
                  $0 = $1;
                  $2 = $0 + 20 | 0;
                  $1 = HEAP32[$0 + 20 >> 2];
                  if ($1) {
                   continue
                  }
                  $2 = $0 + 16 | 0;
                  $1 = HEAP32[$0 + 16 >> 2];
                  if ($1) {
                   continue
                  }
                  break;
                 };
                 HEAP32[$5 >> 2] = 0;
                 break block6;
                }
                $6 = -1;
                if ($11 >>> 0 > 4294967231) {
                 break block2
                }
                $0 = $11 + 11 | 0;
                $6 = $0 & -8;
                $9 = HEAP32[1497];
                if (!$9) {
                 break block2
                }
                $4 = 31;
                $7 = 0 - $6 | 0;
                if ($11 >>> 0 <= 16777204) {
                 $0 = Math_clz32($0 >>> 8 | 0);
                 $4 = (($6 >>> 38 - $0 & 1) - ($0 << 1) | 0) + 62 | 0;
                }
                $1 = HEAP32[($4 << 2) + 6288 >> 2];
                block11 : {
                 block10 : {
                  block8 : {
                   if (!$1) {
                    $0 = 0;
                    break block8;
                   }
                   $0 = 0;
                   $3 = $6 << (($4 | 0) != 31 ? 25 - ($4 >>> 1 | 0) | 0 : 0);
                   while (1) {
                    block9 : {
                     $5 = (HEAP32[$1 + 4 >> 2] & -8) - $6 | 0;
                     if ($5 >>> 0 >= $7 >>> 0) {
                      break block9
                     }
                     $2 = $1;
                     $7 = $5;
                     if ($5) {
                      break block9
                     }
                     $7 = 0;
                     $0 = $1;
                     break block10;
                    }
                    $5 = HEAP32[$1 + 20 >> 2];
                    $1 = HEAP32[(($3 >>> 29 & 4) + $1 | 0) + 16 >> 2];
                    $0 = $5 ? (($1 | 0) == ($5 | 0) ? $0 : $5) : $0;
                    $3 = $3 << 1;
                    if ($1) {
                     continue
                    }
                    break;
                   };
                  }
                  if (!($0 | $2)) {
                   $2 = 0;
                   $0 = 2 << $4;
                   $0 = (0 - $0 | $0) & $9;
                   if (!$0) {
                    break block2
                   }
                   $0 = HEAP32[(__wasm_ctz_i32($0) << 2) + 6288 >> 2];
                  }
                  if (!$0) {
                   break block11
                  }
                 }
                 while (1) {
                  $1 = (HEAP32[$0 + 4 >> 2] & -8) - $6 | 0;
                  $3 = $1 >>> 0 < $7 >>> 0;
                  $7 = $3 ? $1 : $7;
                  $2 = $3 ? $0 : $2;
                  $1 = HEAP32[$0 + 16 >> 2];
                  if ($1) {
                   $0 = $1
                  } else {
                   $0 = HEAP32[$0 + 20 >> 2]
                  }
                  if ($0) {
                   continue
                  }
                  break;
                 };
                }
                if (!$2 | HEAP32[1498] - $6 >>> 0 <= $7 >>> 0) {
                 break block2
                }
                $4 = HEAP32[$2 + 24 >> 2];
                $0 = HEAP32[$2 + 12 >> 2];
                if (($2 | 0) != ($0 | 0)) {
                 $1 = HEAP32[$2 + 8 >> 2];
                 HEAP32[$1 + 12 >> 2] = $0;
                 HEAP32[$0 + 8 >> 2] = $1;
                 break block12;
                }
                $1 = HEAP32[$2 + 20 >> 2];
                if ($1) {
                 $3 = $2 + 20 | 0
                } else {
                 $1 = HEAP32[$2 + 16 >> 2];
                 if (!$1) {
                  break block13
                 }
                 $3 = $2 + 16 | 0;
                }
                while (1) {
                 $5 = $3;
                 $0 = $1;
                 $3 = $0 + 20 | 0;
                 $1 = HEAP32[$0 + 20 >> 2];
                 if ($1) {
                  continue
                 }
                 $3 = $0 + 16 | 0;
                 $1 = HEAP32[$0 + 16 >> 2];
                 if ($1) {
                  continue
                 }
                 break;
                };
                HEAP32[$5 >> 2] = 0;
                break block12;
               }
               $0 = HEAP32[1498];
               if ($0 >>> 0 >= $6 >>> 0) {
                $2 = HEAP32[1501];
                $1 = $0 - $6 | 0;
                block14 : {
                 if ($1 >>> 0 >= 16) {
                  $3 = $2 + $6 | 0;
                  HEAP32[$3 + 4 >> 2] = $1 | 1;
                  HEAP32[$0 + $2 >> 2] = $1;
                  HEAP32[$2 + 4 >> 2] = $6 | 3;
                  break block14;
                 }
                 HEAP32[$2 + 4 >> 2] = $0 | 3;
                 $0 = $0 + $2 | 0;
                 HEAP32[$0 + 4 >> 2] = HEAP32[$0 + 4 >> 2] | 1;
                 $1 = 0;
                 $3 = 0;
                }
                HEAP32[1498] = $1;
                HEAP32[1501] = $3;
                $0 = $2 + 8 | 0;
                break block1;
               }
               $8 = HEAP32[1499];
               if ($8 >>> 0 > $6 >>> 0) {
                $1 = $8 - $6 | 0;
                HEAP32[1499] = $1;
                $2 = HEAP32[1502];
                $0 = $2 + $6 | 0;
                HEAP32[1502] = $0;
                HEAP32[$0 + 4 >> 2] = $1 | 1;
                HEAP32[$2 + 4 >> 2] = $6 | 3;
                $0 = $2 + 8 | 0;
                break block1;
               }
               $0 = 0;
               $9 = $6 + 47 | 0;
               if (HEAP32[1614]) {
                $2 = HEAP32[1616]
               } else {
                HEAP32[1617] = -1;
                HEAP32[1618] = -1;
                HEAP32[1615] = 4096;
                HEAP32[1616] = 4096;
                HEAP32[1614] = $12 + 12 & -16 ^ 1431655768;
                HEAP32[1619] = 0;
                HEAP32[1607] = 0;
                $2 = 4096;
               }
               $7 = $9 + $2 | 0;
               $5 = 0 - $2 | 0;
               $1 = $7 & $5;
               if ($1 >>> 0 <= $6 >>> 0) {
                break block1
               }
               $3 = HEAP32[1606];
               if ($3) {
                $2 = HEAP32[1604];
                $4 = $2 + $1 | 0;
                if ($3 >>> 0 < $4 >>> 0 | $2 >>> 0 >= $4 >>> 0) {
                 break block1
                }
               }
               if (HEAPU8[6428] & 4) {
                break block16
               }
               block19 : {
                block17 : {
                 $3 = HEAP32[1502];
                 if ($3) {
                  $0 = 6432;
                  while (1) {
                   $2 = HEAP32[$0 >> 2];
                   if ($2 >>> 0 <= $3 >>> 0 & $3 >>> 0 < $2 + HEAP32[$0 + 4 >> 2] >>> 0) {
                    break block17
                   }
                   $0 = HEAP32[$0 + 8 >> 2];
                   if ($0) {
                    continue
                   }
                   break;
                  };
                 }
                 $3 = sbrk(0);
                 if (($3 | 0) == -1) {
                  break block18
                 }
                 $4 = $1;
                 $2 = HEAP32[1615];
                 $0 = $2 - 1 | 0;
                 if ($0 & $3) {
                  $4 = ($1 - $3 | 0) + ($0 + $3 & 0 - $2) | 0
                 }
                 if ($4 >>> 0 <= $6 >>> 0) {
                  break block18
                 }
                 $2 = HEAP32[1606];
                 if ($2) {
                  $0 = HEAP32[1604];
                  $5 = $0 + $4 | 0;
                  if ($2 >>> 0 < $5 >>> 0 | $0 >>> 0 >= $5 >>> 0) {
                   break block18
                  }
                 }
                 $0 = sbrk($4);
                 if (($3 | 0) != ($0 | 0)) {
                  break block19
                 }
                 break block20;
                }
                $4 = $5 & $7 - $8;
                $3 = sbrk($4);
                if (($3 | 0) == (HEAP32[$0 >> 2] + HEAP32[$0 + 4 >> 2] | 0)) {
                 break block21
                }
                $0 = $3;
               }
               if (!(($0 | 0) == -1 | $6 + 48 >>> 0 <= $4 >>> 0)) {
                $2 = HEAP32[1616];
                $2 = $2 + ($9 - $4 | 0) & 0 - $2;
                if ((sbrk($2) | 0) == -1) {
                 break block18
                }
                $4 = $2 + $4 | 0;
                $3 = $0;
                break block20;
               }
               $3 = $0;
               if (($0 | 0) != -1) {
                break block20
               }
               break block18;
              }
              $0 = 0;
              break block6;
             }
             $0 = 0;
             break block12;
            }
            if (($3 | 0) != -1) {
             break block20
            }
           }
           HEAP32[1607] = HEAP32[1607] | 4;
          }
          $3 = sbrk($1);
          $0 = sbrk(0);
          if (($3 | 0) == -1 | ($0 | 0) == -1 | $0 >>> 0 <= $3 >>> 0) {
           break block23
          }
          $4 = $0 - $3 | 0;
          if ($4 >>> 0 <= $6 + 40 >>> 0) {
           break block23
          }
         }
         $0 = HEAP32[1604] + $4 | 0;
         HEAP32[1604] = $0;
         if ($0 >>> 0 > HEAPU32[1605]) {
          HEAP32[1605] = $0
         }
         block26 : {
          block25 : {
           block24 : {
            $5 = HEAP32[1502];
            if ($5) {
             $0 = 6432;
             while (1) {
              $2 = HEAP32[$0 >> 2];
              $1 = HEAP32[$0 + 4 >> 2];
              if (($2 + $1 | 0) == ($3 | 0)) {
               break block24
              }
              $0 = HEAP32[$0 + 8 >> 2];
              if ($0) {
               continue
              }
              break;
             };
             break block25;
            }
            $0 = HEAP32[1500];
            if (!($0 >>> 0 <= $3 >>> 0 ? $0 : 0)) {
             HEAP32[1500] = $3
            }
            $0 = 0;
            HEAP32[1609] = $4;
            HEAP32[1608] = $3;
            HEAP32[1504] = -1;
            HEAP32[1505] = HEAP32[1614];
            HEAP32[1611] = 0;
            while (1) {
             $2 = $0 << 3;
             $1 = $2 + 6024 | 0;
             HEAP32[$2 + 6032 >> 2] = $1;
             HEAP32[$2 + 6036 >> 2] = $1;
             $0 = $0 + 1 | 0;
             if (($0 | 0) != 32) {
              continue
             }
             break;
            };
            $2 = $4 - 40 | 0;
            $0 = 0 - $3 & 7;
            $1 = $2 - $0 | 0;
            HEAP32[1499] = $1;
            $0 = $0 + $3 | 0;
            HEAP32[1502] = $0;
            HEAP32[$0 + 4 >> 2] = $1 | 1;
            HEAP32[($2 + $3 | 0) + 4 >> 2] = 40;
            HEAP32[1503] = HEAP32[1618];
            break block26;
           }
           if (HEAP32[$0 + 12 >> 2] & 8 | ($3 >>> 0 <= $5 >>> 0 | $2 >>> 0 > $5 >>> 0)) {
            break block25
           }
           HEAP32[$0 + 4 >> 2] = $1 + $4;
           $0 = 0 - $5 & 7;
           $2 = $0 + $5 | 0;
           HEAP32[1502] = $2;
           $1 = HEAP32[1499] + $4 | 0;
           $0 = $1 - $0 | 0;
           HEAP32[1499] = $0;
           HEAP32[$2 + 4 >> 2] = $0 | 1;
           HEAP32[($1 + $5 | 0) + 4 >> 2] = 40;
           HEAP32[1503] = HEAP32[1618];
           break block26;
          }
          if (HEAPU32[1500] > $3 >>> 0) {
           HEAP32[1500] = $3
          }
          $1 = $3 + $4 | 0;
          $0 = 6432;
          block27 : {
           while (1) {
            $2 = HEAP32[$0 >> 2];
            if (($2 | 0) != ($1 | 0)) {
             $0 = HEAP32[$0 + 8 >> 2];
             if ($0) {
              continue
             }
             break block27;
            }
            break;
           };
           if (!(HEAPU8[$0 + 12 | 0] & 8)) {
            break block28
           }
          }
          $0 = 6432;
          while (1) {
           block29 : {
            $1 = HEAP32[$0 >> 2];
            if ($1 >>> 0 <= $5 >>> 0) {
             $7 = $1 + HEAP32[$0 + 4 >> 2] | 0;
             if ($7 >>> 0 > $5 >>> 0) {
              break block29
             }
            }
            $0 = HEAP32[$0 + 8 >> 2];
            continue;
           }
           break;
          };
          $2 = $4 - 40 | 0;
          $0 = 0 - $3 & 7;
          $1 = $2 - $0 | 0;
          HEAP32[1499] = $1;
          $0 = $0 + $3 | 0;
          HEAP32[1502] = $0;
          HEAP32[$0 + 4 >> 2] = $1 | 1;
          HEAP32[($2 + $3 | 0) + 4 >> 2] = 40;
          HEAP32[1503] = HEAP32[1618];
          $0 = ($7 + (39 - $7 & 7) | 0) - 47 | 0;
          $2 = $0 >>> 0 < $5 + 16 >>> 0 ? $5 : $0;
          HEAP32[$2 + 4 >> 2] = 27;
          $0 = HEAP32[1611];
          HEAP32[$2 + 16 >> 2] = HEAP32[1610];
          HEAP32[$2 + 20 >> 2] = $0;
          $0 = HEAP32[1609];
          HEAP32[$2 + 8 >> 2] = HEAP32[1608];
          HEAP32[$2 + 12 >> 2] = $0;
          HEAP32[1609] = $4;
          HEAP32[1610] = $2 + 8;
          HEAP32[1608] = $3;
          HEAP32[1611] = 0;
          $0 = $2 + 24 | 0;
          while (1) {
           HEAP32[$0 + 4 >> 2] = 7;
           $1 = $0 + 8 | 0;
           $0 = $0 + 4 | 0;
           if ($1 >>> 0 < $7 >>> 0) {
            continue
           }
           break;
          };
          if (($2 | 0) == ($5 | 0)) {
           break block26
          }
          HEAP32[$2 + 4 >> 2] = HEAP32[$2 + 4 >> 2] & -2;
          $7 = $2 - $5 | 0;
          HEAP32[$5 + 4 >> 2] = $7 | 1;
          HEAP32[$2 >> 2] = $7;
          block31 : {
           if ($7 >>> 0 <= 255) {
            $0 = ($7 & 248) + 6024 | 0;
            $2 = HEAP32[1496];
            $1 = 1 << ($7 >>> 3);
            block30 : {
             if (!($2 & $1)) {
              HEAP32[1496] = $1 | $2;
              $1 = $0;
              break block30;
             }
             $1 = HEAP32[$0 + 8 >> 2];
            }
            HEAP32[$0 + 8 >> 2] = $5;
            HEAP32[$1 + 12 >> 2] = $5;
            $3 = 12;
            $2 = 8;
            break block31;
           }
           $0 = 31;
           if ($7 >>> 0 <= 16777215) {
            $0 = Math_clz32($7 >>> 8 | 0);
            $0 = ($7 >>> 38 - $0 & 1 | $0 << 1) ^ 62;
           }
           HEAP32[$5 + 28 >> 2] = $0;
           HEAP32[$5 + 16 >> 2] = 0;
           HEAP32[$5 + 20 >> 2] = 0;
           $3 = ($0 << 2) + 6288 | 0;
           block33 : {
            $2 = HEAP32[1497];
            $1 = 1 << $0;
            block32 : {
             if (!($2 & $1)) {
              HEAP32[1497] = $1 | $2;
              HEAP32[$3 >> 2] = $5;
              HEAP32[$5 + 24 >> 2] = $3;
              break block32;
             }
             $0 = $7 << (($0 | 0) != 31 ? 25 - ($0 >>> 1 | 0) | 0 : 0);
             $2 = HEAP32[$3 >> 2];
             while (1) {
              $1 = $2;
              if (($7 | 0) == (HEAP32[$1 + 4 >> 2] & -8)) {
               break block33
              }
              $3 = $0 >>> 29 | 0;
              $0 = $0 << 1;
              $3 = ($3 & 4) + $1 | 0;
              $2 = HEAP32[$3 + 16 >> 2];
              if ($2) {
               continue
              }
              break;
             };
             HEAP32[$3 + 16 >> 2] = $5;
             HEAP32[$5 + 24 >> 2] = $1;
            }
            $3 = 8;
            $1 = $5;
            $0 = $1;
            $2 = 12;
            break block31;
           }
           $0 = HEAP32[$1 + 8 >> 2];
           HEAP32[$0 + 12 >> 2] = $5;
           HEAP32[$1 + 8 >> 2] = $5;
           HEAP32[$5 + 8 >> 2] = $0;
           $0 = 0;
           $3 = 24;
           $2 = 12;
          }
          HEAP32[$2 + $5 >> 2] = $1;
          HEAP32[$3 + $5 >> 2] = $0;
         }
         $0 = HEAP32[1499];
         if ($0 >>> 0 <= $6 >>> 0) {
          break block23
         }
         $1 = $0 - $6 | 0;
         HEAP32[1499] = $1;
         $2 = HEAP32[1502];
         $0 = $2 + $6 | 0;
         HEAP32[1502] = $0;
         HEAP32[$0 + 4 >> 2] = $1 | 1;
         HEAP32[$2 + 4 >> 2] = $6 | 3;
         $0 = $2 + 8 | 0;
         break block1;
        }
        HEAP32[1495] = 48;
        $0 = 0;
        break block1;
       }
       HEAP32[$0 >> 2] = $3;
       HEAP32[$0 + 4 >> 2] = HEAP32[$0 + 4 >> 2] + $4;
       $7 = (0 - $3 & 7) + $3 | 0;
       HEAP32[$7 + 4 >> 2] = $6 | 3;
       $4 = $2 + (0 - $2 & 7) | 0;
       $8 = $6 + $7 | 0;
       $3 = $4 - $8 | 0;
       block34 : {
        if (HEAP32[1502] == ($4 | 0)) {
         HEAP32[1502] = $8;
         $0 = HEAP32[1499] + $3 | 0;
         HEAP32[1499] = $0;
         HEAP32[$8 + 4 >> 2] = $0 | 1;
         break block34;
        }
        if (HEAP32[1501] == ($4 | 0)) {
         HEAP32[1501] = $8;
         $0 = HEAP32[1498] + $3 | 0;
         HEAP32[1498] = $0;
         HEAP32[$8 + 4 >> 2] = $0 | 1;
         HEAP32[$0 + $8 >> 2] = $0;
         break block34;
        }
        $2 = HEAP32[$4 + 4 >> 2];
        if (($2 & 3) == 1) {
         $5 = $2 & -8;
         $6 = HEAP32[$4 + 12 >> 2];
         block35 : {
          if ($2 >>> 0 <= 255) {
           $0 = HEAP32[$4 + 8 >> 2];
           if (($0 | 0) == ($6 | 0)) {
            HEAP32[1496] = HEAP32[1496] & __wasm_rotl_i32($2 >>> 3 | 0);
            break block35;
           }
           HEAP32[$0 + 12 >> 2] = $6;
           HEAP32[$6 + 8 >> 2] = $0;
           break block35;
          }
          $9 = HEAP32[$4 + 24 >> 2];
          block36 : {
           if (($4 | 0) != ($6 | 0)) {
            $0 = HEAP32[$4 + 8 >> 2];
            HEAP32[$0 + 12 >> 2] = $6;
            HEAP32[$6 + 8 >> 2] = $0;
            break block36;
           }
           block37 : {
            $2 = HEAP32[$4 + 20 >> 2];
            if ($2) {
             $0 = $4 + 20 | 0
            } else {
             $2 = HEAP32[$4 + 16 >> 2];
             if (!$2) {
              break block37
             }
             $0 = $4 + 16 | 0;
            }
            while (1) {
             $1 = $0;
             $6 = $2;
             $0 = $2 + 20 | 0;
             $2 = HEAP32[$2 + 20 >> 2];
             if ($2) {
              continue
             }
             $0 = $6 + 16 | 0;
             $2 = HEAP32[$6 + 16 >> 2];
             if ($2) {
              continue
             }
             break;
            };
            HEAP32[$1 >> 2] = 0;
            break block36;
           }
           $6 = 0;
          }
          if (!$9) {
           break block35
          }
          $1 = HEAP32[$4 + 28 >> 2];
          $0 = $1 << 2;
          block38 : {
           if (HEAP32[$0 + 6288 >> 2] == ($4 | 0)) {
            HEAP32[$0 + 6288 >> 2] = $6;
            if ($6) {
             break block38
            }
            HEAP32[1497] = HEAP32[1497] & __wasm_rotl_i32($1);
            break block35;
           }
           block39 : {
            if (HEAP32[$9 + 16 >> 2] == ($4 | 0)) {
             HEAP32[$9 + 16 >> 2] = $6;
             break block39;
            }
            HEAP32[$9 + 20 >> 2] = $6;
           }
           if (!$6) {
            break block35
           }
          }
          HEAP32[$6 + 24 >> 2] = $9;
          $0 = HEAP32[$4 + 16 >> 2];
          if ($0) {
           HEAP32[$6 + 16 >> 2] = $0;
           HEAP32[$0 + 24 >> 2] = $6;
          }
          $0 = HEAP32[$4 + 20 >> 2];
          if (!$0) {
           break block35
          }
          HEAP32[$6 + 20 >> 2] = $0;
          HEAP32[$0 + 24 >> 2] = $6;
         }
         $3 = $3 + $5 | 0;
         $4 = $4 + $5 | 0;
         $2 = HEAP32[$4 + 4 >> 2];
        }
        HEAP32[$4 + 4 >> 2] = $2 & -2;
        HEAP32[$8 + 4 >> 2] = $3 | 1;
        HEAP32[$3 + $8 >> 2] = $3;
        if ($3 >>> 0 <= 255) {
         $1 = ($3 & 248) + 6024 | 0;
         $2 = HEAP32[1496];
         $0 = 1 << ($3 >>> 3);
         block40 : {
          if (!($2 & $0)) {
           HEAP32[1496] = $0 | $2;
           $0 = $1;
           break block40;
          }
          $0 = HEAP32[$1 + 8 >> 2];
         }
         HEAP32[$1 + 8 >> 2] = $8;
         HEAP32[$0 + 12 >> 2] = $8;
         HEAP32[$8 + 12 >> 2] = $1;
         HEAP32[$8 + 8 >> 2] = $0;
         break block34;
        }
        $6 = 31;
        if ($3 >>> 0 <= 16777215) {
         $0 = Math_clz32($3 >>> 8 | 0);
         $6 = ($3 >>> 38 - $0 & 1 | $0 << 1) ^ 62;
        }
        HEAP32[$8 + 28 >> 2] = $6;
        HEAP32[$8 + 16 >> 2] = 0;
        HEAP32[$8 + 20 >> 2] = 0;
        $2 = ($6 << 2) + 6288 | 0;
        block42 : {
         $1 = HEAP32[1497];
         $0 = 1 << $6;
         block41 : {
          if (!($1 & $0)) {
           HEAP32[1497] = $0 | $1;
           HEAP32[$2 >> 2] = $8;
           HEAP32[$8 + 24 >> 2] = $2;
           break block41;
          }
          $6 = $3 << (($6 | 0) != 31 ? 25 - ($6 >>> 1 | 0) | 0 : 0);
          $0 = HEAP32[$2 >> 2];
          while (1) {
           $1 = $0;
           if ((HEAP32[$0 + 4 >> 2] & -8) == ($3 | 0)) {
            break block42
           }
           $2 = $6 >>> 29 | 0;
           $6 = $6 << 1;
           $2 = $0 + ($2 & 4) | 0;
           $0 = HEAP32[$2 + 16 >> 2];
           if ($0) {
            continue
           }
           break;
          };
          HEAP32[$2 + 16 >> 2] = $8;
          HEAP32[$8 + 24 >> 2] = $1;
         }
         HEAP32[$8 + 12 >> 2] = $8;
         HEAP32[$8 + 8 >> 2] = $8;
         break block34;
        }
        $0 = HEAP32[$1 + 8 >> 2];
        HEAP32[$0 + 12 >> 2] = $8;
        HEAP32[$1 + 8 >> 2] = $8;
        HEAP32[$8 + 24 >> 2] = 0;
        HEAP32[$8 + 12 >> 2] = $1;
        HEAP32[$8 + 8 >> 2] = $0;
       }
       $0 = $7 + 8 | 0;
       break block1;
      }
      block43 : {
       if (!$4) {
        break block43
       }
       $3 = HEAP32[$2 + 28 >> 2];
       $1 = $3 << 2;
       block44 : {
        if (HEAP32[$1 + 6288 >> 2] == ($2 | 0)) {
         HEAP32[$1 + 6288 >> 2] = $0;
         if ($0) {
          break block44
         }
         $9 = __wasm_rotl_i32($3) & $9;
         HEAP32[1497] = $9;
         break block43;
        }
        block45 : {
         if (HEAP32[$4 + 16 >> 2] == ($2 | 0)) {
          HEAP32[$4 + 16 >> 2] = $0;
          break block45;
         }
         HEAP32[$4 + 20 >> 2] = $0;
        }
        if (!$0) {
         break block43
        }
       }
       HEAP32[$0 + 24 >> 2] = $4;
       $1 = HEAP32[$2 + 16 >> 2];
       if ($1) {
        HEAP32[$0 + 16 >> 2] = $1;
        HEAP32[$1 + 24 >> 2] = $0;
       }
       $1 = HEAP32[$2 + 20 >> 2];
       if (!$1) {
        break block43
       }
       HEAP32[$0 + 20 >> 2] = $1;
       HEAP32[$1 + 24 >> 2] = $0;
      }
      block46 : {
       if ($7 >>> 0 <= 15) {
        $0 = $6 + $7 | 0;
        HEAP32[$2 + 4 >> 2] = $0 | 3;
        $0 = $0 + $2 | 0;
        HEAP32[$0 + 4 >> 2] = HEAP32[$0 + 4 >> 2] | 1;
        break block46;
       }
       HEAP32[$2 + 4 >> 2] = $6 | 3;
       $4 = $2 + $6 | 0;
       HEAP32[$4 + 4 >> 2] = $7 | 1;
       HEAP32[$4 + $7 >> 2] = $7;
       if ($7 >>> 0 <= 255) {
        $1 = ($7 & 248) + 6024 | 0;
        $3 = HEAP32[1496];
        $0 = 1 << ($7 >>> 3);
        block47 : {
         if (!($3 & $0)) {
          HEAP32[1496] = $0 | $3;
          $0 = $1;
          break block47;
         }
         $0 = HEAP32[$1 + 8 >> 2];
        }
        HEAP32[$1 + 8 >> 2] = $4;
        HEAP32[$0 + 12 >> 2] = $4;
        HEAP32[$4 + 12 >> 2] = $1;
        HEAP32[$4 + 8 >> 2] = $0;
        break block46;
       }
       $0 = 31;
       if ($7 >>> 0 <= 16777215) {
        $0 = Math_clz32($7 >>> 8 | 0);
        $0 = ($7 >>> 38 - $0 & 1 | $0 << 1) ^ 62;
       }
       HEAP32[$4 + 28 >> 2] = $0;
       HEAP32[$4 + 16 >> 2] = 0;
       HEAP32[$4 + 20 >> 2] = 0;
       $3 = ($0 << 2) + 6288 | 0;
       block49 : {
        $1 = 1 << $0;
        block48 : {
         if (!($1 & $9)) {
          HEAP32[1497] = $1 | $9;
          HEAP32[$3 >> 2] = $4;
          break block48;
         }
         $0 = $7 << (($0 | 0) != 31 ? 25 - ($0 >>> 1 | 0) | 0 : 0);
         $1 = HEAP32[$3 >> 2];
         while (1) {
          $3 = $1;
          if ((HEAP32[$1 + 4 >> 2] & -8) == ($7 | 0)) {
           break block49
          }
          $5 = $0 >>> 29 | 0;
          $0 = $0 << 1;
          $5 = $1 + ($5 & 4) | 0;
          $1 = HEAP32[$5 + 16 >> 2];
          if ($1) {
           continue
          }
          break;
         };
         HEAP32[$5 + 16 >> 2] = $4;
        }
        HEAP32[$4 + 24 >> 2] = $3;
        HEAP32[$4 + 12 >> 2] = $4;
        HEAP32[$4 + 8 >> 2] = $4;
        break block46;
       }
       $0 = HEAP32[$3 + 8 >> 2];
       HEAP32[$0 + 12 >> 2] = $4;
       HEAP32[$3 + 8 >> 2] = $4;
       HEAP32[$4 + 24 >> 2] = 0;
       HEAP32[$4 + 12 >> 2] = $3;
       HEAP32[$4 + 8 >> 2] = $0;
      }
      $0 = $2 + 8 | 0;
      break block1;
     }
     block50 : {
      if (!$8) {
       break block50
      }
      $2 = HEAP32[$3 + 28 >> 2];
      $1 = $2 << 2;
      block51 : {
       if (HEAP32[$1 + 6288 >> 2] == ($3 | 0)) {
        HEAP32[$1 + 6288 >> 2] = $0;
        if ($0) {
         break block51
        }
        HEAP32[1497] = __wasm_rotl_i32($2) & $9;
        break block50;
       }
       block52 : {
        if (HEAP32[$8 + 16 >> 2] == ($3 | 0)) {
         HEAP32[$8 + 16 >> 2] = $0;
         break block52;
        }
        HEAP32[$8 + 20 >> 2] = $0;
       }
       if (!$0) {
        break block50
       }
      }
      HEAP32[$0 + 24 >> 2] = $8;
      $1 = HEAP32[$3 + 16 >> 2];
      if ($1) {
       HEAP32[$0 + 16 >> 2] = $1;
       HEAP32[$1 + 24 >> 2] = $0;
      }
      $1 = HEAP32[$3 + 20 >> 2];
      if (!$1) {
       break block50
      }
      HEAP32[$0 + 20 >> 2] = $1;
      HEAP32[$1 + 24 >> 2] = $0;
     }
     block53 : {
      if ($7 >>> 0 <= 15) {
       $0 = $6 + $7 | 0;
       HEAP32[$3 + 4 >> 2] = $0 | 3;
       $0 = $0 + $3 | 0;
       HEAP32[$0 + 4 >> 2] = HEAP32[$0 + 4 >> 2] | 1;
       break block53;
      }
      HEAP32[$3 + 4 >> 2] = $6 | 3;
      $2 = $3 + $6 | 0;
      HEAP32[$2 + 4 >> 2] = $7 | 1;
      HEAP32[$2 + $7 >> 2] = $7;
      if ($10) {
       $1 = ($10 & -8) + 6024 | 0;
       $5 = HEAP32[1501];
       $0 = 1 << ($10 >>> 3);
       block54 : {
        if (!($0 & $4)) {
         HEAP32[1496] = $0 | $4;
         $0 = $1;
         break block54;
        }
        $0 = HEAP32[$1 + 8 >> 2];
       }
       HEAP32[$1 + 8 >> 2] = $5;
       HEAP32[$0 + 12 >> 2] = $5;
       HEAP32[$5 + 12 >> 2] = $1;
       HEAP32[$5 + 8 >> 2] = $0;
      }
      HEAP32[1501] = $2;
      HEAP32[1498] = $7;
     }
     $0 = $3 + 8 | 0;
    }
    __stack_pointer = $12 + 16 | 0;
    if ($0) {
     break block55
    }
    $1 = HEAP32[1620];
    if (!$1) {
     break block55
    }
    FUNCTION_TABLE[$1 | 0]();
    continue;
   }
   break;
  };
  if (!$0) {
   _abort_js();
   wasm2js_trap();
  }
  return $0;
 }
 
 function operator_delete_void__($0) {
  var $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
  block : {
   if (!$0) {
    break block
   }
   $2 = $0 - 8 | 0;
   $0 = HEAP32[$0 - 4 >> 2];
   $4 = $0 & -8;
   $5 = $2 + $4 | 0;
   block1 : {
    if ($0 & 1) {
     break block1
    }
    if (!($0 & 2)) {
     break block
    }
    $0 = HEAP32[$2 >> 2];
    $2 = $2 - $0 | 0;
    if ($2 >>> 0 < HEAPU32[1500]) {
     break block
    }
    $4 = $0 + $4 | 0;
    block3 : {
     block4 : {
      block2 : {
       if (HEAP32[1501] != ($2 | 0)) {
        $1 = HEAP32[$2 + 12 >> 2];
        if ($0 >>> 0 <= 255) {
         $3 = HEAP32[$2 + 8 >> 2];
         if (($3 | 0) != ($1 | 0)) {
          break block2
         }
         HEAP32[1496] = HEAP32[1496] & __wasm_rotl_i32($0 >>> 3 | 0);
         break block1;
        }
        $7 = HEAP32[$2 + 24 >> 2];
        if (($1 | 0) != ($2 | 0)) {
         $0 = HEAP32[$2 + 8 >> 2];
         HEAP32[$0 + 12 >> 2] = $1;
         HEAP32[$1 + 8 >> 2] = $0;
         break block3;
        }
        $0 = HEAP32[$2 + 20 >> 2];
        if ($0) {
         $3 = $2 + 20 | 0
        } else {
         $0 = HEAP32[$2 + 16 >> 2];
         if (!$0) {
          break block4
         }
         $3 = $2 + 16 | 0;
        }
        while (1) {
         $6 = $3;
         $1 = $0;
         $3 = $0 + 20 | 0;
         $0 = HEAP32[$0 + 20 >> 2];
         if ($0) {
          continue
         }
         $3 = $1 + 16 | 0;
         $0 = HEAP32[$1 + 16 >> 2];
         if ($0) {
          continue
         }
         break;
        };
        HEAP32[$6 >> 2] = 0;
        break block3;
       }
       $0 = HEAP32[$5 + 4 >> 2];
       if (($0 & 3) != 3) {
        break block1
       }
       HEAP32[1498] = $4;
       HEAP32[$5 + 4 >> 2] = $0 & -2;
       HEAP32[$2 + 4 >> 2] = $4 | 1;
       HEAP32[$5 >> 2] = $4;
       break block;
      }
      HEAP32[$3 + 12 >> 2] = $1;
      HEAP32[$1 + 8 >> 2] = $3;
      break block1;
     }
     $1 = 0;
    }
    if (!$7) {
     break block1
    }
    $0 = HEAP32[$2 + 28 >> 2];
    $3 = $0 << 2;
    block5 : {
     if (HEAP32[$3 + 6288 >> 2] == ($2 | 0)) {
      HEAP32[$3 + 6288 >> 2] = $1;
      if ($1) {
       break block5
      }
      HEAP32[1497] = HEAP32[1497] & __wasm_rotl_i32($0);
      break block1;
     }
     block6 : {
      if (HEAP32[$7 + 16 >> 2] == ($2 | 0)) {
       HEAP32[$7 + 16 >> 2] = $1;
       break block6;
      }
      HEAP32[$7 + 20 >> 2] = $1;
     }
     if (!$1) {
      break block1
     }
    }
    HEAP32[$1 + 24 >> 2] = $7;
    $0 = HEAP32[$2 + 16 >> 2];
    if ($0) {
     HEAP32[$1 + 16 >> 2] = $0;
     HEAP32[$0 + 24 >> 2] = $1;
    }
    $0 = HEAP32[$2 + 20 >> 2];
    if (!$0) {
     break block1
    }
    HEAP32[$1 + 20 >> 2] = $0;
    HEAP32[$0 + 24 >> 2] = $1;
   }
   if ($2 >>> 0 >= $5 >>> 0) {
    break block
   }
   $0 = HEAP32[$5 + 4 >> 2];
   if (!($0 & 1)) {
    break block
   }
   block10 : {
    block7 : {
     block8 : {
      block9 : {
       if (!($0 & 2)) {
        if (($5 | 0) == HEAP32[1502]) {
         HEAP32[1502] = $2;
         $0 = HEAP32[1499] + $4 | 0;
         HEAP32[1499] = $0;
         HEAP32[$2 + 4 >> 2] = $0 | 1;
         if (HEAP32[1501] != ($2 | 0)) {
          break block
         }
         HEAP32[1498] = 0;
         HEAP32[1501] = 0;
         break block;
        }
        $8 = HEAP32[1501];
        if (($8 | 0) == ($5 | 0)) {
         HEAP32[1501] = $2;
         $0 = HEAP32[1498] + $4 | 0;
         HEAP32[1498] = $0;
         HEAP32[$2 + 4 >> 2] = $0 | 1;
         HEAP32[$0 + $2 >> 2] = $0;
         break block;
        }
        $4 = ($0 & -8) + $4 | 0;
        $1 = HEAP32[$5 + 12 >> 2];
        if ($0 >>> 0 <= 255) {
         $3 = HEAP32[$5 + 8 >> 2];
         if (($3 | 0) == ($1 | 0)) {
          HEAP32[1496] = HEAP32[1496] & __wasm_rotl_i32($0 >>> 3 | 0);
          break block7;
         }
         HEAP32[$3 + 12 >> 2] = $1;
         HEAP32[$1 + 8 >> 2] = $3;
         break block7;
        }
        $7 = HEAP32[$5 + 24 >> 2];
        if (($1 | 0) != ($5 | 0)) {
         $0 = HEAP32[$5 + 8 >> 2];
         HEAP32[$0 + 12 >> 2] = $1;
         HEAP32[$1 + 8 >> 2] = $0;
         break block8;
        }
        $0 = HEAP32[$5 + 20 >> 2];
        if ($0) {
         $3 = $5 + 20 | 0
        } else {
         $0 = HEAP32[$5 + 16 >> 2];
         if (!$0) {
          break block9
         }
         $3 = $5 + 16 | 0;
        }
        while (1) {
         $6 = $3;
         $1 = $0;
         $3 = $0 + 20 | 0;
         $0 = HEAP32[$0 + 20 >> 2];
         if ($0) {
          continue
         }
         $3 = $1 + 16 | 0;
         $0 = HEAP32[$1 + 16 >> 2];
         if ($0) {
          continue
         }
         break;
        };
        HEAP32[$6 >> 2] = 0;
        break block8;
       }
       HEAP32[$5 + 4 >> 2] = $0 & -2;
       HEAP32[$2 + 4 >> 2] = $4 | 1;
       HEAP32[$2 + $4 >> 2] = $4;
       break block10;
      }
      $1 = 0;
     }
     if (!$7) {
      break block7
     }
     $0 = HEAP32[$5 + 28 >> 2];
     $3 = $0 << 2;
     block11 : {
      if (($5 | 0) == HEAP32[$3 + 6288 >> 2]) {
       HEAP32[$3 + 6288 >> 2] = $1;
       if ($1) {
        break block11
       }
       HEAP32[1497] = HEAP32[1497] & __wasm_rotl_i32($0);
       break block7;
      }
      block12 : {
       if (($5 | 0) == HEAP32[$7 + 16 >> 2]) {
        HEAP32[$7 + 16 >> 2] = $1;
        break block12;
       }
       HEAP32[$7 + 20 >> 2] = $1;
      }
      if (!$1) {
       break block7
      }
     }
     HEAP32[$1 + 24 >> 2] = $7;
     $0 = HEAP32[$5 + 16 >> 2];
     if ($0) {
      HEAP32[$1 + 16 >> 2] = $0;
      HEAP32[$0 + 24 >> 2] = $1;
     }
     $0 = HEAP32[$5 + 20 >> 2];
     if (!$0) {
      break block7
     }
     HEAP32[$1 + 20 >> 2] = $0;
     HEAP32[$0 + 24 >> 2] = $1;
    }
    HEAP32[$2 + 4 >> 2] = $4 | 1;
    HEAP32[$2 + $4 >> 2] = $4;
    if (($2 | 0) != ($8 | 0)) {
     break block10
    }
    HEAP32[1498] = $4;
    break block;
   }
   if ($4 >>> 0 <= 255) {
    $0 = ($4 & 248) + 6024 | 0;
    $3 = HEAP32[1496];
    $1 = 1 << ($4 >>> 3);
    block13 : {
     if (!($3 & $1)) {
      HEAP32[1496] = $1 | $3;
      $3 = $0;
      break block13;
     }
     $3 = HEAP32[$0 + 8 >> 2];
    }
    HEAP32[$0 + 8 >> 2] = $2;
    HEAP32[$3 + 12 >> 2] = $2;
    HEAP32[$2 + 12 >> 2] = $0;
    HEAP32[$2 + 8 >> 2] = $3;
    break block;
   }
   $1 = 31;
   if ($4 >>> 0 <= 16777215) {
    $0 = Math_clz32($4 >>> 8 | 0);
    $1 = ($4 >>> 38 - $0 & 1 | $0 << 1) ^ 62;
   }
   HEAP32[$2 + 28 >> 2] = $1;
   HEAP32[$2 + 16 >> 2] = 0;
   HEAP32[$2 + 20 >> 2] = 0;
   $3 = ($1 << 2) + 6288 | 0;
   block16 : {
    block15 : {
     $0 = HEAP32[1497];
     $6 = 1 << $1;
     block14 : {
      if (!($0 & $6)) {
       HEAP32[1497] = $0 | $6;
       HEAP32[$3 >> 2] = $2;
       $1 = 24;
       break block14;
      }
      $1 = $4 << (($1 | 0) != 31 ? 25 - ($1 >>> 1 | 0) | 0 : 0);
      $3 = HEAP32[$3 >> 2];
      while (1) {
       $0 = $3;
       if ((HEAP32[$0 + 4 >> 2] & -8) == ($4 | 0)) {
        break block15
       }
       $3 = $1 >>> 29 | 0;
       $1 = $1 << 1;
       $6 = ($3 & 4) + $0 | 0;
       $3 = HEAP32[$6 + 16 >> 2];
       if ($3) {
        continue
       }
       break;
      };
      HEAP32[$6 + 16 >> 2] = $2;
      $3 = $0;
      $1 = 24;
     }
     $4 = 8;
     $0 = $2;
     $6 = $0;
     break block16;
    }
    $3 = HEAP32[$0 + 8 >> 2];
    HEAP32[$3 + 12 >> 2] = $2;
    HEAP32[$0 + 8 >> 2] = $2;
    $4 = 24;
    $1 = 8;
    $6 = 0;
   }
   HEAP32[$1 + $2 >> 2] = $3;
   HEAP32[$2 + 12 >> 2] = $0;
   HEAP32[$2 + $4 >> 2] = $6;
   $0 = HEAP32[1504] - 1 | 0;
   HEAP32[1504] = $0 ? $0 : -1;
  }
 }
 
 function _emscripten_tempret_set($0) {
  $0 = $0 | 0;
  tempRet0 = $0;
 }
 
 function _emscripten_tempret_get() {
  return tempRet0 | 0;
 }
 
 function _emscripten_stack_restore($0) {
  $0 = $0 | 0;
  __stack_pointer = $0;
 }
 
 function _emscripten_stack_alloc($0) {
  $0 = $0 | 0;
  $0 = __stack_pointer - $0 & -16;
  __stack_pointer = $0;
  return $0 | 0;
 }
 
 function emscripten_stack_get_current() {
  return __stack_pointer | 0;
 }
 
 function setThrew($0, $1) {
  $0 = $0 | 0;
  $1 = $1 | 0;
  if (!HEAP32[1621]) {
   HEAP32[1622] = $1;
   HEAP32[1621] = $0;
  }
 }
 
 function __wasm_ctz_i32($0) {
  if ($0) {
   return 31 - Math_clz32($0 - 1 ^ $0) | 0
  }
  return 32;
 }
 
 function __wasm_rotl_i32($0) {
  var $1 = 0;
  $1 = $0 & 31;
  $0 = 0 - $0 & 31;
  return (-1 >>> $1 & -2) << $1 | (-1 << $0 & -2) >>> $0;
 }
 
 // EMSCRIPTEN_END_FUNCS
;
 bufferView = HEAPU8;
 initActiveSegments(imports);
 var FUNCTION_TABLE = Table([null, ymfm__ymfm_interface___ymfm_interface__, ymfm__ymfm_interface___ymfm_interface___10, ymfm__ymfm_interface__ymfm_sync_mode_write_unsigned_char_, ymfm__ymfm_interface__ymfm_sync_check_interrupts__, ymfm__ymfm_interface__ymfm_set_timer_unsigned_int__int_, ymfm__ymfm_interface__ymfm_set_busy_end_unsigned_int_, ymfm__ymfm_interface__ymfm_is_busy__, ymfm__ymfm_interface__ymfm_set_busy_end_unsigned_int_, ymfm__ymfm_interface__ymfm_external_read_ymfm__access_class__unsigned_int_, ymfm__ymfm_interface__ymfm_external_write_ymfm__access_class__unsigned_int__unsigned_char_, ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base__, ymfm__fm_engine_base_ymfm__opm_registers____fm_engine_base___19, ymfm__fm_engine_base_ymfm__opm_registers___engine_timer_expired_unsigned_int_, ymfm__fm_engine_base_ymfm__opm_registers___engine_check_interrupts__, ymfm__fm_engine_base_ymfm__opm_registers___engine_mode_write_unsigned_char_]);
 function __wasm_memory_size() {
  return buffer.byteLength >> 16;
 }
 
 return {
  "memory": Object.create(Object.prototype, {
   "grow": {
    
   }, 
   "buffer": {
    "get": function () {
     return buffer;
    }
    
   }
  }), 
  "__wasm_call_ctors": __wasm_call_ctors, 
  "fm_create": fm_create, 
  "fm_destroy": fm_destroy, 
  "fm_write": fm_write, 
  "fm_sample": fm_sample, 
  "__indirect_function_table": FUNCTION_TABLE, 
  "setThrew": setThrew, 
  "__get_temp_ret": _emscripten_tempret_get, 
  "__set_temp_ret": _emscripten_tempret_set, 
  "_emscripten_stack_restore": _emscripten_stack_restore, 
  "_emscripten_stack_alloc": _emscripten_stack_alloc, 
  "emscripten_stack_get_current": emscripten_stack_get_current
 };
}

  return asmFunc(info);
}

)(info);
  },
  instantiate: /** @suppress{checkTypes} */ function(binary, info) {
    return {
      then: function(ok) {
        var module = new WebAssembly.Module(binary);
        ok({
          "instance": new WebAssembly.Instance(module, info)
        });
      }
    };
  },
  RuntimeError: Error,
  isWasm2js: true
};

// end include: wasm2js.js
if (WebAssembly.isWasm2js) {
  // We don't need to actually download a wasm binary, mark it as present but
  // empty.
  wasmBinary = [];
}

// Wasm globals
//========================================
// Runtime essentials
//========================================
// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// include: runtime_common.js
// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH {}

class EmscriptenSjLj extends EmscriptenEH {}

// end include: runtime_exceptions.js
// include: runtime_debug.js
// end include: runtime_debug.js
// Memory management
var runtimeInitialized = false;

function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAPU8 = new Uint8Array(b);
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
function preRun() {
  var preRun = Module["preRun"];
  if (preRun) {
    if (typeof preRun === "function") preRun = [ preRun ];
    onPreRuns.push(...preRun);
  }
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
}

function initRuntime() {
  runtimeInitialized = true;
  // No ATINITS hooks
  wasmExports["__wasm_call_ctors"]();
}

function postRun() {
  var postRun = Module["postRun"];
  if (postRun) {
    if (typeof postRun === "function") postRun = [ postRun ];
    onPostRuns.push(...postRun);
  }
  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
}

/**
 * @param {string|number=} what
 */ function abort(what) {
  Module["onAbort"]?.(what);
  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);
  ABORT = true;
  what += ". Build with -sASSERTIONS for more info.";
  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.
  throw new WebAssembly.RuntimeError(what);
}

var wasmBinaryFile;

// When building with wasm2js these 3 functions all no-ops.
function findWasmBinary(file) {}

function getBinarySync(file) {}

function instantiateSync(file, info) {
  var binary = getBinarySync(file);
  var module = new WebAssembly.Module(binary);
  var instance = new WebAssembly.Instance(module, info);
  return [ instance, module ];
}

function getWasmImports() {
  // prepare imports
  var imports = {
    "env": wasmImports,
    "wasi_snapshot_preview1": wasmImports
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance) {
    wasmExports = instance.exports;
    assignWasmExports(wasmExports);
    updateMemoryViews();
    return wasmExports;
  }
  // Prefer streaming instantiation if available.
  var info = getWasmImports();
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  var instantiateWasm = Module["instantiateWasm"];
  if (instantiateWasm) {
    return new Promise(resolve => {
      instantiateWasm(info, inst => resolve(receiveInstance(inst)));
    });
  }
  wasmBinaryFile ??= findWasmBinary();
  var result = instantiateSync(wasmBinaryFile, info);
  // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193,
  // the above line no longer optimizes out down to the following line.
  // When the regression is fixed, we can remove this if/else.
  return receiveInstance(result[0]);
}

// end include: preamble.js
// Begin JS library code
class ExitStatus {
  name="ExitStatus";
  constructor(status) {
    this.message = `Program terminated with exit(${status})`;
    this.status = status;
  }
}

var callRuntimeCallbacks = callbacks => {
  while (callbacks.length > 0) {
    // Pass the module as the first argument.
    callbacks.shift()(Module);
  }
};

var onPostRuns = [];

var onPreRuns = [];

var noExitRuntime = true;

var UTF8Decoder = globalThis.TextDecoder && new TextDecoder;

/**
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul
   * @return {number}
   */ var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
  var maxIdx = idx + maxBytesToRead;
  if (ignoreNul) return maxIdx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on
  // null terminator by itself.
  // As a tiny code save trick, compare idx against maxIdx using a negation,
  // so that maxBytesToRead=undefined/NaN means Infinity.
  while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
  return idx;
};

/**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */ var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
  if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
    return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
  }
  var str = "";
  while (idx < endPtr) {
    // For UTF8 byte structure, see:
    // http://en.wikipedia.org/wiki/UTF-8#Description
    // https://www.ietf.org/rfc/rfc2279.txt
    // https://tools.ietf.org/html/rfc3629
    var u0 = heapOrArray[idx++];
    if (!(u0 & 128)) {
      str += String.fromCharCode(u0);
      continue;
    }
    var u1 = heapOrArray[idx++] & 63;
    if ((u0 & 224) == 192) {
      str += String.fromCharCode(((u0 & 31) << 6) | u1);
      continue;
    }
    var u2 = heapOrArray[idx++] & 63;
    if ((u0 & 240) == 224) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
    }
    if (u0 < 65536) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 65536;
      str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
    }
  }
  return str;
};

/** @type {!Uint8Array} */ var HEAPU8;

/**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */ var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";

var ___assert_fail = (condition, filename, line, func) => abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);

var __abort_js = () => abort("");

var abortOnCannotGrowMemory = requestedSize => {
  abort("OOM");
};

var _emscripten_resize_heap = requestedSize => {
  var oldSize = HEAPU8.length;
  // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
  requestedSize >>>= 0;
  abortOnCannotGrowMemory(requestedSize);
};

// End JS library code
// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.
{
  // Begin ATMODULES hooks
  if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
  if (Module["print"]) out = Module["print"];
  if (Module["printErr"]) err = Module["printErr"];
  if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
  // End ATMODULES hooks
  if (Module["arguments"]) programArgs = Module["arguments"];
  if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
  var preInit = Module["preInit"];
  if (preInit) {
    if (typeof preInit === "function") Module["preInit"] = preInit = [ preInit ];
    // Written as a loop so that preInit functions that themselves add more
    // preInit functions.  Is this actually needed?
    while (preInit.length > 0) {
      preInit.shift()();
    }
  }
}

// Begin runtime exports
// End runtime exports
// Begin JS library exports
// End JS library exports
// end include: postlibrary.js
// Imports from the Wasm binary.
var _fm_create, _fm_destroy, _fm_write, _fm_sample, _setThrew, ___get_temp_ret, ___set_temp_ret, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, memory, __indirect_function_table, wasmMemory;

function assignWasmExports(wasmExports) {
  _fm_create = Module["_fm_create"] = wasmExports["fm_create"];
  _fm_destroy = Module["_fm_destroy"] = wasmExports["fm_destroy"];
  _fm_write = Module["_fm_write"] = wasmExports["fm_write"];
  _fm_sample = Module["_fm_sample"] = wasmExports["fm_sample"];
  _setThrew = wasmExports["setThrew"];
  ___get_temp_ret = wasmExports["__get_temp_ret"];
  ___set_temp_ret = wasmExports["__set_temp_ret"];
  __emscripten_stack_restore = wasmExports["_emscripten_stack_restore"];
  __emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"];
  _emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"];
  memory = wasmMemory = wasmExports["memory"];
  __indirect_function_table = wasmExports["__indirect_function_table"];
}

var wasmImports = {
  /** @export */ __assert_fail: ___assert_fail,
  /** @export */ _abort_js: __abort_js,
  /** @export */ emscripten_resize_heap: _emscripten_resize_heap
};

// include: postamble.js
// === Auto-generated postamble setup entry stuff ===
async function run() {
  preRun();
  var setStatus = Module["setStatus"];
  if (setStatus) {
    setStatus("Running...");
    // Yield to the event loop to allow the browser to paint "Running..."
    await new Promise(resolve => setTimeout(resolve, 1));
    // Then we want to clear the status text, but only after the rest of this function runs.
    setTimeout(setStatus, 1, "");
  }
  if (ABORT) return;
  initRuntime();
  Module["onRuntimeInitialized"]?.();
  postRun();
}

var wasmExports;

// In modularize mode the generated code is within a factory function so we
// can use await here (since it's not top-level-await).
wasmExports = createWasm();

await run();


  return Module;
}

// Export using a UMD style export, or ES6 exports if selected
export default Module;

