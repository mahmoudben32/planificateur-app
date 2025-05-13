import { Injectable } from '@angular/core';
import { squaredEuclidean } from 'ml-distance-euclidean';

@Injectable({
  providedIn: 'root',
})
export class KMeansService {

  /**
 * L'algorithme K-means vise à partitionner n observations en k clusters, dans lesquels chaque observation appartient au cluster dont la moyenne est la plus proche.
 * Cette implémentation est basée sur le package `ml-kmeans` (https://www.npmjs.com/package/ml-kmeans),
 *  avec la modification suivante : un nombre maximum de points par cluster est imposé.
 * 
 * L'algorithme K-means original a été pris de ml-kmeans :
 * https://www.npmjs.com/package/ml-kmeans
 * 
 * Modifications :
 * - Assure que chaque cluster contient au maximum un nombre spécifié de points (`maxPerCluster`).
 * - L'algorithme s'adapte à cette contrainte tout en partitionnant les données.
 */
  kmeans(
    data: number[][],
    K: number,
    strategy: 'balanced' | 'custom',
    customSizes?: number[]
  ) {
    const maxPerCluster = 50;
    const maxIterations = 100;
    const tolerance = 1e-6;
    const distance = squaredEuclidean;

    
    const capacities: number[] =
      strategy === 'custom' && customSizes && customSizes.length === K
        ? customSizes.slice()
        : Array(K).fill(maxPerCluster);

    let centers = data.slice(0, K).map(pt => pt.slice());
    const assignments = new Array<number>(data.length).fill(-1);
    let converged = false;
    let iters = 0;


    while (!converged && iters < maxIterations) {
      const counts = Array(K).fill(0);

      for (let i = 0; i < data.length; i++) {
        let bestDist = Infinity;
        let bestCluster = -1;
        for (let j = 0; j < K; j++) {
          if (counts[j] >= capacities[j]) continue;
          const d = distance(data[i], centers[j]);
          if (d < bestDist) {
            bestDist = d;
            bestCluster = j;
          }
        }
        if (bestCluster >= 0) {
          assignments[i] = bestCluster;
          counts[bestCluster]++;
        }
      }

      const sums = Array.from({ length: K }, () => Array(data[0].length).fill(0));
      const ctrCounts = Array(K).fill(0);
      for (let i = 0; i < data.length; i++) {
        const c = assignments[i];
        if (c >= 0) {
          ctrCounts[c]++;
          for (let d = 0; d < data[i].length; d++) {
            sums[c][d] += data[i][d];
          }
        }
      }
      const newCenters = centers.map((_, j) =>
        sums[j].map(sum => sum / (ctrCounts[j] || 1))
      );

      converged = centers.every((c, j) => distance(c, newCenters[j]) <= tolerance);
      centers = newCenters;
      iters++;
    }


    const finalClusters =
      strategy === 'balanced'
        ? this.balanceClusters(data, assignments, K)
        : this.customClusters(data, assignments, customSizes || []);

    return { clusters: finalClusters, centroids: centers, iterations: iters, converged };
  }


  private balanceClusters(data: number[][], clusters: number[], K: number): number[] {
    const dist = squaredEuclidean;
    const assign = [...clusters];
    const buckets: number[][] = Array.from({ length: K }, () => []);
    data.forEach((pt, i) => {
      const c = assign[i];
      if (c >= 0) buckets[c].push(i);
    });

    let changed = true;
    while (changed) {
      changed = false;
      const sizes = buckets.map((b,i) => ({ idx: i, size: b.length }));
      sizes.sort((a,b) => b.size - a.size);
      const { idx: big } = sizes[0];
      const { idx: small } = sizes[sizes.length - 1];
      if (buckets[big].length - buckets[small].length <= 1) break;

      
      let best = { ptIdx: -1, dist: Infinity };
      buckets[big].forEach(i => {
        buckets[small].forEach(j => {
          const d = dist(data[i], data[j]);
          if (d < best.dist) best = { ptIdx: i, dist: d };
        });
      });
      if (best.ptIdx >= 0) {
        buckets[big] = buckets[big].filter(i => i !== best.ptIdx);
        buckets[small].push(best.ptIdx);
        assign[best.ptIdx] = small;
        changed = true;
      }
    }
    return assign;
  }

  
  private customClusters(
    data: number[][],
    clusters: number[],
    desiredSizes: number[]
  ): number[] {
    const dist = squaredEuclidean;
    const K = desiredSizes.length;
    const assign = [...clusters];
    const buckets: number[][] = Array.from({ length: K }, () => []);
    data.forEach((pt, i) => {
      const c = assign[i];
      if (c >= 0 && c < K) buckets[c].push(i);
    });

    let changed = true;
    while (changed) {
      changed = false;
      
      for (let from = 0; from < K; from++) {
        const excess = buckets[from].length - desiredSizes[from];
        if (excess <= 0) continue;

        
        for (let e = 0; e < excess; e++) {
          let bestMove = { idx: -1, to: -1, dist: Infinity };
          buckets[from].forEach(ptIdx => {
            
            desiredSizes.forEach((sz, to) => {
              if (buckets[to].length < sz) {
                const d = dist(data[ptIdx], data[buckets[to][0]]);
                if (d < bestMove.dist) bestMove = { idx: ptIdx, to, dist: d };
              }
            });
          });
          if (bestMove.idx >= 0) {
            buckets[from] = buckets[from].filter(i => i !== bestMove.idx);
            buckets[bestMove.to].push(bestMove.idx);
            assign[bestMove.idx] = bestMove.to;
            changed = true;
          }
        }
      }
    }
    return assign;
  }
}
