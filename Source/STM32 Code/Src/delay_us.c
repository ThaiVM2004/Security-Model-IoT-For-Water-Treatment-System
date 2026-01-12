/*
 * delay_us.c
 *
 *  Created on: Dec 4, 2025
 *      Author: PC
 */
#include "delay_us.h"
extern TIM_HandleTypeDef htim1; //sua lai phu hop voi timer trong file

void delay_us (uint32_t us) {
    __HAL_TIM_SET_COUNTER(&htim1,0);
    while (__HAL_TIM_GET_COUNTER(&htim1) < us);
}


