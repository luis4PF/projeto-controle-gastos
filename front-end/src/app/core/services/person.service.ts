import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Person, PersonCreateDto, PersonUpdateDto } from '../models/person.model';

@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Person[]>('/api/people');
  }

  create(body: PersonCreateDto) {
    return this.http.post<Person>('/api/people', body);
  }

  update(id: string, body: PersonUpdateDto) {
    return this.http.put<Person>(`/api/people/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`/api/people/${id}`);
  }
}
