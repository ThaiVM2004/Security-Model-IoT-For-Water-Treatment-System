/*
 * pH.h
 *
 *  Created on: Dec 4, 2025
 *      Author: PC
 */

#ifndef INC_PH_H_
#define INC_PH_H_


#include "stm32f1xx_hal.h"

/* ================= USER CONFIG ================= */
#define PH_VREF        3.3f
#define PH_ADC_RES     4095.0f
#define PH_SAMPLES     15
/* ============================================== */

/* Struct hiệu chuẩn */
typedef struct
{
    float v_ph4;
    float v_ph9;
    float slope;
    float offset;
} PH_Calib_t;

/* ========= API ========= */

/* Gán ADC handle + Channel cho thư viện */
void PH_AttachADC(ADC_HandleTypeDef *hadc, uint32_t channel);

void PH_InitFromTwoPoints(float v1, float ph1, float v2, float ph2);

/* Khởi tạo thông số hiệu chuẩn pH */
void PH_Init(float voltage_pH4, float voltage_pH9);

/* Đọc điện áp đã lọc nhiễu */
float PH_ReadVoltage(void);

/* Đọc giá trị pH */
float PH_ReadValue(void);

#endif /* INC_PH_H_ */



