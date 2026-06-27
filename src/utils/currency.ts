import type { GymSettings } from '@/features/settings/hooks/useGymSettings'

/**
 * Formatea un monto de dinero con el símbolo correspondiente a la configuración actual
 * @param amount El valor numérico del monto
 * @param settings El objeto de configuración del gimnasio conteniendo la moneda elegida
 */
export const formatMoney = (amount: number, settings?: GymSettings | null): string => {
  const currency = settings?.currency || 'PEN'
  const symbol = currency === 'USD' ? '$' : 'S/.'
  return `${symbol}${Number(amount).toFixed(2)}`
}
