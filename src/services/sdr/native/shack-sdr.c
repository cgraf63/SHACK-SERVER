#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <signal.h>
#include <unistd.h>

#include "/usr/local/include/sdrplay_api.h"

#define SAMPLE_RATE 2000000.0
#define CENTER_FREQ 14100000.0
#define BANDWIDTH sdrplay_api_BW_1_536
#define GAIN_REDUCTION 40
#define FFT_SIZE 8192

static volatile sig_atomic_t running = 1;

static sdrplay_api_DeviceT device;
static sdrplay_api_DeviceParamsT *deviceParams = NULL;
static int deviceSelected = 0;
static int apiOpened = 0;

static double window[FFT_SIZE];
static double fftRe[FFT_SIZE];
static double fftIm[FFT_SIZE];
static double power[FFT_SIZE];

static void handle_signal(int sig)
{
    (void)sig;
    running = 0;
}

static void fft_compute(void)
{
    int i;
    int j = 0;

    /*
     * Bit-reversal permutation.
     */
    for (i = 0; i < FFT_SIZE; i++) {
        if (i < j) {
            double tmp;

            tmp = fftRe[i];
            fftRe[i] = fftRe[j];
            fftRe[j] = tmp;

            tmp = fftIm[i];
            fftIm[i] = fftIm[j];
            fftIm[j] = tmp;
        }

        int bit = FFT_SIZE >> 1;

        while (j & bit) {
            j ^= bit;
            bit >>= 1;
        }

        j ^= bit;
    }

    /*
     * Iterative radix-2 FFT.
     */
    for (int len = 2; len <= FFT_SIZE; len <<= 1) {

        double angle = -2.0 * M_PI / (double)len;
        double wLenRe = cos(angle);
        double wLenIm = sin(angle);

        for (i = 0; i < FFT_SIZE; i += len) {

            double wRe = 1.0;
            double wIm = 0.0;

            for (j = 0; j < len / 2; j++) {

                int u = i + j;
                int v = i + j + len / 2;

                double vRe =
                    fftRe[v] * wRe -
                    fftIm[v] * wIm;

                double vIm =
                    fftRe[v] * wIm +
                    fftIm[v] * wRe;

                double uRe = fftRe[u];
                double uIm = fftIm[u];

                fftRe[u] = uRe + vRe;
                fftIm[u] = uIm + vIm;

                fftRe[v] = uRe - vRe;
                fftIm[v] = uIm - vIm;

                double nextRe =
                    wRe * wLenRe -
                    wIm * wLenIm;

                double nextIm =
                    wRe * wLenIm +
                    wIm * wLenRe;

                wRe = nextRe;
                wIm = nextIm;
            }
        }
    }

    /*
     * Convert complex FFT output to dB.
     *
     * FFT output is shifted so that DC is in the middle.
     */
    for (i = 0; i < FFT_SIZE; i++) {

        int shifted =
            (i + FFT_SIZE / 2) % FFT_SIZE;

        double re = fftRe[shifted];
        double im = fftIm[shifted];

        power[i] =
            20.0 *
            log10(
                sqrt(re * re + im * im) /
                (double)FFT_SIZE +
                1e-12
            );
    }
}

static void process_samples(
    short *xi,
    short *xq,
    unsigned int count
)
{
    static unsigned int buffered = 0;

    static double sampleRe[FFT_SIZE];
    static double sampleIm[FFT_SIZE];

    for (unsigned int n = 0; n < count; n++) {

        sampleRe[buffered] =
            ((double)xi[n] / 32768.0) *
            window[buffered];

        sampleIm[buffered] =
            ((double)xq[n] / 32768.0) *
            window[buffered];

        buffered++;

        if (buffered >= FFT_SIZE) {

            memcpy(
                fftRe,
                sampleRe,
                sizeof(fftRe)
            );

            memcpy(
                fftIm,
                sampleIm,
                sizeof(fftIm)
            );

            fft_compute();

            /*
             * Binary frame:
             *
             * uint16_t number of bins
             * float   dB value per bin
             *
             * This is an internal IPC stream.
             */
            uint16_t bins = FFT_SIZE;

            fwrite(
                &bins,
                sizeof(bins),
                1,
                stdout
            );

            for (int i = 0; i < FFT_SIZE; i++) {

                float db =
                    (float)power[i];

                fwrite(
                    &db,
                    sizeof(db),
                    1,
                    stdout
                );
            }

            fflush(stdout);

            /*
             * 50% overlap.
             */
            memmove(
                sampleRe,
                sampleRe + FFT_SIZE / 2,
                sizeof(double) * FFT_SIZE / 2
            );

            memmove(
                sampleIm,
                sampleIm + FFT_SIZE / 2,
                sizeof(double) * FFT_SIZE / 2
            );

            buffered = FFT_SIZE / 2;
        }
    }
}

static void stream_callback(
    short *xi,
    short *xq,
    sdrplay_api_StreamCbParamsT *params,
    unsigned int numSamples,
    unsigned int reset,
    void *cbContext
)
{
    (void)params;
    (void)reset;
    (void)cbContext;

    if (!running) {
        return;
    }

    process_samples(
        xi,
        xq,
        numSamples
    );
}

