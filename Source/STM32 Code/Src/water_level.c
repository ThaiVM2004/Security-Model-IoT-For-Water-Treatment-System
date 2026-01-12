#include "water_level.h"

/* ================= LOCAL MICRO DELAY ================= */

static void HCSR04_DelayUs(HCSR04_t *dev, uint16_t us)
{
    if (dev == NULL || dev->htim == NULL) return;

    __HAL_TIM_SET_COUNTER(dev->htim, 0);
    while (__HAL_TIM_GET_COUNTER(dev->htim) < us);
}

/* ================= PUBLIC API ================= */

void HCSR04_Init(HCSR04_t *dev,
                 TIM_HandleTypeDef *htim,
                 uint32_t channel,
                 GPIO_TypeDef *trig_port,
                 uint16_t trig_pin)
{
    if (dev == NULL) return;

    dev->htim        = htim;
    dev->tim_channel = channel;
    dev->trig_port   = trig_port;
    dev->trig_pin    = trig_pin;
    dev->distance_cm = 0;

    /* per-instance capture state */
    dev->ic_val1 = 0;
    dev->ic_val2 = 0;
    dev->difference = 0;
    dev->is_first_captured = 0;

    /* start IC interrupts for the timer channel */
    HAL_TIM_IC_Start_IT(htim, channel);
}

void HCSR04_Trigger(HCSR04_t *dev)
{
    if (dev == NULL || dev->htim == NULL) return;

    HAL_GPIO_WritePin(dev->trig_port, dev->trig_pin, GPIO_PIN_SET);
    HCSR04_DelayUs(dev, 10);
    HAL_GPIO_WritePin(dev->trig_port, dev->trig_pin, GPIO_PIN_RESET);

    __HAL_TIM_ENABLE_IT(dev->htim, TIM_IT_CC1);
}

/* NOTE:
   - htim is the TIM_HandleTypeDef pointer for which the capture interrupt fired.
   - dev->tim_channel is the TIM channel constant (e.g. TIM_CHANNEL_1).
*/
void HCSR04_TIM_IC_Callback(HCSR04_t *dev, TIM_HandleTypeDef *htim)
{
    if (dev == NULL || htim == NULL) return;
    if (htim != dev->htim) return;

    /* Read captured value using dev->tim_channel */
    if (dev->is_first_captured == 0)
    {
        dev->ic_val1 = HAL_TIM_ReadCapturedValue(htim, dev->tim_channel);
        dev->is_first_captured = 1;

        /* switch to capture falling edge */
        __HAL_TIM_SET_CAPTUREPOLARITY(dev->htim, dev->tim_channel, TIM_INPUTCHANNELPOLARITY_FALLING);
    }
    else
    {
        dev->ic_val2 = HAL_TIM_ReadCapturedValue(htim, dev->tim_channel);
        __HAL_TIM_SET_COUNTER(dev->htim, 0);

        if (dev->ic_val2 > dev->ic_val1)
            dev->difference = dev->ic_val2 - dev->ic_val1;
        else
            dev->difference = (0xFFFF - dev->ic_val1) + dev->ic_val2;

        dev->distance_cm = (uint32_t)(dev->difference * 0.034f / 2.0f);

        dev->is_first_captured = 0;

        /* restore to rising edge and disable CC interrupt until next trigger */
        __HAL_TIM_SET_CAPTUREPOLARITY(dev->htim, dev->tim_channel, TIM_INPUTCHANNELPOLARITY_RISING);
        __HAL_TIM_DISABLE_IT(dev->htim, TIM_IT_CC1);
    }
}

uint32_t HCSR04_GetDistance(HCSR04_t *dev)
{
    if (dev == NULL) return 0;
    return dev->distance_cm;
}
