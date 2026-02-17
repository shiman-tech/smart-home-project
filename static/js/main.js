// Global variables
let isAuthenticated = true; // Track authentication state
let updateInterval = null;  // Track the interval for data updates

// Helper functions
async function handleApiResponse(response, errorMessage) {
    if (response.redirected && response.url.includes('/login')) {
        isAuthenticated = false;
        return null;
    }
    
    if (!response.ok) {
        throw new Error(errorMessage);
    }
    
    return response.json();
}

function showAuthMessage(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-lock me-2"></i>
            Please <a href="/login" class="alert-link">log in</a> to view this content
        </div>
    `;
}

// Form handlers
async function populateRoomDropdown() {
    try {
        const response = await fetch('/api/rooms');
        const rooms = await response.json();
        
        const addRoomSelect = document.getElementById('add_room_id');
        const editRoomSelect = document.getElementById('room_id');
        
        if (addRoomSelect || editRoomSelect) {
            const options = ['<option value="">Select a room</option>'];
            rooms.forEach(room => {
                options.push(`<option value="${room.room_id}">${room.room_name}</option>`);
            });
            
            if (addRoomSelect) {
                addRoomSelect.innerHTML = options.join('');
            }
            if (editRoomSelect) {
                editRoomSelect.innerHTML = options.join('');
            }
        }
    } catch (error) {
        console.error('Error populating room dropdown:', error);
        showAlert('error', 'Failed to load rooms');
    }
}

// Data update functions
function updateEnergyReadings() {
    if (!isAuthenticated) return;
    
    fetch('/api/energy-readings')
        .then(response => handleApiResponse(response, 'Failed to fetch energy readings'))
        .then(data => {
            const readingsContainer = document.getElementById('usageHistory');
            if (!readingsContainer) return;

            if (!data) {
                showAuthMessage(readingsContainer);
                return;
            }

            if (!data.length) {
                readingsContainer.innerHTML = '<div class="alert alert-info">No energy readings available</div>';
                return;
            }

            readingsContainer.innerHTML = data.map(reading => `
                <div class="reading-item">
                    <div class="reading-details">
                        <span class="appliance-name">${reading.appliance_name}</span>
                        <span class="current-power">${Number(reading.current_power).toFixed(2)} kWh</span>
                        <span class="status badge ${reading.status === 'Active' ? 'bg-success' : 'bg-secondary'}">${reading.status}</span>
                        <span class="timestamp text-muted">${reading.timestamp}</span>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching energy readings:', error);
            const readingsContainer = document.getElementById('usageHistory');
            if (readingsContainer) {
                readingsContainer.innerHTML = '<div class="alert alert-danger">Failed to load energy readings</div>';
            }
        });
}

