import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private dataService = inject(DataService)
  private router = inject(Router)
  protected auth = inject(AuthService)

  logout() {
    this.auth.logout()
    this.router.navigate(['/login'])
  }
}

