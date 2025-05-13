import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';

import { getFirestore, provideFirestore } from '@angular/fire/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyAop-7jh9zfTUvu9ruAsOtW-4dUjNj8xh8",
  authDomain: "projet-planificateur.firebaseapp.com",
  projectId: "projet-planificateur",
  storageBucket: "projet-planificateur.firebasestorage.app",
  messagingSenderId: "644793659520",
  appId: "1:644793659520:web:9b02facc0d72faf558b665",
  measurementId: "G-RKHZV9BT1X"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'fr' },
    importProvidersFrom(HttpClientModule),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ]
};