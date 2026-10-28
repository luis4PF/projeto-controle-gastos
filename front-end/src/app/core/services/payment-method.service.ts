import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PaymentMethod,
  PaymentMethodCreateDto,
  PaymentMethodUpdateDto,
} from '../models/payment-method.model';

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payment-methods`;

  list(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(this.base);
  }

  create(body: PaymentMethodCreateDto): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.base, body);
  }

  update(id: string, body: PaymentMethodUpdateDto): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
