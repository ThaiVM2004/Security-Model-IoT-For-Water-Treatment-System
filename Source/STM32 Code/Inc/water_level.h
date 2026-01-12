#ifndef INC_WATER_LEVEL_H_
#define INC_WATER_LEVEL_H_

#include "stm32f1xx_hal.h"

/* ========= STRUCT DEVICE ========= */
// trong water_level.h, trong typedef struct HCSR04_t
typedef struct {
    TIM_HandleTypeDef *htim;
    uint32_t tim_channel;
    GPIO_TypeDef *trig_port;
    uint16_t trig_pin;
    uint32_t distance_cm;

    /* per-instance capture state */
    uint32_t ic_val1;
    uint32_t ic_val2;
    uint32_t difference;
    uint8_t  is_first_captured;
} HCSR04_t;



/* ========= API ========= */

/* Gán timer + channel + GPIO từ main */
void HCSR04_Init(HCSR04_t *dev,
                 TIM_HandleTypeDef *htim,
                 uint32_t channel,
                 GPIO_TypeDef *trig_port,
                 uint16_t trig_pin);

/* Phát xung trigger 10us */
void HCSR04_Trigger(HCSR04_t *dev);

/* Lấy khoảng cách (cm) */
uint32_t HCSR04_GetDistance(HCSR04_t *dev);

/* Gọi trong HAL_TIM_IC_CaptureCallback */
void HCSR04_TIM_IC_Callback(HCSR04_t *dev, TIM_HandleTypeDef *htim);

#endif /* INC_WATER_LEVEL_H_ */
