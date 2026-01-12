#ifndef TEMP_H
#define TEMP_H

#include "stm32f1xx_hal.h"

#include "stm32f1xx_hal.h"

extern UART_HandleTypeDef huart1;

int DS18B20_Start(void);
void DS18B20_Write(uint8_t data);
uint8_t DS18B20_Read(void);
float DS18B20_GetTemperature(void);


void DS18B20_RxCpltCallback(UART_HandleTypeDef *huart);

#endif /* TEMP_H */
