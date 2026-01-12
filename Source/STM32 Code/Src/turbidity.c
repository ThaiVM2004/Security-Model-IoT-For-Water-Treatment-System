#include "turbidity.h"
#include "cmsis_os.h"

void TURBIDITY_Init(Turbidity_t *dev, ADC_HandleTypeDef *hadc, uint32_t channel)
{
    dev->hadc = hadc;
    dev->channel = channel;
}

/* Convert ADC raw → voltage */
float turbidity_get_voltage_raw(uint32_t adc_raw)
{
    return (adc_raw * VREF) / ADC_RES;
}

/* Convert voltage → TDS */
float turbidity_calculate_tds(float voltage)
{
    float inverted_voltage = VREF - voltage;

    float compensationCoeff = 1.0f + 0.02f * (TEMP - 25.0f);
    float compensationVolt = inverted_voltage / compensationCoeff;

    float tds = (133.42f * compensationVolt * compensationVolt * compensationVolt
              - 255.86f * compensationVolt * compensationVolt
              + 857.39f * compensationVolt) * 0.5f;

    tds -= TDS_OFFSET;
    if (tds < 0) tds = 0;

    return tds;
}

/* Main read function */
float TURBIDITY_Read(Turbidity_t *dev)
{
    if (dev->hadc == NULL) return 0;

    ADC_ChannelConfTypeDef sConfig = {0};
    sConfig.Channel = dev->channel;
    sConfig.Rank = ADC_REGULAR_RANK_1;
    sConfig.SamplingTime = ADC_SAMPLETIME_55CYCLES_5;

    HAL_ADC_ConfigChannel(dev->hadc, &sConfig);

    /* Lấy mẫu */
    for(int i = 0; i < SAMPLES; i++)
    {
        HAL_ADC_Start(dev->hadc);
        if (HAL_ADC_PollForConversion(dev->hadc, 100) == HAL_OK)
            dev->samples[i] = HAL_ADC_GetValue(dev->hadc);

        HAL_ADC_Stop(dev->hadc);
        osDelay(40);
    }

    /* Bubble sort */
    for(int i = 0; i < SAMPLES - 1; i++)
    {
        for(int j = 0; j < SAMPLES - i - 1; j++)
        {
            if(dev->samples[j] > dev->samples[j + 1])
            {
                uint32_t tmp = dev->samples[j];
                dev->samples[j] = dev->samples[j + 1];
                dev->samples[j + 1] = tmp;
            }
        }
    }

    /* Loại 5 nhỏ + 5 lớn */
    uint32_t sum = 0;
    uint32_t count = 0;

    for(int i = 5; i < SAMPLES - 5; i++)
    {
        sum += dev->samples[i];
        count++;
    }

    uint32_t avg = sum / count;

    float raw_volt = turbidity_get_voltage_raw(avg);
    float tds = turbidity_calculate_tds(raw_volt);

    return tds;
}
