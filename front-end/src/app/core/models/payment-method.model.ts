import { PaymentMethodType } from './payment-method-type';

export interface PaymentMethod {
  id: string;
  /** ID do usuário proprietário */
  userId: number;
  type: PaymentMethodType;
  /** Nome amigável (ex: "Nubank crédito") */
  label: string;
  /** Chave PIX quando type === PIX */
  pixKey?: string;
  /** Usuário cadastrado no sistema responsável por esta chave/cartão */
  responsibleUserId: number;
  /** Últimos dígitos para cartões */
  last4Digits?: string;
  /** Bandeira / banco opcional */
  issuer?: string;
}

export interface PaymentMethodCreateDto {
  type: PaymentMethodType;
  label: string;
  pixKey?: string;
  responsibleUserId?: number; // Opcional na criação, será preenchido automaticamente com usuário logado
  last4Digits?: string;
  issuer?: string;
}

export interface PaymentMethodUpdateDto extends PaymentMethodCreateDto {
  responsibleUserId: number; // Obrigatório na atualização
}
