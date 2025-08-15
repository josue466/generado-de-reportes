let data = [];
let headers = [];
let dataTypes = {};

// Configuración de carga de archivos
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = '<div class="loading">📊 Procesando archivo...</div>';
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        processCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        processExcel(file);
    } else {
        fileInfo.innerHTML = '<div class="error">❌ Formato no soportado. Use CSV, XLSX o XLS.</div>';
    }
}

function processCSV(file) {
    const fileInfo = document.getElementById('fileInfo');
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [';', ',', '\t'],
        complete: function(results) {
            if (results.errors.length > 0) {
                fileInfo.innerHTML = '<div class="error">❌ Error al procesar el archivo: ' + results.errors[0].message + '</div>';
                return;
            }
            
            data = results.data;
            headers = results.meta.fields || Object.keys(data[0] || {});
            
            if (data.length === 0 || headers.length === 0) {
                fileInfo.innerHTML = '<div class="error">❌ El archivo parece estar vacío o no tiene el formato correcto</div>';
                return;
            }
            
            finishProcessing();
        },
        error: function(error) {
            fileInfo.innerHTML = '<div class="error">❌ Error al leer el archivo: ' + error.message + '</div>';
        }
    });
}

function processExcel(file) {
    const fileInfo = document.getElementById('fileInfo');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data_array = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data_array, { type: 'array' });
            const first_sheet_name = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[first_sheet_name];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (jsonData.length === 0) {
                fileInfo.innerHTML = '<div class="error">❌ El archivo Excel está vacío</div>';
                return;
            }
            
            data = jsonData;
            headers = Object.keys(jsonData[0] || {});
            
            finishProcessing();
        } catch (error) {
            fileInfo.innerHTML = '<div class="error">❌ Error al procesar Excel: ' + error.message + '</div>';
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function finishProcessing() {
    analyzeDataTypes();
    generateReport();
    
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('navigation').style.display = 'block';
}

function analyzeDataTypes() {
    dataTypes = {};
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
        
        if (values.length === 0) {
            dataTypes[header] = 'unknown';
            return;
        }
        
        const numericValues = values.filter(val => !isNaN(val) && isFinite(val));
        const numericRatio = numericValues.length / values.length;
        
        if (numericRatio > 0.8) {
            dataTypes[header] = 'numeric';
        } else {
            const uniqueValues = [...new Set(values)];
            if (uniqueValues.length <= Math.max(10, values.length * 0.1)) {
                dataTypes[header] = 'categorical';
            } else {
                dataTypes[header] = 'text';
            }
        }
    });
}

function generateReport() {
    generateOverview();
    populateVariableSelectors();
    generateSamples();
}

