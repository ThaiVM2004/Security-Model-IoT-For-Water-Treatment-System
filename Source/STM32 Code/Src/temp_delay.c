/*
 * temp_delay.c
 *
 *  Created on: Dec 7, 2025
 *      Author: PC
 */

#include "temp_delay.h"
#include "cmsis_os.h"


static void TEMP_DelayUs(TempSensor_t *dev, uint16_t us)
{
    __HAL_TIM_SET_COUNTER(dev->Timer, 0);
    while (__HAL_TIM_GET_COUNTER(dev->Timer) < us);
}

/* ==================== GPIO CONTROL ==================== */
static void TEMP_SetPinOut(TempSensor_t *dev)
{
    GPIO_InitTypeDef io = {0};
    io.Pin   = dev->Pin;
    io.Mode  = GPIO_MODE_OUTPUT_PP;
    io.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(dev->PORT, &io);
}

static void TEMP_SetPinIn(TempSensor_t *dev)
{
    GPIO_InitTypeDef io = {0};
    io.Pin  = dev->Pin;
    io.Mode = GPIO_MODE_INPUT;
    io.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(dev->PORT, &io);
}

static void TEMP_WritePin(TempSensor_t *dev, GPIO_PinState val)
{
    HAL_GPIO_WritePin(dev->PORT, dev->Pin, val);
}

static uint8_t TEMP_ReadPin(TempSensor_t *dev)
{
    return HAL_GPIO_ReadPin(dev->PORT, dev->Pin);
}

/* ==================== 1-WIRE LOW-LEVEL ==================== */
static uint8_t TEMP_Reset(TempSensor_t *dev)
{
    uint8_t presence = 0;

    TEMP_SetPinOut(dev);
    TEMP_WritePin(dev, GPIO_PIN_RESET);
    TEMP_DelayUs(dev, 480); //480

    TEMP_SetPinIn(dev);
    TEMP_DelayUs(dev, 70); //70

    presence = (TEMP_ReadPin(dev) == GPIO_PIN_RESET);

    TEMP_DelayUs(dev, 410); //410
    return presence;
}

static void TEMP_WriteByte(TempSensor_t *dev, uint8_t data)
{
    for (uint8_t i = 0; i < 8; i++)
    {
        TEMP_SetPinOut(dev);
        TEMP_WritePin(dev, GPIO_PIN_RESET);
        TEMP_DelayUs(dev, (data & (1 << i)) ? 1 : 50);

        TEMP_SetPinIn(dev);
        TEMP_DelayUs(dev, (data & (1 << i)) ? 55 : 5);
    }
}

static uint8_t TEMP_ReadByte(TempSensor_t *dev)
{
    uint8_t value = 0;

    for (uint8_t i = 0; i < 8; i++)
    {
        TEMP_SetPinOut(dev);
        TEMP_WritePin(dev, GPIO_PIN_RESET);
        TEMP_DelayUs(dev, 2); //2

        TEMP_SetPinIn(dev);
        TEMP_DelayUs(dev, 10); //10

        if (TEMP_ReadPin(dev))
            value |= (1 << i);

        TEMP_DelayUs(dev, 55); //55
    }

    return value;
}

/* ==================== HIGH LEVEL API ==================== */
void Temp_Init(TempSensor_t *dev, TIM_HandleTypeDef *timer, GPIO_TypeDef *port, uint16_t pin)
{
    dev->Timer = timer;
    dev->PORT = port;
    dev->Pin = pin;

    // Khởi động timer 1us
    HAL_TIM_Base_Start(timer);
}

float Temp_Read(TempSensor_t *dev)
{
    uint8_t tempL, tempH;
    int16_t raw;

    if (!TEMP_Reset(dev))
        return -1000.0f;

    TEMP_WriteByte(dev, TEMP_SKIPROM);
    TEMP_WriteByte(dev, TEMP_CONVERT_T);


    osDelay(750);  // Cho phép scheduler chạy task khác

    TEMP_Reset(dev);
    TEMP_WriteByte(dev, TEMP_SKIPROM);
    TEMP_WriteByte(dev, TEMP_READSCRATCH);

    tempL = TEMP_ReadByte(dev);
    tempH = TEMP_ReadByte(dev);

    raw = (tempH << 8) | tempL;
    dev->Temp = raw / 16.0f;

    return dev->Temp;
}


