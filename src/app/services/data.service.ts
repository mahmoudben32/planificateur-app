import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';

import { Livreur, livreurSchema } from '../../models/interfaces/livreur.model';
import { EquipeLivreurs, equipeLivreursSchema } from '../../models/interfaces/equipe-livreurs.model';
import { Commande, commandeSchema } from '../../models/interfaces/commande.model';
import { EtatCommande } from '../../models/enums/etat-commande.enum';
import { Journee, JourneePostDto, journeeSchema } from '../../models/interfaces/journee.model';
import { Camion, camionSchema } from '../../models/interfaces/camion.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private _isDataLoaded$ = new BehaviorSubject<boolean>(false);
  readonly isDataLoaded$ = this._isDataLoaded$.asObservable();

  private apiBaseUrl = 'http://localhost:8080';
  // private apiBaseUrl = '';

  private apiUrl(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    return this.apiBaseUrl + path;
  }

  planificateurEmail = signal<string | null>(null);

  setPlanificateurEmail(email: string|null) {
    this.planificateurEmail.set(email);
  }

  constructor() {
    forkJoin({
      livreurs:   this.http.get<Livreur[]>(this.apiUrl('/api/livreurs')).pipe(
        map(r => livreurSchema.array().parse(r)),
        catchError(() => of([] as Livreur[]))
      ),
      equipes:    this.http.get<EquipeLivreurs[]>(this.apiUrl('/api/equipes')).pipe(
        map(r => equipeLivreursSchema.array().parse(r)),
        catchError(() => of([] as EquipeLivreurs[]))
      ),
      journees:   this.http.get<Journee[]>(this.apiUrl('/api/journees')).pipe(
        map(r => journeeSchema.array().parse(r)),
        catchError(() => of([] as Journee[]))
      ),
      commandes: this.http.get<Commande[]>(this.apiUrl('/api/commandes')).pipe(
        map(r => commandeSchema.array().parse(r)),
        catchError(() => of([] as Commande[]))
      ),
      camions: this.http.get<Camion[]>(this.apiUrl('/api/camions')).pipe(
        map(r => camionSchema.array().parse(r)),
        catchError(() => of([] as Camion[]))
      )
    }).subscribe({
      next: () => {
        this.refreshLivreurs();
        this.refreshEquipes();
        this.refreshJournees();
        this.refreshCommandes();
        this._isDataLoaded$.next(true);
      },
      error: err => {
        console.error('Initial data load failed:', err);
        this._isDataLoaded$.next(true);
      }
    });
  }

  // ─── Camions Stream ──────────────────────────────────────────────
  private camionsRefresh$ = new BehaviorSubject<void>(undefined);

  readonly camions = toSignal(
    this.camionsRefresh$.pipe(
      switchMap(() => this.http.get<Camion[]>(this.apiUrl('/api/camions'))),
      map(raw => {
        try {
          return camionSchema.array().parse(raw).filter(c => c.entrepotNom === 'Grenis');
        } catch (err) {
          console.error('Zod validation failed for camions:', err);
          return [] as Camion[]; 
        }
      }),
      catchError(() => of([] as Camion[]))
    ),
    { initialValue: [] as Camion[] }
  );

  refreshCamions() {
    this.camionsRefresh$.next();
  }

  // ─── Livreur Stream ─────────────────────────────────────────────
  private livreursRefresh$ = new BehaviorSubject<void>(undefined);

  readonly livreurs = toSignal(
    this.livreursRefresh$.pipe(
      switchMap(() => this.http.get<Livreur[]>(this.apiUrl('/api/livreurs'))),
      map(raw => {
        try {
          return livreurSchema.array().parse(raw).filter(c => c.entrepotNom === 'Grenis');
        } catch (err) {
          console.error('Zod validation failed for livreurs:', err);
          return [] as Livreur[];
        }
      }),
      catchError(() => of([] as Livreur[]))
    ),
    { initialValue: [] as Livreur[] }
  );

  refreshLivreurs() {
    this.livreursRefresh$.next();
  }

  updateLivreur(l: Livreur): Observable<Livreur> {
    return this.http.put<Livreur>(this.apiUrl(`/api/livreur/${l.trigramme}`), l).pipe(
      map(raw => {
        try {
          return livreurSchema.parse(raw);
        } catch (err) {
          console.error('Zod failed on PUT /api/livreur:', err);
          throw err;
        }
      })
    );
  }

  markLivreursAffecte(ids: string[]): void {
    forkJoin(
      ids.map(id => {
        const l = this.livreurs().find(x => x.trigramme === id);
        return l ? this.updateLivreur({ ...l, affecte: true }) : of(null);
      })
    ).subscribe({
      next: () => this.refreshLivreurs(),
      error: err => console.error('Error marking livreurs:', err)
    });
  }

  // ─── ÉquipeLivreurs Stream ──────────────────────────────────────
  private equipesRefresh$ = new BehaviorSubject<void>(undefined);

  readonly equipesLivreurs = toSignal(
    this.equipesRefresh$.pipe(
      switchMap(() => this.http.get<EquipeLivreurs[]>(this.apiUrl('/api/equipes'))),
      map(raw => {
        try {
          return equipeLivreursSchema.array().parse(raw);
        } catch (err) {
          console.error('Zod validation failed for équipes:', err);
          return [] as EquipeLivreurs[];
        }
      }),
      catchError(() => of([] as EquipeLivreurs[]))
    ),
    { initialValue: [] as EquipeLivreurs[] }
  );

  refreshEquipes() {
    this.equipesRefresh$.next();
  }

  createEquipe(payload: { status: string; livreurIds: string[] }) {
    return this.http.post<EquipeLivreurs>(this.apiUrl('/api/equipes'), payload).pipe(
      map(raw => {
        const e = equipeLivreursSchema.parse(raw);
        this.refreshEquipes();
        this.refreshLivreurs();
        return e;
      }),
      catchError((err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || 'Erreur inconnue';
        console.error('Erreur création équipe:', errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateEquipeStatus(idEquipe: number, status: string) {
    return this.http.patch<EquipeLivreurs>(this.apiUrl(`/api/equipes/${idEquipe}/status`), { status }).pipe(
      map(raw => {
        const e = equipeLivreursSchema.parse(raw);
        this.refreshEquipes();
        return e;
      }),
      catchError((err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || 'Erreur inconnue';
        console.error('Erreur mise à jour équipe:', errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  deleteEquipe(idEquipe: number) {
    return this.http.delete<void>(this.apiUrl(`/api/equipes/${idEquipe}`)).pipe(
      catchError((err: HttpErrorResponse) => {
        const errorMsg = err.error?.message || 'Erreur inconnue';
        console.error('Erreur suppression équipe:', errorMsg);
        return throwError(() => new Error(errorMsg));
      }),
      map(() => {
        this.refreshEquipes();
        this.refreshLivreurs();
      })
    );
  }

  // ─── Journées Stream ───────────────────────────────────────────
  private journeesRefresh$ = new BehaviorSubject<void>(undefined);

  readonly journees = toSignal(
    this.journeesRefresh$.pipe(
      switchMap(() => this.http.get<Journee[]>(this.apiUrl('/api/journees'))),
      map(raw => {
        try {
          return journeeSchema.array().parse(raw);
        } catch (err) {
          console.error('Zod validation failed for tournées:', err);
          return [] as Journee[];
        }
      }),
      catchError(() => of([] as Journee[]))
    ),
    { initialValue: [] as Journee[] }
  );

  refreshJournees() {
    this.journeesRefresh$.next();
  }

  deleteJournee(reference: string) {
    return this.http.delete<void>(this.apiUrl(`/api/journees/${reference}`)).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error deleting journée:', err);
        return of(void 0);
      }),
      map(() => {
        this.refreshJournees();
        this.refreshCommandes();
        this.refreshCamions();
        this.refreshLivreurs();
        this.refreshEquipes();
      })
    );
  }

  createJournee(journee: JourneePostDto) {
    return this.http.post(this.apiUrl('/api/journees'), journee).pipe(
      map(result => {
        this.refreshJournees();
        this.refreshEquipes();
        this.refreshLivreurs();
        this.refreshCommandes();
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error('Error creating journée:', err);
        return throwError(() => err);
      })
    );
  }

  // ─── Commandes Stream ─────────────────────────────────────────
  private commandesRefresh$ = new BehaviorSubject<void>(undefined);

  readonly commandes = toSignal(
    this.commandesRefresh$.pipe(
      switchMap(() => this.http.get<Commande[]>(this.apiUrl('/api/commandes'))),
      map(raw => {
        try {
          return commandeSchema.array().parse(raw);
        } catch (err) {
          console.error('Zod validation failed for commandes:', err);
          return [] as Commande[];
        }
      }),
      catchError(() => of([] as Commande[]))
    ),
    { initialValue: [] as Commande[] }
  );

  refreshCommandes() {
    this.commandesRefresh$.next();
  }

  readonly commandesOuvertes = computed(() =>
    this.commandes().filter(c => c.etat === EtatCommande.OUVERTE)
  );

  updateCommande(c: Commande): Observable<Commande> {
    return this.http
      .put<Commande>(this.apiUrl(`/api/commandes/${c.reference}`), c)
      .pipe(
        map(raw => {
          try {
            const updated = commandeSchema.parse(raw);
            this.refreshCommandes();
            this.refreshLivreurs();
            return updated;
          } catch (err) {
            console.error('Zod validation failed on updateCommande:', err);
            throw err;
          }
        })
      );
  }
}