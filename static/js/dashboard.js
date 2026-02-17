// Function to generate simulation data
async function generateSimulationData() {
    try {
        const button = document.querySelector('button[onclick="generateSimulationData()"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        button.disabled = true;

        const response = await fetch('/api/simulate-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            // Refresh all data displays
            updateDashboardStats();
            updateUsageHistory();
            updateRoomUsage();
            updateUsageChart();
            updateAlerts();
            
            // Show success message
            showAlert('success', 'Simulation data generated successfully!');
        } else {
            showAlert('error', data.message || 'Failed to generate simulation data');
        }
    } catch (error) {
        console.error('Error generating simulation data:', error);
        showAlert('error', 'Failed to generate simulation data');
    } finally {
        const button = document.querySelector('button[onclick="generateSimulationData()"]');
        button.innerHTML = '<i class="fas fa-play"></i> Generate Simulation Data';
        button.disabled = false;
    }
}

// Function to update dashboard statistics
async function updateDashboardStats() {
    try {
        const response = await fetch('/api/dashboard-stats');
        const data = await response.json();
        
        document.getElementById('currentUsage').textContent = data.current_usage.toFixed(2) + ' kWh';
        document.getElementById('todayUsage').textContent = data.today_usage.toFixed(2) + ' kWh';
        document.getElementById('monthlyUsage').textContent = data.monthly_usage.toFixed(2) + ' kWh';
        document.getElementById('totalUsage').textContent = data.total_usage.toFixed(2) + ' kWh';
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Function to update usage history
async function updateUsageHistory() {
    try {
        const response = await fetch('/api/usage-history');
        const data = await response.json();
        
        const historyContainer = document.getElementById('usageHistory');
        if (!historyContainer) {
            console.error('Could not find usage history container');
            return;
        }
        
        historyContainer.innerHTML = '';
        
        if (!Array.isArray(data) || data.length === 0) {
            historyContainer.innerHTML = '<div class="text-center text-muted">No usage history available</div>';
            return;
        }
        
        data.forEach(log => {
            if (!log) return;
            
            const logEntry = document.createElement('div');
            logEntry.className = 'mb-2 p-2 border-bottom';
            logEntry.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${log.appliance || 'Unknown Device'}</strong>
                        <span class="ms-2">${typeof log.energy === 'number' ? log.energy.toFixed(2) : '0.00'} kWh</span>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteUsageLog(${log.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="small text-muted">
                    Duration: ${typeof log.duration === 'number' ? log.duration.toFixed(1) : '0.0'} hours<br>
                    Time: ${log.timestamp || 'Unknown'}
                </div>
            `;
            historyContainer.appendChild(logEntry);
        });
    } catch (error) {
        console.error('Error updating usage history:', error);
    }
}

// Function to update room usage
async function updateRoomUsage() {
    try {
        const response = await fetch('/api/room-usage');
        const data = await response.json();
        
        const roomsContainer = document.getElementById('roomsContainer');
        roomsContainer.innerHTML = '';
        
        data.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'col-md-4 mb-4';
            roomCard.innerHTML = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${room.room_name}</h5>
                        <button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <h6>Total Usage: ${room.total_usage.toFixed(2)} kWh</h6>
                        <div class="appliance-list">
                            ${room.appliances.map(app => `
                                <div class="appliance-item border-bottom py-2">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <strong>${app.name}</strong>
                                        <div>
                                            <span class="badge ${app.status === 'on' ? 'bg-success' : 'bg-secondary'}">${app.status}</span>
                                            <button class="btn btn-sm btn-danger ms-2" onclick="deleteAppliance(${app.id})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="small text-muted">
                                        Quantity: ${app.quantity}<br>
                                        Power Rating: ${app.min_power}-${app.max_power}W<br>
                                        Current Usage: ${app.energy_consumed ? app.energy_consumed.toFixed(2) : '0.00'} kWh
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            roomsContainer.appendChild(roomCard);
        });
    } catch (error) {
        console.error('Error updating room usage:', error);
    }
}

// Function to update usage chart
async function updateUsageChart() {
    try {
        const response = await fetch('/api/energy-readings');
        let chartData = await response.json();
        
        const canvas = document.getElementById('usageChart');
        if (!canvas) {
            console.error('Could not find chart canvas element');
            return;
        }

        // Get the 2D context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context from canvas');
            return;
        }

        // Destroy existing chart instance properly
        if (window.usageChart instanceof Chart) {
            window.usageChart.destroy();
        }
        
        // If no data, show empty chart
        if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
            chartData = [{
                timestamp: new Date().toISOString(),
                energy: 0,
                appliance: 'No Data'
            }];
        }

        // Process and validate the data
        chartData = chartData.map(reading => ({
            timestamp: reading.timestamp || new Date().toISOString(),
            energy: typeof reading.energy === 'number' ? reading.energy : 0,
            appliance: reading.appliance || 'Unknown Device'
        }));
        
        const data = {
            labels: chartData.map(reading => {
                const date = new Date(reading.timestamp);
                return date.toLocaleString();
            }),
            datasets: [{
                label: 'Energy Usage (kWh)',
                data: chartData.map(reading => reading.energy),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        };
        
        // Create new chart instance
        window.usageChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Real-time Energy Usage'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const reading = chartData[context.dataIndex];
                                return `${reading.appliance}: ${reading.energy.toFixed(2)} kWh`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Energy (kWh)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating usage chart:', error);
    }
}

// Function to update alerts
async function updateAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const data = await response.json();
        
        const alertsContainer = document.getElementById('alertsContainer');
        alertsContainer.innerHTML = '';
        
        data.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert alert-${alert.level === 'High' ? 'danger' : 'warning'} mb-2`;
            alertElement.innerHTML = `
                <strong>${alert.level} Usage Alert:</strong> ${alert.message}
                <br>
                <small class="text-muted">${alert.date}</small>
            `;
            alertsContainer.appendChild(alertElement);
        });
    } catch (error) {
        console.error('Error updating alerts:', error);
    }
}

// Function to show alert messages
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Function to simulate alerts
async function simulateAlerts() {
    try {
        const button = document.querySelector('button[onclick="simulateAlerts()"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Simulating...';
        button.disabled = true;

        const response = await fetch('/api/simulate-alerts', {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', `Alerts generated successfully. Current usage: ${data.current_usage} kWh`);
            updateAlerts();
        } else {
            showAlert('error', data.message || 'Failed to generate alerts');
        }
    } catch (error) {
        console.error('Error simulating alerts:', error);
        showAlert('error', 'Failed to generate alerts');
    } finally {
        const button = document.querySelector('button[onclick="simulateAlerts()"]');
        button.innerHTML = '<i class="fas fa-bell"></i> Simulate Alerts';
        button.disabled = false;
    }
}

// Function to delete a room
async function deleteRoom(roomId) {
    if (!confirm('Are you sure you want to delete this room? This will also delete all associated appliances and usage logs.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/delete-room/${roomId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'Room deleted successfully');
            updateRoomUsage();
            updateUsageHistory();
            updateUsageChart();
            updateDashboardStats();
        } else {
            showAlert('error', data.message || 'Failed to delete room');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        showAlert('error', 'Failed to delete room');
    }
}

// Function to delete an appliance
async function deleteAppliance(applianceId) {
    if (!confirm('Are you sure you want to delete this appliance? This will also delete all associated usage logs.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/delete-appliance/${applianceId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'Appliance deleted successfully');
            updateRoomUsage();
            updateUsageHistory();
            updateUsageChart();
            updateDashboardStats();
        } else {
            showAlert('error', data.message || 'Failed to delete appliance');
        }
    } catch (error) {
        console.error('Error deleting appliance:', error);
        showAlert('error', 'Failed to delete appliance');
    }
}

// Function to delete a usage log
async function deleteUsageLog(logId) {
    if (!confirm('Are you sure you want to delete this usage log?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/delete-usage-log/${logId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', 'Usage log deleted successfully');
            updateUsageHistory();
            updateUsageChart();
            updateDashboardStats();
        } else {
            showAlert('error', data.message || 'Failed to delete usage log');
        }
    } catch (error) {
        console.error('Error deleting usage log:', error);
        showAlert('error', 'Failed to delete usage log');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Chart.js to load
    setTimeout(() => {
        updateDashboardStats();
        updateUsageHistory();
        updateRoomUsage();
        updateUsageChart();
        updateAlerts();
    }, 500);
}); 