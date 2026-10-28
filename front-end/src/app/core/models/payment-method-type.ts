export enum PaymentMethodType {
  Pix = 'PIX',
  DebitCard = 'DEBIT_CARD',
  CreditCard = 'CREDIT_CARD',
  CashBoletoOther = 'CASH_BOLETO_OTHER',
}

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  [PaymentMethodType.Pix]: 'PIX',
  [PaymentMethodType.DebitCard]: 'Cartão de débito',
  [PaymentMethodType.CreditCard]: 'Cartão de crédito',
  [PaymentMethodType.CashBoletoOther]: 'Dinheiro / Boleto / Outros',
};
