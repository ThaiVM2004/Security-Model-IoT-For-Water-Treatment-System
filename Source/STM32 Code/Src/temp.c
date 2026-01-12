#include "temp.h"

static uint8_t RxData[8];
static uint8_t Temp_LSB, Temp_MSB;
static volatile uint8_t isRxed = 0;



// UART half-duplex init lại theo yêu cầu DS18B20
static void uart_Init(uint32_t baud)
{
    huart1.Instance = USART1;
    huart1.Init.BaudRate = baud;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;

    HAL_HalfDuplex_Init(&huart1);
}

int DS18B20_Start(void)
{
    uint8_t data = 0xF0;

    uart_Init(9600);
    HAL_UART_Transmit(&huart1, &data, 1, 100);

    if (HAL_UART_Receive(&huart1, &data, 1, 1000) != HAL_OK)
        return -1;

    uart_Init(115200);
    if (data == 0xF0) return -2;

    return 1;
}

void DS18B20_Write(uint8_t data)
{
    uint8_t buffer[8];

    for (int i = 0; i < 8; i++)
        buffer[i] = (data & (1 << i)) ? 0xFF : 0x00;

    HAL_UART_Transmit(&huart1, buffer, 8, 100);
}

uint8_t DS18B20_Read(void)
{
    uint8_t buffer[8];
    uint8_t value = 0;

    for (int i = 0; i < 8; i++)
        buffer[i] = 0xFF;

    HAL_UART_Transmit_DMA(&huart1, buffer, 8);
    HAL_UART_Receive_DMA(&huart1, RxData, 8);

    while (!isRxed);
    isRxed = 0;

    for (int i = 0; i < 8; i++)
        if (RxData[i] == 0xFF)
            value |= 1 << i;

    return value;
}

float DS18B20_GetTemperature(void)
{
    if (DS18B20_Start() < 0) return -1000;
    DS18B20_Write(0xCC);
    DS18B20_Write(0x44);


    if (DS18B20_Start() < 0) return -1000;
    DS18B20_Write(0xCC);
    DS18B20_Write(0xBE);

    Temp_LSB = DS18B20_Read();
    Temp_MSB = DS18B20_Read();
    int16_t temp_raw = (Temp_MSB << 8) | Temp_LSB;

    return temp_raw / 16.0f;
}

// Callback dùng cho DMA
void DS18B20_RxCpltCallback(UART_HandleTypeDef *huart)
{
    if (huart->Instance == USART1)
        isRxed = 1;
}