function generateOverview() {
    const totalVars = headers.length;
    const totalObs = data.length;
    let totalMissing = 0;
    let totalCells = 0;
    const missingByVar = {};
    
    headers.forEach(header => {
        const missing = data.filter(row => row[header] === null || row[header] === undefined || row[header] === '').length;
        missingByVar[header] = missing;
        totalMissing += missing;
        totalCells += data.length;
    });
    
    const typeCount = {
        numeric: Object.values(dataTypes).filter(type => type === 'numeric').length,
        categorical: Object.values(dataTypes).filter(type => type === 'categorical').length,
        text: Object.values(dataTypes).filter(type => type === 'text').length,
        unknown: Object.values(dataTypes).filter(type => type === 'unknown').length
    };
    
    const missingPercentage = ((totalMissing / totalCells) * 100).toFixed(1);
    const duplicateRows = data.length - new Set(data.map(row => JSON.stringify(row))).size;
    
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${totalVars}</div>
            <div class="stat-label">Número de variables</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalObs}</div>
            <div class="stat-label">Número de observaciones</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalMissing}</div>
            <div class="stat-label">Celdas faltantes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${missingPercentage}%</div>
            <div class="stat-label">Celdas faltantes (%)</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${duplicateRows}</div>
            <div class="stat-label">Filas duplicadas</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${typeCount.numeric}</div>
            <div class="stat-label">Numéricas</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${typeCount.categorical}</div>
            <div class="stat-label">Categóricas</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${typeCount.text}</div>
            <div class="stat-label">Texto</div>
        </div>
    `;
    
    // Gráfico de valores perdidos
    const ctx = document.getElementById('missingChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: headers,
            datasets: [{
                label: 'Valores faltantes',
                data: headers.map(h => missingByVar[h]),
                backgroundColor: '#007bff',
                borderColor: '#0056b3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function populateVariableSelectors() {
    const selectors = ['variableSelect', 'varX', 'varY'];
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        selector.innerHTML = '<option value="">-- Seleccionar --</option>';
        headers.forEach(header => {
            selector.innerHTML += `<option value="${header}">${header}</option>`;
        });
    });
}

function analyzeVariable() {
    const selectedVar = document.getElementById('variableSelect').value;
    const analysisDiv = document.getElementById('variableAnalysis');
    
    if (!selectedVar) {
        analysisDiv.innerHTML = '';
        return;
    }
    
    const values = data.map(row => row[selectedVar]).filter(val => val !== null && val !== undefined && val !== '');
    const type = dataTypes[selectedVar];
    const missing = data.length - values.length;
    const missingPercentage = ((missing / data.length) * 100).toFixed(1);
    
    let html = `
        <div class="variable-info">
            <div class="variable-header">
                <div class="variable-icon">📊</div>
                <div class="variable-name">Variable: ${selectedVar}</div>
            </div>
            <p><strong>Tipo:</strong> ${type}</p>
            <p><strong>Valores faltantes:</strong> ${missing} (${missingPercentage}%)</p>
        </div>
    `;
    
    if (type === 'numeric') {
        const numValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        const stats = calculateNumericStats(numValues);
        
        html += `
            <div class="variable-stats">
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.count}</div>
                    <div class="variable-stat-label">Cantidad</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.mean.toFixed(2)}</div>
                    <div class="variable-stat-label">Media</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.std.toFixed(2)}</div>
                    <div class="variable-stat-label">Desv. Estándar</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.min}</div>
                    <div class="variable-stat-label">Mínimo</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.max}</div>
                    <div class="variable-stat-label">Máximo</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${stats.median.toFixed(2)}</div>
                    <div class="variable-stat-label">Mediana</div>
                </div>
            </div>
            <div class="charts-row">
                <div class="chart-container">
                    <h3 class="chart-title">Histograma</h3>
                    <canvas id="histogram" width="400" height="200"></canvas>
                </div>
                <div class="chart-container">
                    <h3 class="chart-title">Diagrama de Caja</h3>
                    <canvas id="boxplot" width="400" height="200"></canvas>
                </div>
            </div>
        `;
    } else {
        const freq = calculateFrequency(values);
        const uniqueCount = Object.keys(freq).length;
        const topValue = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        
        html += `
            <div class="variable-stats">
                <div class="variable-stat">
                    <div class="variable-stat-value">${values.length}</div>
                    <div class="variable-stat-label">Cantidad</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${uniqueCount}</div>
                    <div class="variable-stat-label">Únicos</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${topValue ? topValue[0] : 'N/A'}</div>
                    <div class="variable-stat-label">Más Frecuente</div>
                </div>
                <div class="variable-stat">
                    <div class="variable-stat-value">${topValue ? topValue[1] : 'N/A'}</div>
                    <div class="variable-stat-label">Frecuencia</div>
                </div>
            </div>
            <div class="chart-container">
                <h3 class="chart-title">Distribución</h3>
                <canvas id="distribution" width="400" height="200"></canvas>
            </div>
        `;
    }
    
    analysisDiv.innerHTML = html;
    
    setTimeout(() => {
        if (type === 'numeric') {
            const numValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            const histCtx = document.getElementById('histogram').getContext('2d');
            createHistogram(histCtx, numValues);
            
            const boxCtx = document.getElementById('boxplot').getContext('2d');
            createBoxPlot(boxCtx, numValues, selectedVar);
        } else {
            const distCtx = document.getElementById('distribution').getContext('2d');
            const freq = calculateFrequency(values);
            const topFreq = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
            createBarChart(distCtx, topFreq);
        }
    }, 100);
}

function analyzeRelation() {
    const varX = document.getElementById('varX').value;
    const varY = document.getElementById('varY').value;
    const analysisDiv = document.getElementById('relationAnalysis');
    
    if (!varX || !varY) {
        analysisDiv.innerHTML = '';
        return;
    }
    
    const typeX = dataTypes[varX];
    const typeY = dataTypes[varY];
    
    let html = `
        <div class="variable-info">
            <div class="variable-header">
                <div class="variable-icon">🔗</div>
                <div class="variable-name">Relación: ${varX} vs ${varY}</div>
            </div>
        </div>
    `;
    
    // Calcular correlación si ambas son numéricas
    if (typeX === 'numeric' && typeY === 'numeric') {
        const correlation = calculateCorrelation(varX, varY);
        html += `
            <div class="correlation-info">
                <strong>Correlación:</strong> <span class="correlation-value">${correlation.toFixed(3)}</span>
            </div>
        `;
    }
    
    html += `
        <div class="chart-container">
            <canvas id="relationChart" width="400" height="300"></canvas>
        </div>
    `;
    
    analysisDiv.innerHTML = html;
    
    setTimeout(() => {
        const ctx = document.getElementById('relationChart').getContext('2d');
        createRelationChart(ctx, varX, varY, typeX, typeY);
    }, 100);
}

function generateSamples() {
    const firstDiv = document.getElementById('firstSamples');
    const lastDiv = document.getElementById('lastSamples');
    
    const firstSamples = data.slice(0, 10);
    const lastSamples = data.slice(-10);
    
    firstDiv.innerHTML = createTable(firstSamples);
    lastDiv.innerHTML = createTable(lastSamples);
}

function createTable(samples) {
    if (samples.length === 0) return '<p>No hay datos disponibles</p>';
    
    let html = '<table><thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    samples.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            const value = row[header];
            html += `<td>${value !== null && value !== undefined ? value : ''}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

function calculateNumericStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 
        : sorted[Math.floor(sorted.length/2)];
    
    return {
        count: values.length,
        mean: mean,
        std: std,
        min: Math.min(...values),
        max: Math.max(...values),
        median: median,
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q3: sorted[Math.floor(sorted.length * 0.75)]
    };
}

function calculateFrequency(values) {
    const freq = {};
    values.forEach(val => {
        freq[val] = (freq[val] || 0) + 1;
    });
    return freq;
}

function calculateCorrelation(varX, varY) {
    const validData = data.filter(row => 
        row[varX] !== null && row[varX] !== undefined && row[varX] !== '' &&
        row[varY] !== null && row[varY] !== undefined && row[varY] !== ''
    );
    
    const xValues = validData.map(row => parseFloat(row[varX])).filter(v => !isNaN(v));
    const yValues = validData.map(row => parseFloat(row[varY])).filter(v => !isNaN(v));
    
    if (xValues.length !== yValues.length || xValues.length === 0) return 0;
    
    const n = xValues.length;
    const sumX = xValues.reduce((sum, val) => sum + val, 0);
    const sumY = yValues.reduce((sum, val) => sum + val, 0);
    const sumXY = xValues.reduce((sum, val, i) => sum + val * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = yValues.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

function createHistogram(ctx, values) {
    const bins = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    const labels = [];
    
    values.forEach(val => {
        const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
        histogram[binIndex]++;
    });
    
    // etiquetas del histograma
    for (let i = 0; i < bins; i++) {
        const binStart = min + i * binWidth;
        const binEnd = min + (i + 1) * binWidth;
        if (binWidth < 1) {
            labels.push(`${binStart.toFixed(2)}-${binEnd.toFixed(2)}`);
        } else {
            labels.push(`${Math.round(binStart)}-${Math.round(binEnd)}`);
        }
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frecuencia',
                data: histogram,
                backgroundColor: '#007bff',
                borderColor: '#0056b3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createBoxPlot(ctx, values, varName) {
    const stats = calculateNumericStats(values);
    
    // un box plot con un gráfico de barras horizontal
    const boxData = [
        { label: 'Mín', value: stats.min, color: '#dc3545' },
        { label: 'Q1', value: stats.q1, color: '#ffc107' },
        { label: 'Mediana', value: stats.median, color: '#28a745' },
        { label: 'Q3', value: stats.q3, color: '#ffc107' },
        { label: 'Máx', value: stats.max, color: '#dc3545' }
    ];
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: boxData.map(d => d.label),
            datasets: [{
                label: varName,
                data: boxData.map(d => d.value),
                backgroundColor: boxData.map(d => d.color),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: false
                }
            }
        }
    });
}

