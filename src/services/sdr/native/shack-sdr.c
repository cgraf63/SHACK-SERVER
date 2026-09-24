#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <signal.h>
#include <unistd.h>

#include "/usr/local/include/sdrplay_api.h"
#include <pthread.h>

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

/*
 * Laufende Konfiguration, per stdin-Kommando aenderbar.
 */
static pthread_mutex_t cfgMutex = PTHREAD_MUTEX_INITIALIZER;

static volatile int sweepActive = 0;
static volatile int sweepThreadRunning = 0;
static volatile int wantSweepFrame = 0;
static double sweepStart = 1000000.0;
static double sweepStop = 1000000000.0;
static double sweepStep = 2000000.0;

static double currentFreq = CENTER_FREQ;
static double currentFs = SAMPLE_RATE;
static int currentGRdB = GAIN_REDUCTION;
static int currentLNA = 0;

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
             * Sweep mode: compact frame with the hop's
             * center frequency appended, normal stream
             * suppressed.
             */
            if (sweepActive) {

                if (wantSweepFrame) {

                    uint16_t sb = 512;

                    fwrite(&sb, sizeof(sb), 1, stdout);

                    for (int i = 0; i < sb; i++) {

                        float db =
                            (float)power[i * (FFT_SIZE / 512)];

                        fwrite(&db, sizeof(db), 1, stdout);
                    }

                    float cf = (float)currentFreq;

                    fwrite(&cf, sizeof(cf), 1, stdout);
                    fflush(stdout);

                    wantSweepFrame = 0;
                }

                buffered = FFT_SIZE / 2;
                return;
            }

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

static void apply_config(void)
{
    sdrplay_api_ErrT err;

    deviceParams->devParams->fsFreq.fsHz = currentFs;

    deviceParams->rxChannelA->tunerParams.rfFreq.rfHz =
        currentFreq;

    deviceParams->rxChannelA->tunerParams.gain.gRdB =
        currentGRdB;

    deviceParams->rxChannelA->tunerParams.gain.LNAstate =
        currentLNA;

    err = sdrplay_api_Update(
        device.dev,
        sdrplay_api_Tuner_A,
        sdrplay_api_Update_Dev_Fs |
            sdrplay_api_Update_Tuner_Frf |
            sdrplay_api_Update_Tuner_Gr,
        sdrplay_api_Update_Ext1_None
    );

    if (err != sdrplay_api_Success) {
        fprintf(
            stderr,
            "SDR Update failed: %d\n",
            err
        );
    } else {
        fprintf(
            stderr,
            "SDR config: %.3f MHz, %.3f MSPS, gRdB=%d, LNA=%d\n",
            currentFreq / 1000000.0,
            currentFs / 1000000.0,
            currentGRdB,
            currentLNA
        );
    }
}

/*
 * stdin-Kommandos, eine Zeile pro Kommando:
 *
 *   freq <Hz>
 *   gain <gRdB> <LNAstate>
 *   fs <Hz>
 *   stop
 *
 * stdout ist der binaere FFT-Stream und bleibt unberuehrt.
 */
static void *sweep_thread(void *arg)
{
    (void)arg;

    double f = sweepStart;

    while (running && sweepActive) {

        pthread_mutex_lock(&cfgMutex);

        currentFreq = f;
        apply_config();
        wantSweepFrame = 1;

        pthread_mutex_unlock(&cfgMutex);

        /*
         * Wait for the sweep frame of this hop.
         */
        int waited = 0;

        while (running && wantSweepFrame && waited < 400) {
            usleep(10000);
            waited += 10;
        }

        f += sweepStep;

        if (f > sweepStop) {
            f = sweepStart;
        }
    }

    sweepThreadRunning = 0;
    return NULL;
}

static void *stdin_thread(void *arg)
{
    (void)arg;

    char line[256];

    while (running && fgets(line, sizeof(line), stdin)) {

        if (strncmp(line, "sweep_stop", 10) == 0) {

            sweepActive = 0;

        } else if (strncmp(line, "sweep ", 6) == 0) {

            double s1 = 0;
            double s2 = 0;
            double s3 = 0;

            if (sscanf(line + 6, "%lf %lf %lf", &s1, &s2, &s3) == 3) {

                sweepStart = s1;
                sweepStop = s2;

                sweepStep = s3;

                if (sweepStep < 100000.0) {
                    sweepStep = 100000.0;
                }

                sweepActive = 1;

                if (!sweepThreadRunning) {

                    sweepThreadRunning = 1;

                    pthread_t tid;

                    if (pthread_create(&tid, NULL,
                                       sweep_thread, NULL) == 0) {
                        pthread_detach(tid);
                    } else {
                        sweepThreadRunning = 0;
                    }
                }

                fprintf(stderr,
                        "SDR sweep: %.0f - %.0f Hz step %.0f\n",
                        sweepStart, sweepStop, sweepStep);
            }

        } else if (strncmp(line, "freq ", 5) == 0) {

            pthread_mutex_lock(&cfgMutex);
            currentFreq = strtod(line + 5, NULL);
            apply_config();
            pthread_mutex_unlock(&cfgMutex);

        } else if (strncmp(line, "gain ", 5) == 0) {

            int grdb = 0;
            int lna = 0;

            if (sscanf(line + 5, "%d %d", &grdb, &lna) >= 1) {

                if (grdb >= 0 && grdb <= 59) {
                    currentGRdB = grdb;
                }
                if (lna >= 0 && lna <= 8) {
                    currentLNA = lna;
                }

                pthread_mutex_lock(&cfgMutex);
                apply_config();
                pthread_mutex_unlock(&cfgMutex);
            }

        } else if (strncmp(line, "fs ", 3) == 0) {

            pthread_mutex_lock(&cfgMutex);
            currentFs = strtod(line + 3, NULL);
            apply_config();
            pthread_mutex_unlock(&cfgMutex);

        } else if (strncmp(line, "stop", 4) == 0) {

            running = 0;
        }
    }

    return NULL;
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

    pthread_t stdinTid;

    if (pthread_create(&stdinTid, NULL, stdin_thread, NULL) != 0) {
        fprintf(
            stderr,
            "SDR: stdin thread failed\n"
        );
    }

    while (running) {
        usleep(100000);
    }

    running = 0;

    sdrplay_api_Uninit(
        device.dev
    );

    cleanup();

    return 0;
}