function updateUsageHistory() {
    if (!isAuthenticated) return;
    
    fetch('/api/usage-history')
        .then(response => handleApiResponse(response, 'Failed to fetch usage history'))
        .then(data => {
            const historyContainer = document.getElementById('usageHistory');
            if (!historyContainer) return;

            if (!data) {
                showAuthMessage(historyContainer);
                return;
            }

            if (!data.length) {
                historyContainer.innerHTML = '<div class="alert alert-info">No usage history available</div>';
                return;
            }

            historyContainer.innerHTML = data.map(item => `
                <div class="history-item">
                    <div class="history-details">
                        <span class="timestamp">${item.timestamp}</span>
                        <span class="usage">${item.usage} kWh</span>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching usage history:', error);
            const historyContainer = document.getElementById('usageHistory');
            if (historyContainer) {
                historyContainer.innerHTML = '<div class="alert alert-danger">Failed to load usage history</div>';
            }
        });
}

// Container initialization
function initializeContainers() {
    const containers = {
        roomUsage: 'Loading room usage...',
        usageHistory: 'Loading energy readings...',
        alerts: 'Loading alerts...'
    };

    Object.entries(containers).forEach(([id, message]) => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `<div class="alert alert-info">${message}</div>`;
        }
    });
}

// Room usage display
function updateRoomWiseUsage() {
    const roomUsageContainer = document.getElementById('roomUsage');
    const editRoomBtn = document.getElementById('editRoomBtn');
    
    if (!roomUsageContainer) return;

    roomUsageContainer.innerHTML = '<div class="alert alert-info">Loading room data...</div>';

    fetch('/api/room-usage', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (response.redirected) {
            // Handle any redirection
            if (response.url.includes('/login')) {
                isAuthenticated = false;
                roomUsageContainer.innerHTML = '<div class="alert alert-warning">Please log in to view this content</div>';
                if (editRoomBtn) editRoomBtn.style.display = 'none';
                return null;
            }
            throw new Error('Unexpected redirection');
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Handle empty or invalid data
        if (!data || !Array.isArray(data) || !data.length) {
            roomUsageContainer.innerHTML = '<div class="alert alert-info">No rooms found</div>';
            if (editRoomBtn) editRoomBtn.style.display = 'none';
            return;
        }

        if (editRoomBtn) editRoomBtn.style.display = 'block';

        const roomCards = data.map(room => {
            const totalPower = room.total_power || 0;
            const applianceItems = (room.appliances || []).map(appliance => {
                const statusClass = (appliance.status || 'Inactive').toLowerCase() === 'active' ? 'active' : 'inactive';
                return `
                    <div class="appliance-item" data-appliance-id="${appliance.appliance_id}">
                        <div class="appliance-name">${appliance.appliance_name || 'Unknown'}</div>
                        <div class="appliance-details">
                            <span>Qty: ${appliance.quantity || 1}</span>
                            <span>Power: ${appliance.min_power_rating_watt || 0}W - ${appliance.max_power_rating_watt || 0}W</span>
                            <span>Usage: ${(appliance.current_usage || 0).toFixed(2)} kWh</span>
                            <span class="status-badge ${statusClass}">${appliance.status || 'Inactive'}</span>
                            <button type="button" class="btn btn-sm btn-outline-primary ms-2 edit-appliance-btn" data-appliance-id="${appliance.appliance_id}">Edit</button>
                            <button type="button" class="btn btn-sm btn-outline-danger ms-1 delete-appliance-btn" data-appliance-id="${appliance.appliance_id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="card mb-3 room-card" data-room-id="${room.room_id}">
                    <div class="card-body">
                        <h5 class="card-title d-flex justify-content-between align-items-center">
                            <span>${room.room_name}</span>
                            <div>
                                <button type="button" class="btn btn-sm btn-outline-primary edit-room-btn" data-room-id="${room.room_id}">Edit</button>
                                <button type="button" class="btn btn-sm btn-outline-danger delete-room-btn" data-room-id="${room.room_id}">Delete</button>
                            </div>
                        </h5>
                        <p class="card-text">Total Power: ${totalPower.toFixed(2)} W</p>
                        <div class="appliances-list">
                            <h6>Appliances:</h6>
                            ${applianceItems}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Update container
        roomUsageContainer.innerHTML = roomCards;
    })
    .catch(error => {
        console.error('Error updating room usage:', error);
        roomUsageContainer.innerHTML = '<div class="alert alert-danger">Failed to load room usage data: ' + error.message + '</div>';
    });
}

// Event delegation for room/appliance buttons (they are dynamically added)
document.addEventListener('click', function(e) {
    const editRoomBtn = e.target.closest('.edit-room-btn');
    const deleteRoomBtn = e.target.closest('.delete-room-btn');
    const editApplianceBtn = e.target.closest('.edit-appliance-btn');
    const deleteApplianceBtn = e.target.closest('.delete-appliance-btn');
    if (editRoomBtn) {
        const roomId = editRoomBtn.dataset.roomId;
        if (roomId) editRoom(roomId);
    } else if (deleteRoomBtn) {
        const roomId = deleteRoomBtn.dataset.roomId;
        if (roomId) deleteRoom(roomId);
    } else if (editApplianceBtn) {
        const applianceId = editApplianceBtn.dataset.applianceId;
        if (applianceId) editAppliance(applianceId);
    } else if (deleteApplianceBtn) {
        const applianceId = deleteApplianceBtn.dataset.applianceId;
        if (applianceId) deleteAppliance(applianceId);
    }
});

// DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    initializeContainers();
    updateRoomWiseUsage();
    updateEnergyAlerts();
    updateUsageHistory();
    startDataUpdates();
});

