/*
 * temp_delay.h
 *
 *  Created on: Dec 7, 2025
 *      Author: PC
 */

#ifndef INC_TEMP_DELAY_H_
#define INC_TEMP_DELAY_H_

#include "stm32f1xx.h"


typedef struct
{
    TIM_HandleTypeDef *Timer;     // Timer dùng để tạo delay us
    GPIO_TypeDef *PORT;           // GPIO port
    uint16_t Pin;                 // GPIO pin
    float Temp;                   // Nhiệt độ đọc được
} TempSensor_t;

extern TempSensor_t tempSensor;

// DS18B20 command
#define TEMP_SKIPROM      0xCC
#define TEMP_CONVERT_T    0x44
#define TEMP_READSCRATCH  0xBE

// API public
void Temp_Init(TempSensor_t *dev, TIM_HandleTypeDef *timer, GPIO_TypeDef *port, uint16_t pin);
float Temp_Read(TempSensor_t *dev);



#endif /* INC_TEMP_DELAY_H_ */
