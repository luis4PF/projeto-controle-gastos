/** Pessoa que pode ser associada a uma despesa (ex: familiar, amigo). */
export interface Person {
  id: string;
  userId: number;
  name: string;
  surname: string;
  /** Qual usuário criou esta pessoa */
  createdByUserId: number;
  createdAt: string;
}

/** Criação de nova pessoa */
export interface PersonCreateDto {
  name: string;
  surname: string;
}

/** Atualização de pessoa */
export interface PersonUpdateDto {
  name: string;
  surname: string;
}