// Energy Alerts Function
function updateEnergyAlerts() {
    if (!isAuthenticated) return; // Skip if not authenticated
    
    fetch('/api/alerts')
        .then(response => handleApiResponse(response, 'Failed to fetch alerts'))
        .then(data => {
            const alertsContainer = document.getElementById('alertsContainer');
            if (!alertsContainer) return;

            if (!data) {
                showAuthMessage(alertsContainer);
                return;
            }

            if (!data.length) {
                alertsContainer.innerHTML = '<div class="alert alert-info">No alerts</div>';
                return;
            }

            alertsContainer.innerHTML = data.map(alert => `
                <div class="alert alert-${alert.type}">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span class="alert-message">${alert.message}</span>
                    <small class="d-block text-muted">${alert.timestamp}</small>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching alerts:', error);
            const alertsContainer = document.getElementById('alertsContainer');
            if (alertsContainer) {
                alertsContainer.innerHTML = '<div class="alert alert-danger">Failed to load alerts</div>';
            }
        });
}

// Dashboard Stats Function
function updateDashboardStats() {
    // TO DO: implement dashboard stats update logic
}

// Usage Chart Function
function updateUsageChart() {
    // TO DO: implement usage chart update logic
}

// Start Data Updates Function
function startDataUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => {
        updateEnergyReadings();
        updateRoomWiseUsage();
        updateEnergyAlerts();
        updateDashboardStats();
        updateUsageChart();
    }, 5000);
}

// Generate Simulation Data Function
function generateSimulationData() {
    // Stop current updates temporarily
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    const button = document.getElementById('simulateButton');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }
    fetch('/api/simulate-data', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(response => response.json())
    .then(data => {
        startDataUpdates();
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-play"></i> Simulate';
            showAlert(data.success ? 'success' : 'error', data.success ? 'Simulation data generated successfully' : (data.message || 'Failed to generate data'));
        }
        if (data.success) {
            updateEnergyReadings();
            updateRoomWiseUsage();
            updateEnergyAlerts();
            updateDashboardStats();
            updateUsageChart();
        }
    })
    .catch(error => {
        console.error('Error generating simulation data:', error);
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-play"></i> Simulate';
            showAlert('error', 'Failed to generate simulation data');
        }
        startDataUpdates();
    });
}

// Toast notifications (use alertContainer so we don't mix with alerts list)
function showAlert(type, message) {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// Edit Room Form Handler
function editRoom(roomId) {
    const modalEl = document.getElementById('editRoomModal');
    if (!modalEl) return;
    fetch(`/api/room-usage/${roomId}`)
        .then(response => handleApiResponse(response, 'Failed to fetch room details'))
        .then(room => {
            if (!room) return;
            const roomIdInput = document.getElementById('room_id');
            const roomNameInput = document.getElementById('edit_room_name');
            if (roomIdInput) roomIdInput.value = roomId;
            if (roomNameInput) roomNameInput.value = room.room_name || '';
            (new bootstrap.Modal(modalEl)).show();
        })
        .catch(error => console.error('Error fetching room details:', error));
}

// Add Room Form Handler
document.getElementById('addRoomForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    fetch('/api/add-room', { method: 'POST', body: formData })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal'))?.hide();
            e.target.reset();
            updateRoomWiseUsage();
            populateRoomDropdown();
            showAlert('success', 'Room added successfully');
        } else {
            showAlert('error', data.message || 'Failed to add room');
        }
    })
    .catch(error => { console.error(error); showAlert('error', 'Error adding room'); });
});

// Edit Appliance Form Handler
function editAppliance(applianceId) {
    const modalEl = document.getElementById('editApplianceModal');
    if (!modalEl) return;
    fetch(`/api/appliance/${applianceId}`)
        .then(response => handleApiResponse(response, 'Failed to fetch appliance details'))
        .then(appliance => {
            if (!appliance) return;
            document.getElementById('appliance_id').value = applianceId;
            document.getElementById('edit_appliance_name').value = appliance.appliance_name || '';
            document.getElementById('edit_quantity').value = appliance.quantity ?? 1;
            document.getElementById('edit_min_power_rating_watt').value = appliance.min_power_rating_watt ?? 0;
            document.getElementById('edit_max_power_rating_watt').value = appliance.max_power_rating_watt ?? 0;
            (new bootstrap.Modal(modalEl)).show();
        })
        .catch(error => console.error('Error fetching appliance details:', error));
}

// Delete Room Handler
function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room and all its appliances?')) return;
    fetch(`/api/delete-room/${roomId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Room deleted successfully');
                updateRoomWiseUsage();
                populateRoomDropdown();
            } else {
                showAlert('error', data.message || 'Failed to delete room');
            }
        })
        .catch(error => { console.error(error); showAlert('error', 'Failed to delete room'); });
}

// Delete Appliance Handler
function deleteAppliance(applianceId) {
    if (!confirm('Are you sure you want to delete this appliance?')) return;
    fetch(`/api/delete-appliance/${applianceId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Appliance deleted successfully');
                updateRoomWiseUsage();
            } else {
                showAlert('error', data.message || 'Failed to delete appliance');
            }
        })
        .catch(error => { console.error(error); showAlert('error', 'Failed to delete appliance'); });
}

// Edit Room Form Submission
document.getElementById('editRoomForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const roomId = formData.get('room_id');
    if (!roomId) return;
    fetch(`/api/edit-room/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_name: formData.get('room_name') })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'Room updated successfully');
            updateRoomWiseUsage();
            bootstrap.Modal.getInstance(document.getElementById('editRoomModal'))?.hide();
        } else {
            showAlert('error', data.message || 'Failed to edit room');
        }
    })
    .catch(error => { console.error(error); showAlert('error', 'Failed to edit room'); });
});

