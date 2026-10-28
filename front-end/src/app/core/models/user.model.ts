/** Usuário que pode fazer login. */
export interface User {
  id: number;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Cadastro de novo membro na mesma conta do usuário logado. */
export interface UserCreateDto {
  name: string;
  email: string;
  password: string;
}

export interface UserUpdateDto {
  name: string;
  email: string;
  /** Se omitido ou vazio, mantém a senha atual (apenas no backend real). */
  password?: string;
}
