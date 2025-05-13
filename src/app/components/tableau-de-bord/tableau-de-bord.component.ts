import { Component, inject, computed, signal, effect } from '@angular/core';
import { DataService } from '../../services/data.service';
import { StatusEquipeLivreurs } from '../../../models/enums/status-equipe-livreurs.enum';
import { EtatCommande } from '../../../models/enums/etat-commande.enum';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [MatProgressSpinnerModule, CommonModule],
  templateUrl: './tableau-de-bord.component.html',
  styleUrls: ['./tableau-de-bord.component.scss']
})
export class TableauDeBordComponent {
  protected dataService = inject(DataService);

  readonly equipes = this.dataService.equipesLivreurs;
  readonly commandes = this.dataService.commandes;

  isLoading = signal(true);

  constructor() {
    effect(() => {
      if (this.equipes().length > 0 && this.commandes().length > 0) {
        this.isLoading.set(false);
      }
    });
  }

  getLivreurById(id: string): Livreur | undefined {
    return this.dataService.livreurs().find(l => l.trigramme === id);
  }

  getLivreursFromIds(ids: string[]): Livreur[] {
    return ids.map(id => this.getLivreurById(id)).filter(Boolean) as Livreur[];
  }

  StatusEquipeLivreurs = StatusEquipeLivreurs;

  readonly totalCommandes = computed(() => this.commandes().length);

  readonly terminees = computed(() =>
    this.commandes().filter(c => c.etat === EtatCommande.LIVREE).length
  );

  readonly enAttente = computed(() =>
    this.commandes().filter(c => c.etat === EtatCommande.PLANIFIEE).length
  );

  readonly enCours = computed(() =>
    this.commandes().filter(c => c.etat === EtatCommande.EN_LIVRAISON).length
  );
}