// Edit Appliance Form Submission
document.getElementById('editApplianceForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const applianceId = formData.get('appliance_id');
    if (!applianceId) return;
    fetch(`/api/edit-appliance/${applianceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            appliance_name: formData.get('appliance_name'),
            quantity: formData.get('quantity'),
            min_power_rating_watt: formData.get('min_power_rating_watt'),
            max_power_rating_watt: formData.get('max_power_rating_watt')
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'Appliance updated successfully');
            updateRoomWiseUsage();
            bootstrap.Modal.getInstance(document.getElementById('editApplianceModal'))?.hide();
        } else {
            showAlert('error', data.message || 'Failed to edit appliance');
        }
    })
    .catch(error => { console.error(error); showAlert('error', 'Failed to edit appliance'); });
});

function updateEnergyAlerts() {
    if (!isAuthenticated) return; // Skip if not authenticated
    
    fetch('/api/alerts')
        .then(response => handleApiResponse(response, 'Failed to fetch alerts'))
        .then(data => {
            const alertsContainer = document.getElementById('alertsContainer');
            if (!alertsContainer) return;

            if (!data) {
                showAuthMessage(alertsContainer);
                return;
            }

            if (!data.length) {
                alertsContainer.innerHTML = '<div class="alert alert-info">No alerts</div>';
                return;
            }

            alertsContainer.innerHTML = data.map(alert => `
                <div class="alert alert-${alert.type}">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span class="alert-message">${alert.message}</span>
                    <small class="d-block text-muted">${alert.timestamp}</small>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching alerts:', error);
            const alertsContainer = document.getElementById('alertsContainer');
            if (alertsContainer) {
                alertsContainer.innerHTML = '<div class="alert alert-danger">Failed to load alerts</div>';
            }
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Chart.js for monthly energy usage
    const chartCanvas = document.getElementById('usageChart');
    if (chartCanvas) {
        // Initialize empty chart with monthly usage dataset
        window.usageChart = new Chart(chartCanvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Energy (kWh)',
                    data: [],
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2,
                plugins: {
                    legend: { labels: { color: '#94a3b8' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Energy (kWh)', color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        title: { display: true, text: 'Month', color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // Initialize modals
    const addApplianceModal = new bootstrap.Modal(document.getElementById('addApplianceModal'));
    const editApplianceModal = new bootstrap.Modal(document.getElementById('editApplianceModal'));
    const addRoomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    const editRoomModal = new bootstrap.Modal(document.getElementById('editRoomModal'));

    // Event listener for Add Appliance modal
    addApplianceModal._element.addEventListener('show.bs.modal', function () {
        populateRoomDropdown();
    });

    // Initialize data updates
    startDataUpdates();
    updateUsageChart();

    // Update initial data
    updateEnergyReadings();
    updateRoomWiseUsage();
    updateEnergyAlerts();
    updateDashboardStats();

    // Start initial updates
    startDataUpdates();

    // Room form submission
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = new FormData(this);
                const response = await fetch('/api/add-room', {
                method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addRoomModal'));
                    modal.hide();
                    
                    // Reset form
                    this.reset();
                    
                    // Show success message
                    showAlert('success', 'Room added successfully');
                    
                    // Update room list
                updateRoomWiseUsage();
                    
                    // Update room dropdown in appliance form
                    populateRoomDropdown();
                } else {
                    showAlert('error', data.message || 'Failed to add room');
                }
            } catch (error) {
                console.error('Error adding room:', error);
                showAlert('error', 'Failed to add room');
            }
        });
    }

    // Event listener for Add Appliance Form Handler
    const applianceForm = document.getElementById('applianceForm');

    if (applianceForm) {
        // Handle form submission
        applianceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(applianceForm);
            
            fetch('/api/add-appliance', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const addApplianceModal = bootstrap.Modal.getInstance(document.getElementById('addApplianceModal'));
                    if (addApplianceModal) {
                        addApplianceModal.hide();
                    }
                    applianceForm.reset();
                    updateRoomWiseUsage();
                    showAlert('success', 'Appliance added successfully');
                } else {
                    showAlert('error', data.message || 'Failed to add appliance');
                }
            })
            .catch(error => {
                console.error('Error adding appliance:', error);
                showAlert('error', 'Failed to add appliance');
            });
        });
    }

    // Toggle appliance status (optional - API is no-op but keeps UI from breaking)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('toggle-status')) {
            const applianceId = e.target.dataset.applianceId;
            const fd = new FormData();
            fd.append('appliance_id', applianceId);
            fd.append('status', e.target.classList.contains('on') ? 'Off' : 'On');
            fetch('/api/update-appliance', { method: 'POST', body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    e.target.classList.toggle('on');
                    e.target.innerHTML = e.target.classList.contains('on') ? 'Turn Off' : 'Turn On';
                    updateRoomWiseUsage();
                }
            })
            .catch(err => console.error(err));
        }
    });

    // Add event listener for simulate button
    const simulateButton = document.getElementById('simulateButton');
    if (simulateButton) simulateButton.addEventListener('click', generateSimulationData);
    const simulateAlertsBtn = document.getElementById('simulateAlertsBtn');
    if (simulateAlertsBtn) simulateAlertsBtn.addEventListener('click', async function() {
        simulateAlertsBtn.disabled = true;
        simulateAlertsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
        try {
            const r = await fetch('/api/simulate-alerts', { method: 'POST' });
            const data = await r.json();
            if (data.success) {
                showAlert('success', data.message + (data.current_usage != null ? ' Current: ' + data.current_usage + ' kWh' : ''));
                updateEnergyAlerts();
                updateDashboardStats();
            } else showAlert('error', data.message || 'Failed');
        } catch (e) {
            showAlert('error', 'Failed to simulate alerts');
        }
        simulateAlertsBtn.disabled = false;
        simulateAlertsBtn.innerHTML = '<i class="fas fa-bell"></i> Simulate Alerts';
    });
});

