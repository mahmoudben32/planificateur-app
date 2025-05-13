import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { HeaderComponent } from './header.component';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';


describe('TESTS HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  // Stubs
  const dataStub   = {};                                         // non utilisé ici
  const authStub   = { logout: jasmine.createSpy('logout') };
  const routerStub = { navigate: jasmine.createSpy('navigate') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: DataService, useValue: dataStub },
        { provide: AuthService, useValue: authStub },
        { provide: Router,      useValue: routerStub },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Vérifie simplement que le composant se crée sans erreur.
   */

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Vérifie que `logout
   *  1. appelle `AuthService.logout()` ;
   *  2. déclenche une navigation vers "/login".
   */
  it('logout() déclenche AuthService.logout() puis navigation vers /login', () => {
    component.logout();

    expect(authStub.logout).toHaveBeenCalled();
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login']);
  });
});
