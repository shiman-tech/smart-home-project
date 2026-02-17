document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    const addRoomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    const addApplianceModal = new bootstrap.Modal(document.getElementById('addApplianceModal'));
    const addUsageModal = new bootstrap.Modal(document.getElementById('addUsageModal'));
    console.log('DOM loaded');
    
    // Initialize Chart.js for real-time power usage
    const ctx = document.getElementById('usageChart').getContext('2d');
    const usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Power Usage (W)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Power (Watts)'
                    }
                }
            }
        }
    });

    // Update energy readings
    function updateEnergyReadings() {
        fetch('/api/energy-readings')
            .then(response => response.json())
            .then(data => {
                const readingsContainer = document.getElementById('usageHistory');
                readingsContainer.innerHTML = data.map(reading => `
                    <div class="reading-item">
                        <div class="reading-details">
                            <span class="appliance-name">${reading.appliance_name}</span>
                            <span class="current-power">${reading.current_power}</span>
                            <span class="status">${reading.status}</span>
                            <span class="timestamp">${reading.timestamp}</span>
                        </div>
                    </div>
                `).join('');
            });
    }

    // Update alerts
    function updateEnergyAlerts() {
        fetch('/api/alerts')
            .then(response => response.json())
            .then(data => {
                const alertsContainer = document.getElementById('alertsContainer');
                alertsContainer.innerHTML = data.map(alert => `
                    <div class="alert alert-${alert.type}">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <span class="alert-message">${alert.message}</span>
                        <span class="alert-timestamp">${alert.timestamp}</span>
                    </div>
                `).join('');
            });
    }

    // Update room-wise usage
    function updateRoomWiseUsage() {
        fetch('/api/room-wise-usage')
            .then(response => response.json())
            .then(data => {
                const roomsContainer = document.getElementById('roomsContainer');
                roomsContainer.innerHTML = '';
                data.forEach(room => {
                    const roomDiv = document.createElement('div');
                    roomDiv.className = 'card mb-3';
                    roomDiv.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title">${room.room_name}</h5>
                            <div class="usage-stats">
                                <p>Total Usage: ${room.total_usage}</p>
                            </div>
                            <div class="appliances-list">
                                <h6>Appliances:</h6>
                                ${room.appliances.map(appliance => `
                                    <div class="appliance-item">
                                        <span class="appliance-name">${appliance.name}</span>
                                        <span class="appliance-details">
                                            <span>Qty: ${appliance.quantity}</span>
                                            <span>Power: ${appliance.min_power} - ${appliance.max_power}</span>
                                            <span class="status-badge">${appliance.status}</span>
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    roomsContainer.appendChild(roomDiv);
                });
            });
    }

    // Initial data load
    updateEnergyReadings();
    updateRoomWiseUsage();
    updateEnergyAlerts();

    // Update every 5 seconds
    setInterval(() => {
        updateEnergyReadings();
        updateRoomWiseUsage();
        updateEnergyAlerts();
    }, 5000);

    // Add room form submission
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        console.log('Room form found');
        addRoomForm.addEventListener('submit', function(e) {
            console.log('Room form submitted');
            e.preventDefault();
            const formData = new FormData();
            formData.append('room_name', document.getElementById('roomName').value);
            console.log('Form data:', formData);
            
            fetch('/api/add-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Server response:', data);
                addRoomModal.hide();
                updateRoomWiseUsage();
                alert(data.message || 'Room added successfully');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error adding room');
            });
        });
    } else {
        console.error('Room form not found');
    }

    // Add appliance form submission
    const addApplianceForm = document.getElementById('addApplianceForm');
    if (addApplianceForm) {
        console.log('Appliance form found');
        addApplianceForm.addEventListener('submit', function(e) {
            console.log('Appliance form submitted');
            e.preventDefault();
            const formData = new FormData();
            formData.append('appliance_name', document.getElementById('applianceName').value);
            formData.append('room_id', document.getElementById('roomId').value);
            formData.append('max_power', document.getElementById('maxPower').value);
            console.log('Form data:', formData);
            
            fetch('/api/add-appliance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(formData)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Server response:', data);
                addApplianceModal.hide();
                updateRoomWiseUsage();
                alert(data.message || 'Appliance added successfully');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error adding appliance');
            });
        });
    } else {
        console.error('Appliance form not found');
    }

    // Toggle appliance status
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('toggle-status')) {
            const applianceId = e.target.dataset.applianceId;
            const isOn = e.target.classList.contains('on');
            
            fetch('/update_appliance_status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appliance_id: applianceId,
                    is_on: !isOn
                })
            })
            .then(response => response.json())
            .then(data => {
                e.target.classList.toggle('on');
                e.target.innerHTML = e.target.classList.contains('on') ? 'Turn Off' : 'Turn On';
                updateRoomWiseUsage();
            });
        }
    });

    // Populate room select when appliance modal opens
    document.getElementById('addApplianceModal').addEventListener('show.bs.modal', function() {
        fetch('/api/rooms')
            .then(response => response.json())
            .then(data => {
                const roomSelect = document.getElementById('roomId');
                roomSelect.innerHTML = data.map(room => `
                    <option value="${room.room_id}">${room.room_name}</option>
                `).join('');
            });
    });

    // Populate appliance select when usage modal opens
    document.getElementById('addUsageModal').addEventListener('show.bs.modal', function() {
        const roomId = document.getElementById('roomId').value;
        fetch(`/api/appliances?room_id=${roomId}`)
            .then(response => response.json())
            .then(data => {
                const applianceSelect = document.getElementById('applianceId');
                applianceSelect.innerHTML = data.map(appliance => `
                    <option value="${appliance.appliance_id}">${appliance.appliance_name}</option>
                `).join('');
            });
    });
});