function createBarChart(ctx, topFreq) {
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topFreq.map(item => item[0]),
            datasets: [{
                label: 'Frecuencia',
                data: topFreq.map(item => item[1]),
                backgroundColor: '#17a2b8',
                borderColor: '#138496',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createRelationChart(ctx, varX, varY, typeX, typeY) {
    const validData = data.filter(row => 
        row[varX] !== null && row[varX] !== undefined && row[varX] !== '' &&
        row[varY] !== null && row[varY] !== undefined && row[varY] !== ''
    );
    
    if (typeX === 'numeric' && typeY === 'numeric') {
        // Scatter plot
        const scatterData = validData.map(row => ({
            x: parseFloat(row[varX]),
            y: parseFloat(row[varY])
        })).filter(point => !isNaN(point.x) && !isNaN(point.y));
        
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `${varX} vs ${varY}`,
                    data: scatterData,
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    borderColor: '#007bff',
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: varX
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: varY
                        }
                    }
                }
            }
        });
    } else if (typeX === 'numeric' && typeY !== 'numeric') {
        // Box plot alternativo
        const groups = {};
        validData.forEach(row => {
            const group = row[varY];
            if (!groups[group]) groups[group] = [];
            const numVal = parseFloat(row[varX]);
            if (!isNaN(numVal)) groups[group].push(numVal);
        });
        
        const groupStats = Object.entries(groups).map(([group, values]) => ({
            group,
            mean: values.reduce((sum, val) => sum + val, 0) / values.length,
            count: values.length
        }));
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: groupStats.map(stat => stat.group),
                datasets: [{
                    label: `Media de ${varX} por ${varY}`,
                    data: groupStats.map(stat => stat.mean),
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Media de ${varX}`
                        }
                    }
                }
            }
        });
    } else if (typeX !== 'numeric' && typeY === 'numeric') {
        // Caso inverso: categórica vs numérica
        const groups = {};
        validData.forEach(row => {
            const group = row[varX];
            if (!groups[group]) groups[group] = [];
            const numVal = parseFloat(row[varY]);
            if (!isNaN(numVal)) groups[group].push(numVal);
        });
        
        const groupStats = Object.entries(groups).map(([group, values]) => ({
            group,
            mean: values.reduce((sum, val) => sum + val, 0) / values.length,
            count: values.length
        }));
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: groupStats.map(stat => stat.group),
                datasets: [{
                    label: `Media de ${varY} por ${varX}`,
                    data: groupStats.map(stat => stat.mean),
                    backgroundColor: '#ffc107',
                    borderColor: '#e0a800',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Media de ${varY}`
                        }
                    }
                }
            }
        });
    } else {
        // Heatmap alternativo
        const crosstab = {};
        validData.forEach(row => {
            const x = row[varX];
            const y = row[varY];
            if (!crosstab[x]) crosstab[x] = {};
            crosstab[x][y] = (crosstab[x][y] || 0) + 1;
        });
        
        const xCategories = Object.keys(crosstab).slice(0, 10);
        const yCategories = [...new Set(validData.map(row => row[varY]))].slice(0, 10);
        
        const datasets = yCategories.map((yCat, index) => ({
            label: yCat,
            data: xCategories.map(xCat => crosstab[xCat] && crosstab[xCat][yCat] || 0),
            backgroundColor: `hsla(${index * 360 / yCategories.length}, 60%, 50%, 0.8)`,
        }));
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: xCategories,
                datasets: datasets
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: varX
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frecuencia'
                        }
                    }
                }
            }
        });
    }
}

function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionName + 'Content').classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
}

function resetApp() {
    // Limpiar datos
    data = [];
    headers = [];
    dataTypes = {};
    
    // Mostrar sección de carga
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('navigation').style.display = 'none';
    
    // Limpiar input de archivo
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').innerHTML = '';
    
    // Limpiar contenido
    document.getElementById('statsGrid').innerHTML = '';
    document.getElementById('variableAnalysis').innerHTML = '';
    document.getElementById('relationAnalysis').innerHTML = '';
    document.getElementById('firstSamples').innerHTML = '';
    document.getElementById('lastSamples').innerHTML = '';
    
    // Resetear selectores
    ['variableSelect', 'varX', 'varY'].forEach(id => {
        document.getElementById(id).innerHTML = '<option value="">-- Seleccionar --</option>';
    });
}
