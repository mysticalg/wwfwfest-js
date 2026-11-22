// Thin synthesis bridge for the BSD-licensed ymfm OPM renderer.
#include "ymfm_opm.h"

struct FmSynthesizer {
    ymfm::ymfm_interface interface;
    ymfm::ym2151 chip;
    ymfm::ym2151::output_data output;

    FmSynthesizer() : chip(interface) {
        chip.reset();
    }
};

extern "C" {
    FmSynthesizer* fm_create() {
        return new FmSynthesizer();
    }

    void fm_destroy(FmSynthesizer* synthesizer) {
        delete synthesizer;
    }

    void fm_write(FmSynthesizer* synthesizer, int address, int value) {
        synthesizer->chip.write_address(address);
        synthesizer->chip.write_data(value);
    }

    int fm_sample(FmSynthesizer* synthesizer) {
        synthesizer->chip.generate(&synthesizer->output);
        return synthesizer->output.data[0] + synthesizer->output.data[1];
    }
}