static void event_callback(
    sdrplay_api_EventT eventId,
    sdrplay_api_TunerSelectT tuner,
    sdrplay_api_EventParamsT *params,
    void *cbContext
)
{
    (void)tuner;
    (void)params;
    (void)cbContext;

    /*
     * Do not write status messages to stdout:
     * stdout is the binary FFT stream.
     */
    fprintf(
        stderr,
        "SDR event: %d\n",
        eventId
    );
}

static void cleanup(void)
{
    if (deviceSelected) {

        sdrplay_api_ReleaseDevice(
            &device
        );

        deviceSelected = 0;
    }

    if (apiOpened) {

        sdrplay_api_Close();

        apiOpened = 0;
    }
}

int main(void)
{
    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    /*
     * Hann window.
     */
    for (int i = 0; i < FFT_SIZE; i++) {

        window[i] =
            0.5 *
            (
                1.0 -
                cos(
                    2.0 *
                    M_PI *
                    (double)i /
                    (double)(FFT_SIZE - 1)
                )
            );
    }

    sdrplay_api_ErrT err;

    err = sdrplay_api_Open();

    if (err != sdrplay_api_Success) {
        fprintf(
            stderr,
            "SDRplay API open failed: %d\n",
            err
        );
        return 1;
    }

    apiOpened = 1;

    unsigned int numDevices = 1;

    memset(
        &device,
        0,
        sizeof(device)
    );

    err =
        sdrplay_api_GetDevices(
            &device,
            &numDevices,
            1
        );

    if (
        err != sdrplay_api_Success ||
        numDevices == 0
    ) {
        fprintf(
            stderr,
            "No SDRplay device found\n"
        );

        cleanup();
        return 1;
    }

    fprintf(
        stderr,
        "SDRplay device: %s\n",
        device.SerNo
    );

    fprintf(
        stderr,
        "SDRplay HW version: %d\n",
        device.hwVer
    );

    err =
        sdrplay_api_SelectDevice(
            &device
        );

    if (err != sdrplay_api_Success) {

        fprintf(
            stderr,
            "SelectDevice failed: %d\n",
            err
        );

        cleanup();
        return 1;
    }

    deviceSelected = 1;

    err =
        sdrplay_api_GetDeviceParams(
            device.dev,
            &deviceParams
        );

    if (
        err != sdrplay_api_Success ||
        deviceParams == NULL
    ) {

        fprintf(
            stderr,
            "GetDeviceParams failed: %d\n",
            err
        );

        cleanup();
        return 1;
    }

    /*
     * Device configuration.
     */
    deviceParams->devParams->fsFreq.fsHz =
        SAMPLE_RATE;

    /*
     * RSP1B uses the RSP1A parameter block.
     */
    deviceParams->devParams->rsp1aParams.rfNotchEnable = 0;
    deviceParams->devParams->rsp1aParams.rfDabNotchEnable = 0;

    /*
     * Tuner A configuration.
     */
    deviceParams->rxChannelA->tunerParams.rfFreq.rfHz =
        CENTER_FREQ;

    deviceParams->rxChannelA->tunerParams.bwType =
        BANDWIDTH;

    deviceParams->rxChannelA->tunerParams.ifType =
        sdrplay_api_IF_Zero;

    deviceParams->rxChannelA->tunerParams.loMode =
        sdrplay_api_LO_Auto;

    deviceParams->rxChannelA->tunerParams.gain.gRdB =
        GAIN_REDUCTION;

    deviceParams->rxChannelA->tunerParams.gain.LNAstate =
        0;

    /*
     * Disable AGC so waterfall level remains predictable.
     */
    deviceParams->rxChannelA->ctrlParams.agc.enable =
        sdrplay_api_AGC_DISABLE;

    deviceParams->rxChannelA->ctrlParams.dcOffset.DCenable =
        1;

    deviceParams->rxChannelA->ctrlParams.dcOffset.IQenable =
        1;

    sdrplay_api_CallbackFnsT callbacks;

    memset(
        &callbacks,
        0,
        sizeof(callbacks)
    );

    callbacks.StreamACbFn =
        stream_callback;

    callbacks.EventCbFn =
        event_callback;

    err =
        sdrplay_api_Init(
            device.dev,
            &callbacks,
            NULL
        );

    if (err != sdrplay_api_Success) {

        fprintf(
            stderr,
            "SDRplay Init failed: %d\n",
            err
        );

        cleanup();
        return 1;
    }

    fprintf(
        stderr,
        "SDRplay FFT stream started: %.3f MHz\n",
        CENTER_FREQ / 1000000.0
    );

    fprintf(
        stderr,
        "Sample rate: %.3f MSPS\n",
        SAMPLE_RATE / 1000000.0
    );

    fprintf(
        stderr,
        "FFT size: %d\n",
        FFT_SIZE
    );

    while (running) {
        usleep(100000);
    }

    sdrplay_api_Uninit(
        device.dev
    );

    cleanup();

    return 0;
}
