import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CategoryCreateDto, CategoryUpdateDto } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/categories`;

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.base);
  }

  create(body: CategoryCreateDto): Observable<Category> {
    return this.http.post<Category>(this.base, body);
  }

  update(id: string, body: CategoryUpdateDto): Observable<Category> {
    return this.http.put<Category>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
