import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DataService } from '../../services/data.service';
import { EquipeLivreurs } from '../../../models/interfaces/equipe-livreurs.model';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { Commande } from '../../../models/interfaces/commande.model';
import { PlanificationService } from '../../services/planification.service';

@Component({
  selector: 'app-tournees',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournees.component.html',
  styleUrls: ['./tournees.component.scss']
})
export class TourneesComponent {
  protected dataService = inject(DataService);
  protected planificationService = inject(PlanificationService);

  readonly journees = this.dataService.journees;
  readonly equipes = this.dataService.equipesLivreurs;
  readonly livreurs = this.dataService.livreurs;
  readonly commandes = this.dataService.commandes;

  getEquipeById(id: string): EquipeLivreurs | undefined {
    console.log(this.journees());
    return this.equipes().find(e => String(e.idEquipe) === String(id));
  }

  getLivreursFromIds(ids: string[]): Livreur[] {
    return ids
      .map(id => this.livreurs().find(l => l.trigramme === id))
      .filter((l): l is Livreur => !!l);
  }

  getCommandeByReference(ref: string): Commande | undefined {
    return this.commandes().find(c => c.reference === ref);
  }

  deleteJournee(reference: string): void {
    if (!confirm(`Supprimer la journée #${reference} ?`)) return;
    this.dataService.deleteJournee(reference).subscribe({
      next: () => {
        
        this.dataService.refreshJournees();
        this.dataService.refreshCommandes();
        this.dataService.refreshEquipes();
        this.dataService.refreshLivreurs();
        this.planificationService.savedLayers.set([]);
      },
      error: err => {
        if (err?.error) {
          try {
            console.error('Erreur Zod:', err.error);
          } catch {
            console.error('Erreur suppression journée :', err);
          }
        } else {
          console.error('Erreur suppression journée :', err);
        }
      }
    });
  }
}