import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Expense,
  ExpenseCancelDto,
  ExpenseCreateInstallmentDto,
  ExpenseCreateSingleDto,
  ExpenseFilterParams,
  ExpenseMarkPaidDto,
  ExpenseUncancelDto,
  ExpenseUpdateDto,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expenses`;

  list(filters?: ExpenseFilterParams): Observable<Expense[]> {
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters?.paymentMethodId) params = params.set('paymentMethodId', filters.paymentMethodId);
    if (filters?.responsible) params = params.set('responsible', filters.responsible);
    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.excludeCancelled) params = params.set('excludeCancelled', 'true');
    return this.http.get<Expense[]>(this.base, { params });
  }

  createSingle(body: ExpenseCreateSingleDto): Observable<Expense> {
    return this.http.post<Expense>(this.base, { kind: 'single', ...body });
  }

  createInstallment(body: ExpenseCreateInstallmentDto): Observable<Expense[]> {
    return this.http.post<Expense[]>(this.base, { kind: 'installment', ...body });
  }

  update(id: string, body: ExpenseUpdateDto): Observable<Expense> {
    return this.http.put<Expense>(`${this.base}/${id}`, body);
  }

  markParcelPaid(id: string, body?: ExpenseMarkPaidDto): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}/payment`, body ?? { paymentStatus: 'paid' });
  }

  /** Cancela o gasto (ou todo o parcelamento). Diferente de excluir: mantém histórico. */
  cancel(id: string, body?: ExpenseCancelDto): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}/cancel`, body ?? {});
  }

  /** Descancela (reativa) um gasto ou parcelamento cancelado. */
  uncancel(id: string, body?: ExpenseUncancelDto): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}/uncancel`, body ?? {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
