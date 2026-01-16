/**
 * Chart Renderer
 * ADMET analiz sonuçları için Chart.js tabanlı radar grafiği renderer
 */

export class ChartRenderer {
    /**
     * ADMET radar grafiği render et
     * @param {HTMLElement} messageElement - Grafik verisini içeren mesaj elementi
     */
    static renderAdmetChart(messageElement) {
        const dataScript = messageElement.querySelector('#admet-radar-chart-data');
        const canvas = messageElement.querySelector('#admet-radar-chart');

        if (!dataScript || !canvas) {
            return; // No chart data or canvas found
        }

        try {
            const chartData = JSON.parse(dataScript.textContent);
            this.createRadarChart(canvas, chartData);
        } catch (e) {
            console.error("Failed to render ADMET chart:", e);
        }
    }

    /**
     * Radar grafiği oluştur
     * @param {HTMLCanvasElement} canvas - Canvas elementi
     * @param {object} chartData - Grafik verileri { labels: string[], values: number[] }
     */
    static createRadarChart(canvas, chartData) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            return;
        }

        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Risk Profile (0=low, 1=high)',
                    data: chartData.values,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)'
                }]
            },
            options: this.getDefaultRadarOptions()
        });
    }

    /**
     * Varsayılan radar grafik ayarları
     * @returns {object} Chart.js options
     */
    static getDefaultRadarOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    },
                    pointLabels: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        backdropColor: 'rgba(0, 0, 0, 0.5)',
                        stepSize: 0.2,
                        max: 1,
                        min: 0
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        };
    }

    /**
     * Karşılaştırma bar grafiği oluştur
     * @param {HTMLCanvasElement} canvas - Canvas elementi
     * @param {object} comparisonData - Karşılaştırma verileri
     */
    static createComparisonBarChart(canvas, comparisonData) {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library not loaded');
            return;
        }

        const ctx = canvas.getContext('2d');
        const colors = this.generateColors(comparisonData.datasets.length);

        const datasets = comparisonData.datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: colors[index],
            borderColor: colors[index].replace('0.6', '1'),
            borderWidth: 1
        }));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: comparisonData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        beginAtZero: true,
                        max: 1
                    }
                }
            }
        });
    }

    /**
     * Renk paleti oluştur
     * @param {number} count - Renk sayısı
     * @returns {string[]} Renk dizisi
     */
    static generateColors(count) {
        const baseColors = [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)',
            'rgba(83, 102, 255, 0.6)'
        ];

        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        return colors;
    }

    /**
     * Chart.js kütüphanesinin yüklenip yüklenmediğini kontrol et
     * @returns {boolean}
     */
    static isAvailable() {
        return typeof Chart !== 'undefined';
    }
}
