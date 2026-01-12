/*
 * pH.c
 *
 *  Created on: Dec 9, 2025
 *      Author: PC
 */


#include "pH.h"
#include <stdlib.h>
#include "cmsis_os.h"

/* ================= PRIVATE VAR ================= */

static ADC_HandleTypeDef *ph_adc = NULL;
static uint32_t ph_adc_channel;

static PH_Calib_t ph_calib;
static uint16_t adc_buf[PH_SAMPLES];

/* ================= PRIVATE FUNCTION ================= */

/* Bubble Sort */
static void PH_BubbleSort(uint16_t *arr, uint8_t size)
{
    for(uint8_t i = 0; i < size - 1; i++)
    {
        for(uint8_t j = 0; j < size - i - 1; j++)
        {
            if(arr[j] > arr[j + 1])
            {
                uint16_t tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}

/* Median Filter */
static uint16_t PH_MedianFilter(uint16_t *buffer, uint8_t size)
{
    PH_BubbleSort(buffer, size);

    if(size % 2 == 1)
        return buffer[size / 2];
    else
        return (buffer[size / 2] + buffer[size / 2 - 1]) / 2;
}

/* ================= PUBLIC FUNCTION ================= */

void PH_AttachADC(ADC_HandleTypeDef *hadc, uint32_t channel)
{
    ph_adc = hadc;
    ph_adc_channel = channel;
}

void PH_Init(float voltage_pH4, float voltage_pH9)
{
    ph_calib.v_ph4 = voltage_pH4;
    ph_calib.v_ph9 = voltage_pH9;

    ph_calib.slope  = (9.18f - 4.0f) / (voltage_pH9 - voltage_pH4);
    ph_calib.offset = 4.0f - (ph_calib.slope * voltage_pH4);
}
void PH_InitFromTwoPoints(float v1, float ph1, float v2, float ph2)
{
    ph_calib.slope  = (ph2 - ph1) / (v2 - v1);
    ph_calib.offset = ph1 - ph_calib.slope * v1;
}
float PH_ReadVoltage(void)
{
    if(ph_adc == NULL) return 0;

    ADC_ChannelConfTypeDef sConfig = {0};
    sConfig.Channel = ph_adc_channel;
    sConfig.Rank = ADC_REGULAR_RANK_1;
    sConfig.SamplingTime = ADC_SAMPLETIME_55CYCLES_5;

    HAL_ADC_ConfigChannel(ph_adc, &sConfig);

    for(uint8_t i = 0; i < PH_SAMPLES; i++)
    {
        HAL_ADC_Start(ph_adc);
        HAL_ADC_PollForConversion(ph_adc, 50);
        adc_buf[i] = HAL_ADC_GetValue(ph_adc);
        HAL_ADC_Stop(ph_adc);
        osDelay(10);
    }

    uint16_t adc_median = PH_MedianFilter(adc_buf, PH_SAMPLES);

    return ((float)adc_median * PH_VREF) / PH_ADC_RES;
}

float PH_ReadValue(void)
{
    float voltage = PH_ReadVoltage();
    float ph = (ph_calib.slope * voltage) + ph_calib.offset;

    if(ph < 0.0f)  ph = 0.0f;
    if(ph > 14.0f) ph = 14.0f;

    return ph;
}