// Function to show alerts
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.getElementById('alertContainer');
    if (container) {
        container.appendChild(alertDiv);
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Function to update dashboard stats
function updateDashboardStats() {
    if (!isAuthenticated) return;
    
    fetch('/api/dashboard-stats')
        .then(response => handleApiResponse(response, 'Failed to fetch dashboard stats'))
        .then(data => {
            const statsContainer = document.getElementById('dashboardStats');
            if (!statsContainer) return;

            if (!data) {
                showAuthMessage(statsContainer);
                return;
            }

            const today = typeof data.current_usage === 'number' ? data.current_usage.toFixed(2) : '0.00';
            const monthly = typeof data.monthly_usage === 'number' ? data.monthly_usage.toFixed(2) : '0.00';
            statsContainer.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="usage-stats">
                            <h6>Today's Usage</h6>
                            <h3>${today} kWh</h3>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="usage-stats">
                            <h6>Monthly Usage</h6>
                            <h3>${monthly} kWh</h3>
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error fetching dashboard stats:', error);
            const statsContainer = document.getElementById('dashboardStats');
            if (statsContainer) {
                statsContainer.innerHTML = '<div class="alert alert-danger">Failed to load dashboard stats</div>';
            }
        });
}

// Initialize last 7 days with 0
const dailyUsage = {};
const labels = [];

// Global function to start data updates
function startDataUpdates() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateInterval = setInterval(() => {
        updateEnergyReadings();
        updateRoomWiseUsage();
        updateEnergyAlerts();
        updateDashboardStats();
        updateUsageChart();
    }, 5000);
}

// Function to update usage chart
function updateUsageChart() {
    if (!isAuthenticated) return;
    
    fetch('/api/usage-history')
        .then(response => handleApiResponse(response, 'Failed to fetch usage history'))
        .then(data => {
            if (!data) return;

            // Initialize data arrays
            const labels = [];
            const values = [];

            // Process monthly data
            data.forEach(entry => {
                labels.push(entry.month);
                values.push(entry.energy_consumed);
            });

            // Update chart
            if (window.usageChart) {
                window.usageChart.data.labels = labels;
                window.usageChart.data.datasets[0].data = values;
                window.usageChart.update();
            }
        })
        .catch(error => {
            console.error('Error updating usage chart:', error);
        });
}
