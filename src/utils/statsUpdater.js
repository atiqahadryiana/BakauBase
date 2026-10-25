/**
 * Stats updater — maintains the stats/summary document.
 *
 * Called after creating/updating a plot or observation.
 * Reads all plots to compute aggregated totals and writes to stats/summary.
 *
 * In a production app this would be a Cloud Function, but we keep it
 * client-side for the free Firebase Spark plan.
 *
 * The stats/summary document structure:
 * {
 *   totalPlots: number,
 *   totalSeedlings: number,
 *   totalAlive: number,
 *   overallSurvivalRate: number,
 *   totalCO2eLow: number,
 *   totalCO2eHigh: number,
 *   bySite: { [siteName]: { plots, seedlings, alive, survivalRate } },
 *   cumulativeByMonth: [ { month: 'YYYY-MM', seedlings: number } ],
 *   updatedAt: timestamp
 * }
 */
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function updateStats() {
  try {
    const plotsSnap = await getDocs(collection(db, 'plots'));
    const sitesSnap = await getDocs(collection(db, 'sites'));
    const incidentsSnap = await getDocs(collection(db, 'incidents'));

    // Build site name lookup
    const siteNames = {};
    sitesSnap.forEach((d) => {
      siteNames[d.id] = d.data().name || d.id;
    });

    let totalPlots = 0;
    let totalSeedlings = 0;
    let totalAlive = 0;
    let totalCheckedSeedlings = 0;
    let totalCO2eLow = 0;
    let totalCO2eHigh = 0;
    const bySite = {};
    const monthlyMap = {};

    plotsSnap.forEach((d) => {
      const plot = d.data();
      totalPlots++;
      totalSeedlings += plot.seedlingsPlanted || 0;

      // Count alive from survival rate
      const hasCheck = plot.survivalRate !== null && plot.survivalRate !== undefined;
      const alive = hasCheck
        ? Math.round((plot.survivalRate / 100) * (plot.seedlingsPlanted || 0))
        : 0;
      totalAlive += alive;
      if (hasCheck) totalCheckedSeedlings += plot.seedlingsPlanted || 0;

      totalCO2eLow += plot.estimatedCarbonLow || 0;
      totalCO2eHigh += plot.estimatedCarbonHigh || 0;

      // By site
      const siteName = siteNames[plot.siteId] || 'Unassigned';
      if (!bySite[siteName]) {
        bySite[siteName] = { plots: 0, seedlings: 0, checkedSeedlings: 0, alive: 0, survivalRate: 0 };
      }
      bySite[siteName].plots++;
      bySite[siteName].seedlings += plot.seedlingsPlanted || 0;
      bySite[siteName].alive += alive;
      if (hasCheck) bySite[siteName].checkedSeedlings += plot.seedlingsPlanted || 0;

      // Cumulative by month
      const plantedAt = plot.plantedAt?.toDate ? plot.plantedAt.toDate() : new Date(plot.plantedAt);
      const monthKey = `${plantedAt.getFullYear()}-${String(plantedAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + (plot.seedlingsPlanted || 0);
    });

    // Calculate per-site survival rates
    for (const site of Object.values(bySite)) {
      site.survivalRate = site.checkedSeedlings > 0
        ? Math.round((site.alive / site.checkedSeedlings) * 100)
        : 0;
    }

    // Build cumulative monthly array
    const months = Object.keys(monthlyMap).sort();
    let cumulative = 0;
    const cumulativeByMonth = months.map((month) => {
      cumulative += monthlyMap[month];
      return { month, seedlings: cumulative };
    });

    const overallSurvivalRate = totalCheckedSeedlings > 0
      ? Math.round((totalAlive / totalCheckedSeedlings) * 100)
      : 0;

    const recentIncidents = incidentsSnap.docs
      .map((incidentDoc) => ({ id: incidentDoc.id, ...incidentDoc.data() }))
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate - aDate;
      })
      .slice(0, 5)
      .map(({ id, type, severity, status, createdAt }) => ({ id, type, severity, status, createdAt }));

    const summary = {
      totalPlots,
      incidentCount: incidentsSnap.docs.length,
      recentIncidents,
      totalSeedlings,
      totalAlive,
      overallSurvivalRate,
      totalCO2eLow: Math.round(totalCO2eLow * 10000) / 10000,
      totalCO2eHigh: Math.round(totalCO2eHigh * 10000) / 10000,
      bySite,
      cumulativeByMonth,
      sites: Object.entries(bySite).map(([name, values]) => ({ name, ...values })),
      timeline: cumulativeByMonth.map(({ month, seedlings }) => ({ date: month, cumulative: seedlings })),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'stats', 'summary'), summary);
    console.log('Stats summary updated');
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}
