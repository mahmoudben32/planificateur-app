import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';


describe('TESTS LoginComponent', () => {
  let component: LoginComponent;
  let fixture:   ComponentFixture<LoginComponent>;

  // ─── Doubles / espions ───────────────────────────────────────────
  const dataStub = {}; // aucun appel dans ces tests

  /**
   * `AuthService.login()` renvoie, selon le test, un `Observable` de succès
   * ou une erreur. On remplace dynamiquement l’implémentation via `spyOn`.
   */
  const authStub = {
    login: jasmine.createSpy('login')
  } as unknown as AuthService;

  const routerStub = {
    navigate: jasmine.createSpy('navigate')
  } as unknown as Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, FormsModule], // composant stand‑alone + Forms
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: DataService, useValue: dataStub },
        { provide: Router,      useValue: routerStub },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Tests ───────────────────────────────────────────────────────

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('onSubmit() en cas de succès : appelle login() puis navigue', () => {
    // 1. Arrange
    component.email    = 'user@example.com';
    component.password = 'secret';
    (authStub.login as jasmine.Spy).and.returnValue(of(void 0));

    // 2. Act
    component.onSubmit();

    // 3. Assert
    expect(authStub.login).toHaveBeenCalledWith('user@example.com', 'secret');
    expect(routerStub.navigate).toHaveBeenCalledWith(['/tableau-de-bord']);
    expect(component.errorMessage).toBeNull();
  });
/*
  it('onSubmit() en cas d erreur : renseigne errorMessage', () => {
    component.email    = 'wrong@foo';
    component.password = 'bad';
    const fakeErr = { code: 'auth/invalid-credentials' };

    (authStub.login as jasmine.Spy).and.returnValue(throwError(() => fakeErr));

    component.onSubmit();

    expect(authStub.login).toHaveBeenCalled();
    expect(component.errorMessage).toBe('auth/invalid-credentials');
    // aucune navigation
    expect(routerStub.navigate).not.toHaveBeenCalled();
  });

 */
});
