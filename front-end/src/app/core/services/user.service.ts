import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserCreateDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  /** Membros da mesma conta (para responsável em métodos de pagamento). */
  list(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  create(body: UserCreateDto): Observable<User> {
    return this.http.post<User>(this.base, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
