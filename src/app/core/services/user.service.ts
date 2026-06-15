import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/user.model';
import { USERS_MOCK } from '../mocks/users.mock';

@Injectable({ providedIn: 'root' })
export class UserService {
  getUsers(): Observable<User[]> {
    return of([...USERS_MOCK]);
  }

  getUserById(id: string): Observable<User | undefined> {
    return of(USERS_MOCK.find((u) => u.id === id));
  }
}
