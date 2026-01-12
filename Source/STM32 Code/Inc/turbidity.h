#ifndef INC_TURBIDITY_H_
#define INC_TURBIDITY_H_

#include "stm32f1xx_hal.h"

/* ================= USER CONFIG ================= */
#define VREF        3.3f
#define ADC_RES     4096.0f
#define TEMP        25.0f
#define SAMPLES     30
#define TDS_OFFSET  800.0f
/* ============================================== */

typedef struct
{
    ADC_HandleTypeDef *hadc;
    uint32_t channel;
    uint32_t samples[SAMPLES];
} Turbidity_t;

/* API */
void TURBIDITY_Init(Turbidity_t *dev, ADC_HandleTypeDef *hadc, uint32_t channel);
float TURBIDITY_Read(Turbidity_t *dev);

float turbidity_get_voltage_raw(uint32_t adc_raw);
float turbidity_calculate_tds(float voltage);

#endif /* INC_TURBIDITY_H_ */
