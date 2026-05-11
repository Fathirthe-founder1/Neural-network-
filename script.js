// =============================================
// 1. CANVAS SETUP (Touch & Mouse)
// =============================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX = 0, lastY = 0;

canvas.width = 280;
canvas.height = 280;

function draw(e) {
    if (!drawing) return;
    e.preventDefault();

    let x, y;
    if (e.touches) {
        const rect = canvas.getBoundingClientRect();
        x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
        y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    } else {
        x = e.offsetX;
        y = e.offsetY;
    }

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    [lastX, lastY] = [x, y];
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
    lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseout', () => drawing = false);

// Touch events (HP)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
    lastY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', () => drawing = false);
canvas.addEventListener('touchcancel', () => drawing = false);

// Clear button
document.getElementById('clear-btn').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('prediction').innerText = '-';
    if (window.chartInstance) window.chartInstance.destroy();
    document.getElementById('probabilityChart').style.display = 'none';
});

// =============================================
// 2. LOAD MODEL (Sekali di awal)
// =============================================
let model = null;
let modelReady = false;

async function loadModel() {
    try {
        // Gunakan MNIST model dari TensorFlow
        model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/mnist_transfer_cnn_v1/model.json');
        modelReady = true;
        console.log('✅ Model siap digunakan');
        document.getElementById('prediction').innerText = 'READY';
    } catch (error) {
        console.error('❌ Gagal load model:', error);
        document.getElementById('prediction').innerText = 'ERROR';
    }
}

// Load model saat halaman dimuat
loadModel();

// =============================================
// 3. PREDIKSI (Langsung)
// =============================================
let chartInstance = null;

document.getElementById('predict-btn').addEventListener('click', async () => {
    if (!modelReady) {
        document.getElementById('prediction').innerText = 'WAIT';
        return;
    }

    // Ambil gambar dari canvas
    const imageData = ctx.getImageData(0, 0, 280, 280);
    
    // Konversi ke tensor
    const tensor = tf.browser.fromPixels(imageData, 1)
        .resizeNearestNeighbor([28, 28])
        .mean(2)
        .expandDims(2)
        .expandDims()
        .toFloat()
        .div(255.0);

    // Prediksi
    const predictions = await model.predict(tensor).data();
    tensor.dispose();

    // Hasil prediksi
    const maxIndex = predictions.indexOf(Math.max(...predictions));
    document.getElementById('prediction').innerText = maxIndex;

    // Diagram (langsung muncul)
    const labels = ['0','1','2','3','4','5','6','7','8','9'];
    const probabilities = Array.from(predictions).map(p => p * 100);

    const ctxChart = document.getElementById('probabilityChart').getContext('2d');
    document.getElementById('probabilityChart').style.display = 'block';

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctxChart, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'PROBABILITY (%)',
                data: probabilities,
                backgroundColor: probabilities.map((p, i) => 
                    i === maxIndex ? '#00ff41' : 'rgba(0, 255, 65, 0.25)'
                ),
                borderColor: probabilities.map((p, i) => 
                    i === maxIndex ? '#00ff41' : 'rgba(0, 255, 65, 0.5)'
                ),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 255, 65, 0.15)' },
                    ticks: { color: '#00ff41' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#00ff41' }
                }
            }
        }
    });
});