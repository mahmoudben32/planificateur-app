import { KMeansService } from './kmeans.service';

describe('TESTS KMeansService', () => {
  let service: KMeansService;

  beforeEach(() => {
    service = new KMeansService();
  });

  function generateData(n: number, dim: number): number[][] {
    return Array.from({ length: n }, () =>
      Array.from({ length: dim }, () => Math.random() * 100)
    );
  }

  it('génère le bon nombre de clusters', () => {
    const data = generateData(100, 2);
    const result = service.kmeans(data, 4, 'custom');  // changé ici

    const clusterSet = new Set(result.clusters);
    expect(clusterSet.size).toBe(4);
  });

  it('chaque point est assigné à un cluster', () => {
    const data = generateData(50, 2);
    const result = service.kmeans(data, 3, 'custom');  // changé ici

    result.clusters.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
  });

  it('respecte la taille maximale par cluster', () => {
    const data = generateData(200, 2);
    const result = service.kmeans(data, 4, 'custom');  // changé ici

    const counts = new Array(4).fill(0);
    result.clusters.forEach((cid) => counts[cid]++);
    counts.forEach((c) => expect(c).toBeLessThanOrEqual(50));
  });

  it('converge en un nombre raisonnable d’itérations', () => {
    const data = generateData(150, 2);
    const result = service.kmeans(data, 5, 'custom');  // changé ici
    expect(result.iterations).toBeLessThanOrEqual(100);
    expect(result.converged).toBeTrue();
  });

  it('équilibre les clusters avec la stratégie "balanced"', () => {
    const data = generateData(120, 2);
    const result = service.kmeans(data, 4, 'balanced');  // ici c'était déjà bon

    const counts = new Array(4).fill(0);
    result.clusters.forEach((cid) => counts[cid]++);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    expect(max - min).toBeLessThanOrEqual(1);
  });
});
