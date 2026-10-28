export type ExpenseKind = 'single' | 'installment';

/** À vista: sempre pago. Parcela: pendente até marcar. */
export type ExpensePaymentStatus = 'pending' | 'paid';

/** Ativo entra nos totais; cancelado fica no histórico mas não some como gasto ativo. */
export type ExpenseRecordStatus = 'active' | 'cancelled';

export interface Expense {
  id: string;
  userId: number;
  /** Detalhes extras (ex.: posto, loja). O “item” principal é a categoria (ex.: IPVA 2025). */
  description: string;
  /** Valor desta linha (parcela ou gasto único), em centavos */
  amountCents: number;
  /** Data do gasto (à vista) ou vencimento da parcela — yyyy-MM-dd */
  date: string;
  categoryId: string;
  paymentMethodId: string;
  /** ID da pessoa associada a esta despesa (pessoa que fez a compra/transação) */
  personId?: string | null;
  kind: ExpenseKind;
  /** Mesmo UUID em todas as parcelas do mesmo parcelamento */
  installmentGroupId?: string | null;
  /** 1-based */
  installmentIndex?: number | null;
  installmentCount?: number | null;
  paymentStatus: ExpensePaymentStatus;
  /** Data em que a parcela foi paga — yyyy-MM-dd */
  paidAt?: string | null;
  /** Observação ao marcar parcela como paga */
  paidObservation?: string | null;
  recordStatus: ExpenseRecordStatus;
  /** Quando o registro foi cancelado (soft) */
  cancelledAt?: string | null;
  /** Motivo / observação do cancelamento */
  cancellationNote?: string | null;
}

export interface ExpenseCreateSingleDto {
  description: string;
  amountCents: number;
  date: string;
  categoryId: string;
  paymentMethodId: string;
  personId?: string | null;
}

export interface ExpenseCreateInstallmentDto {
  description: string;
  totalAmountCents: number;
  installmentCount: number;
  /** Data de vencimento da 1ª parcela */
  firstDueDate: string;
  categoryId: string;
  paymentMethodId: string;
  personId?: string | null;
}

export interface ExpenseUpdateDto {
  description: string;
  amountCents: number;
  date: string;
  categoryId: string;
  paymentMethodId: string;
  personId?: string | null;
  paymentStatus?: ExpensePaymentStatus;
}

export interface ExpenseMarkPaidDto {
  paymentStatus: ExpensePaymentStatus;
  /** Observação opcional ao quitar a parcela */
  observation?: string;
}

export interface ExpenseCancelDto {
  note?: string;
}

export interface ExpenseUncancelDto {
  note?: string;
}

export interface ExpenseFilterParams {
  from?: string;
  to?: string;
  categoryId?: string;
  paymentMethodId?: string;
  personId?: string;
  responsible?: string;
  q?: string;
  /** Quando true, não retorna gastos com `recordStatus === 'cancelled'` */
  excludeCancelled?: boolean;
}
