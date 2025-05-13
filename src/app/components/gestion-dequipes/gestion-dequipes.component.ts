import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // <-- Déjà importé

import { DataService } from '../../services/data.service';
import { Livreur } from '../../../models/interfaces/livreur.model';
import { StatusEquipeLivreurs } from '../../../models/enums/status-equipe-livreurs.enum';

@Component({
  selector: 'app-gestion-dequipes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  templateUrl: './gestion-dequipes.component.html',
  styleUrls: ['./gestion-dequipes.component.scss']
})
export class GestionDequipesComponent {
  private svc = inject(DataService);

  errorMessage = signal<string | null>(null);
  readonly livreurs = this.svc.livreurs;
  readonly equipes  = this.svc.equipesLivreurs;
  readonly dispo    = computed(() =>
    this.livreurs().filter(l => !l.affecte)
  );

  isLoadingEquipes = signal(false); 
  StatusEquipeLivreurs = StatusEquipeLivreurs;
  showModal       = signal(false);
  editingEquipeId = signal<number | null>(null);
  equipeForm      = signal({
    livreur1: '' as string,
    livreur2: '',
    status:   StatusEquipeLivreurs.PRET
  });

  constructor() {
    this.isLoadingEquipes.set(true);

    effect(() => {
      if (this.equipes().length > 0) {
        this.isLoadingEquipes.set(false);
      }
    });
  }

  // Helper: get Livreur object by trigramme
  getLivreurById(id: string): Livreur | undefined {
    return this.livreurs().find(l => l.trigramme === id);
  }

  // Helper: get array of Livreur objects from array of ids
  getLivreursFromIds(ids: string[]): Livreur[] {
    return ids.map(id => this.getLivreurById(id)).filter(Boolean) as Livreur[];
  }

  private resetForm() {
    this.equipeForm.set({ livreur1: '', livreur2: '', status: StatusEquipeLivreurs.PRET });
    this.editingEquipeId.set(null);
  }

  creerEquipe() {
    const { livreur1, livreur2, status } = this.equipeForm();
    if (!livreur1) {
      this.errorMessage.set('Une équipe doit avoir moins 1 livreur.');
      return;
    }

    const livreurIds = livreur2 ? [livreur1, livreur2] : [livreur1];
    this.isLoadingEquipes.set(true);
    this.errorMessage.set(null); // reset erreur

    this.svc.createEquipe({ status, livreurIds }).subscribe({
      next: () => {
        this.svc.markLivreursAffecte(livreurIds);
        this.showModal.set(false);
        this.resetForm();
        this.isLoadingEquipes.set(false);
      },
      error: e => {
        this.errorMessage.set(e.message);
        this.isLoadingEquipes.set(false);
      }
    });
  }

  modifierEquipe(num: number) {
    const eq = this.equipes().find(e => e.idEquipe === num);
    if (!eq) return console.error('Introuvable');
    this.equipeForm.set({
      livreur1: eq.livreurIds[0] ?? '',
      livreur2: eq.livreurIds[1] ?? '',
      status:   eq.status
    });
    this.editingEquipeId.set(num);
    this.showModal.set(true);
  }

  enregistrerModification() {
    const num = this.editingEquipeId();
    if (num === null) return;

    const { status } = this.equipeForm();
    this.isLoadingEquipes.set(true);
    this.errorMessage.set(null);

    this.svc.updateEquipeStatus(num, status).subscribe({
      next: () => {
        this.showModal.set(false);
        this.resetForm();
        this.isLoadingEquipes.set(false);
      },
      error: e => {
        this.errorMessage.set(e.message);
        this.isLoadingEquipes.set(false);
      }
    });
  }

  supprimerEquipe(num: number) {
    if (!confirm(`Supprimer équipe #${num}?`)) return;
    this.isLoadingEquipes.set(true);
    this.errorMessage.set(null);

    this.svc.deleteEquipe(num).subscribe({
      next: () => {
        this.isLoadingEquipes.set(false);
      },
      error: e => {
        this.errorMessage.set(e.message);
        this.isLoadingEquipes.set(false);
      }
    });
  }

  annuler() {
    this.showModal.set(false);
    this.resetForm();
  }
}