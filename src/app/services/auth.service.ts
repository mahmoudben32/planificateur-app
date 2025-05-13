import { inject, Injectable, signal } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, user } from '@angular/fire/auth';
import { first, from, Observable, of, switchMap } from 'rxjs';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { DataService } from './data.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);
    private dataService = inject(DataService);
    currentUser = user(this.auth);
    user = signal<User | null>(null);
    username = signal<string | null>(null);

    constructor() {
        this.auth.onAuthStateChanged(async (user) => {
            this.user.set(user);
            if (user) {
                await this.fetchUsername(user.uid);
            } else {
                this.username.set(null);
            }
        });
    }

    login(email: string, password: string): Observable<void> {
        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
            switchMap((userCredential) => {
                if (userCredential.user) {
                    return from(this.fetchUsername(userCredential.user.uid)).pipe(
                        switchMap(() => of(undefined))
                    );
                } else {
                    return of(undefined);
                }
            })
        );
    }

    logout(): Observable<void> {
        return from(signOut(this.auth));
    }

    getIdToken(): Observable<string | null> {
      return this.currentUser.pipe(
          first(),
          switchMap(user => {
              if (user) {
                  return from(user.getIdToken());
              } else {
                  return of(null);
              }
          })
      );
  }

    private async fetchUsername(uid: string) {
        const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));
        if (userDoc.exists()) {
            this.username.set(userDoc.data()['username']);
        } else {
            this.username.set(null);
        }
        this.dataService.setPlanificateurEmail(this.user()?.email ?? null);
    }
}