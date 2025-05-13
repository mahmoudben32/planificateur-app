import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (): Observable<boolean> => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Observable<boolean>((observer) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        observer.next(true); // Autoriser l'accès
        observer.complete();
      } else {
        router.navigate(['/login']); // Rediriger vers la connexion
        observer.next(false); // Refuser l'accès
        observer.complete();
      }
    });
  });
};