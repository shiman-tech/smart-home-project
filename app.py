from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from datetime import datetime, timedelta
import os
from models import User, Room, Appliance, UsageLog, ThresholdLevels, ThresholdAlerts
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_session, remove_session, initialize_database
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@app.teardown_appcontext
def shutdown_session(exception=None):
    remove_session()

@login_manager.user_loader
def load_user(user_id):
    session = get_session()
    try:
        return session.query(User).get(int(user_id))
    except:
        return None

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        session = get_session()
        try:
            email = request.form.get('email')
            password = request.form.get('password')
            first_name = request.form.get('first_name')
            last_name = request.form.get('last_name')
            country_code = request.form.get('country_code')
            phone_number = request.form.get('phone_number')
            security_question = request.form.get('security_question')
            security_answer = request.form.get('security_answer')
            
            # Validate required fields
            if not all([email, password, first_name, last_name, security_question, security_answer]):
                flash('Please fill in all required fields')
                return redirect(url_for('register'))
            
            user = session.query(User).filter_by(email=email).first()
            if user:
                flash('Email already exists')
                return redirect(url_for('register'))
            
            new_user = User(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                security_question=security_question,
                security_answer=security_answer,
                country_code=country_code,
                phone_number=phone_number
            )
            
            session.add(new_user)
            session.commit()
            
            login_user(new_user)
            flash('Registration successful! Please verify your security question.')
            return redirect(url_for('dashboard'))
        except Exception as e:
            session.rollback()
            flash(f'Error during registration: {str(e)}')
            return redirect(url_for('register'))
        finally:
            remove_session()
    
    return render_template('register.html')

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        session = get_session()
        try:
            email = request.form.get('email')
            user = session.query(User).filter_by(email=email).first()
            
            if not user:
                flash('Email not found')
                return redirect(url_for('forgot_password'))
            
            return redirect(url_for('verify_security', email=email))
        except Exception as e:
            flash(f'Error: {str(e)}')
            return redirect(url_for('forgot_password'))
        finally:
            remove_session()
    
    return render_template('forgot_password.html')

@app.route('/verify-security', methods=['GET', 'POST'])
def verify_security():
    if request.method == 'POST':
        session = get_session()
        try:
            email = request.form.get('email')
            security_answer = request.form.get('security_answer')
            
            user = session.query(User).filter_by(email=email).first()
            if not user:
                flash('Invalid email')
                return redirect(url_for('forgot_password'))
            
            if not user.check_security_answer(security_answer):
                flash('Incorrect security answer')
                return redirect(url_for('verify_security', email=email))
            
            return redirect(url_for('reset_password', email=email))
        except Exception as e:
            flash(f'Error: {str(e)}')
            return redirect(url_for('verify_security', email=email))
        finally:
            remove_session()
    
    email = request.args.get('email')
    if not email:
        return redirect(url_for('forgot_password'))
    
    session = get_session()
    user = session.query(User).filter_by(email=email).first()
    session.close()
    
    if not user:
        return redirect(url_for('forgot_password'))
    
    return render_template('verify_security.html', email=email, security_question=user.security_question)

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if request.method == 'POST':
        session = get_session()
        try:
            email = request.form.get('email')
            new_password = request.form.get('new_password')
            confirm_password = request.form.get('confirm_password')
            
            if new_password != confirm_password:
                flash('Passwords do not match')
                return redirect(url_for('reset_password', email=email))
            
            user = session.query(User).filter_by(email=email).first()
            if not user:
                flash('Invalid email')
                return redirect(url_for('forgot_password'))
            
            user.password = generate_password_hash(new_password)
            session.commit()
            
            flash('Password reset successful! Please login with your new password.')
            return redirect(url_for('login'))
        except Exception as e:
            session.rollback()
            flash(f'Error: {str(e)}')
            return redirect(url_for('reset_password', email=email))
        finally:
            remove_session()
    
    email = request.args.get('email')
    if not email:
        return redirect(url_for('forgot_password'))
    
    return render_template('reset_password.html', email=email)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        session = get_session()
        try:
            email = request.form.get('email')
            password = request.form.get('password')
            
            print(f"Login attempt for email: {email}")  # Debug log
            
            if not email or not password:
                flash('Please provide both email and password', 'error')
                return redirect(url_for('login'))
            
            user = session.query(User).filter_by(email=email).first()
            if user and user.check_password(password):
                login_user(user)
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard'))
            flash('Invalid email or password', 'error')
            return redirect(url_for('login'))
        except Exception as e:
            print(f"Login error: {str(e)}")
            flash('An error occurred during login', 'error')
            return redirect(url_for('login'))
        finally:
            remove_session()
            
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out successfully', 'success')
    return redirect(url_for('login'))

@app.route('/api/simulate-data', methods=['POST'])
@login_required
def simulate_data():
    session = get_session()
    try:
        # Get user's rooms and appliances
        rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        
        if not rooms:
            return jsonify({
                'success': False,
                'message': 'Please add at least one room first'
            }), 400

        # Get current timestamp
        now = datetime.now()
        
        # Generate data for the last 7 days
        for room in rooms:
            appliances = session.query(Appliance).filter_by(room_id=room.room_id).all()
            
            for appliance in appliances:
                # Generate realistic usage patterns for each day
                for day in range(7):
                    date = now - timedelta(days=day)
                    
                    # Morning peak (7-9 AM)
                    morning_usage = random.uniform(0.5, 1.5) * appliance.max_power_rating_watt / 1000  # Convert to kWh
                    morning_time = date.replace(hour=random.randint(7, 9), minute=random.randint(0, 59))
                    
                    # Afternoon usage (12-2 PM)
                    afternoon_usage = random.uniform(0.3, 0.8) * appliance.max_power_rating_watt / 1000
                    afternoon_time = date.replace(hour=random.randint(12, 14), minute=random.randint(0, 59))
                    
                    # Evening peak (6-10 PM)
                    evening_usage = random.uniform(0.7, 2.0) * appliance.max_power_rating_watt / 1000
                    evening_time = date.replace(hour=random.randint(18, 22), minute=random.randint(0, 59))
                    
                    # Create usage logs
                    usage_logs = [
                        UsageLog(
                            appliance_id=appliance.appliance_id,
                            energy_consumed=morning_usage,
                            duration_hours=2.0,
                            timestamp=morning_time
                        ),
                        UsageLog(
                            appliance_id=appliance.appliance_id,
                            energy_consumed=afternoon_usage,
                            duration_hours=2.0,
                            timestamp=afternoon_time
                        ),
                        UsageLog(
                            appliance_id=appliance.appliance_id,
                            energy_consumed=evening_usage,
                            duration_hours=4.0,
                            timestamp=evening_time
                        )
                    ]
                    
                    session.add_all(usage_logs)
        
        session.commit()
        return jsonify({'success': True, 'message': 'Simulation data generated successfully'})
    
    except Exception as e:
        session.rollback()
        print(f"Error generating simulation data: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to generate simulation data'}), 500
    finally:
        session.close()

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/usage-data')
@login_required
def get_usage_data():
    session = get_session()
    try:
        user_rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        data = []
        for room in user_rooms:
            room_data = {'room_name': room.room_name, 'appliances': []}
            for appliance in room.appliances:
                latest_log = session.query(UsageLog).filter_by(appliance_id=appliance.appliance_id).order_by(UsageLog.timestamp.desc()).first()
                if latest_log:
                    room_data['appliances'].append({
                        'name': appliance.appliance_name,
                        'energy_consumed': latest_log.energy_consumed,
                        'timestamp': latest_log.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    })
            data.append(room_data)
        return jsonify(data)
    finally:
        session.close()

@app.route('/api/dashboard-stats')
@login_required
def get_dashboard_stats():
    session = get_session()
    try:
        user_rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        all_logs = []
        for room in user_rooms:
            for appliance in room.appliances:
                logs = session.query(UsageLog).filter_by(appliance_id=appliance.appliance_id).all()
                all_logs.extend(logs)
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        month_start = datetime(now.year, now.month, 1)
        current_usage = sum(log.energy_consumed for log in all_logs if log.energy_consumed and log.timestamp >= today_start)
        monthly_usage = sum(log.energy_consumed for log in all_logs if log.energy_consumed and log.timestamp >= month_start)
        alerts = session.query(ThresholdAlerts).filter_by(user_id=current_user.user_id).order_by(ThresholdAlerts.alert_date.desc()).all()
        return jsonify({
            'current_usage': round(current_usage, 2),
            'monthly_usage': round(monthly_usage, 2),
            'alerts': [{'level': alert.level_id, 'date': alert.alert_date.strftime('%Y-%m-%d'), 'message': f"Energy usage exceeded {alert.level_id} threshold"} for alert in alerts]
        })
    except Exception as e:
        print(f"Error in dashboard stats: {str(e)}")
        return jsonify({'current_usage': 0, 'monthly_usage': 0, 'alerts': []})
    finally:
        session.close()

@app.route('/api/alerts')
@login_required
def get_alerts():
    session = get_session()
    try:
        alerts = session.query(ThresholdAlerts).filter_by(user_id=current_user.user_id).order_by(ThresholdAlerts.alert_date.desc()).limit(10).all()
        return jsonify([{
            'type': 'warning' if alert.level_id == 'Warning' else 'danger',
            'message': f'Energy usage reached {alert.level_id} level ({alert.current_kwh} kWh)',
            'timestamp': alert.alert_date.strftime('%Y-%m-%d %H:%M:%S')
        } for alert in alerts])
    except Exception as e:
        print(f"Error getting alerts: {e}")
        return jsonify([])
    finally:
        session.close()

@app.route('/api/energy-readings')
@login_required
def get_energy_readings():
    session = get_session()
    try:
        user_rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        appliances = []
        for room in user_rooms:
            appliances.extend(room.appliances)
        readings = []
        for appliance in appliances:
            latest_log = session.query(UsageLog).filter_by(appliance_id=appliance.appliance_id).order_by(UsageLog.timestamp.desc()).first()
            readings.append({
                'appliance_name': appliance.appliance_name,
                'current_power': latest_log.energy_consumed if latest_log else 0,
                'status': 'Active' if latest_log else 'Inactive',
                'timestamp': latest_log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if latest_log else 'N/A'
            })
        return jsonify(readings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/usage-history')
@login_required
def get_usage_history():
    """Get monthly usage history for the current user's appliances"""
    session = get_session()
    try:
        # Get current year and month
        now = datetime.now()
        current_year = now.year
        
        # Get usage logs for the current year
        logs = session.query(UsageLog)\
            .join(Appliance)\
            .join(Room)\
            .filter(
                Room.user_id == current_user.user_id,
                UsageLog.timestamp >= datetime(current_year, 1, 1)
            )\
            .order_by(UsageLog.timestamp.asc())\
            .all()
            
        # Group logs by month and sum energy consumption
        monthly_usage = {}
        for log in logs:
            month_str = log.timestamp.strftime('%b %Y')  # Format: Jan 2025
            if month_str not in monthly_usage:
                monthly_usage[month_str] = 0
            monthly_usage[month_str] += log.energy_consumed
            
        # Get months from January to current month
        current_month = now.month
        result = []
        for month in range(1, current_month + 1):
            month_str = datetime(current_year, month, 1).strftime('%b %Y')
            result.append({
                'month': month_str,
                'energy_consumed': monthly_usage.get(month_str, 0),
                'timestamp': datetime(current_year, month, 1).strftime('%Y-%m-%d %H:%M:%S')
            })
            
        return jsonify(result)
    except Exception as e:
        print(f"Error getting usage history: {e}")
        return jsonify([])
    finally:
        remove_session()

@app.route('/api/rooms')
@login_required
def get_rooms():
    """Get all available rooms for the current user"""
    session = get_session()
    try:
        rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        return jsonify([{'room_id': room.room_id, 'room_name': room.room_name} for room in rooms])
    except Exception as e:
        print(f"Error getting rooms: {e}")
        return jsonify([])
    finally:
        session.close()

@app.route('/api/room-usage')
@login_required
def get_room_usage():
    session = get_session()
    try:
        # Get all rooms for current user
        rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        
        if not rooms:
            return jsonify([])
            
        room_data = []
        for room in rooms:
            # Get all appliances in this room
            appliances = session.query(Appliance).filter_by(room_id=room.room_id).all()
            
            # Calculate total power for the room (with None handling)
            total_power = sum(
                ((appliance.min_power_rating_watt or 0) + (appliance.max_power_rating_watt or 0)) / 2 * (appliance.quantity or 1)
                for appliance in appliances
            ) if appliances else 0
            
            # Prepare appliance data
            appliance_data = []
            for appliance in appliances:
                # Get the latest usage log for this appliance
                latest_usage = session.query(UsageLog).filter_by(
                    appliance_id=appliance.appliance_id
                ).order_by(UsageLog.timestamp.desc()).first()
                
                status = 'Active' if latest_usage else 'Inactive'
                current_usage = latest_usage.energy_consumed if latest_usage else 0
                
                appliance_data.append({
                    'appliance_id': appliance.appliance_id,
                    'appliance_name': appliance.appliance_name or 'Unknown',
                    'quantity': appliance.quantity or 1,
                    'min_power_rating_watt': appliance.min_power_rating_watt or 0,
                    'max_power_rating_watt': appliance.max_power_rating_watt or 0,
                    'current_usage': current_usage,
                    'status': status
                })
            
            room_data.append({
                'room_id': room.room_id,
                'room_name': room.room_name or 'Unknown Room',
                'total_power': total_power,
                'appliances': appliance_data
            })
        
        return jsonify(room_data)
    except Exception as e:
        print(f"Error getting room usage: {e}")
        session.rollback()
        return jsonify([]), 500
    finally:
        session.close()

@app.route('/api/room-wise-usage')
@login_required
def get_room_wise_usage():
    """Alias for room-usage for frontend compatibility."""
    return get_room_usage()

@app.route('/api/room-usage/<int:room_id>')
@login_required
def get_room_by_id(room_id):
    session = get_session()
    try:
        room = session.query(Room).filter_by(room_id=room_id, user_id=current_user.user_id).first()
        if not room:
            return jsonify({'error': 'Room not found'}), 404
        return jsonify({'room_id': room.room_id, 'room_name': room.room_name})
    finally:
        session.close()

@app.route('/api/edit-room/<int:room_id>', methods=['POST', 'PUT'])
@login_required
def edit_room(room_id):
    session = get_session()
    try:
        room = session.query(Room).filter_by(room_id=room_id, user_id=current_user.user_id).first()
        if not room:
            return jsonify({'success': False, 'message': 'Room not found'}), 404
        data = request.get_json(silent=True) or request.form
        name = (data.get('room_name') or '').strip()
        if name:
            room.room_name = name
            session.commit()
            return jsonify({'success': True, 'message': 'Room updated'})
        return jsonify({'success': False, 'message': 'Room name required'}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/appliance/<int:appliance_id>')
@login_required
def get_appliance_by_id(appliance_id):
    session = get_session()
    try:
        app = session.query(Appliance).join(Room).filter(
            Appliance.appliance_id == appliance_id,
            Room.user_id == current_user.user_id
        ).first()
        if not app:
            return jsonify({'error': 'Appliance not found'}), 404
        return jsonify({
            'appliance_id': app.appliance_id,
            'appliance_name': app.appliance_name,
            'quantity': app.quantity,
            'min_power_rating_watt': app.min_power_rating_watt,
            'max_power_rating_watt': app.max_power_rating_watt
        })
    finally:
        session.close()

@app.route('/api/edit-appliance/<int:appliance_id>', methods=['POST', 'PUT'])
@login_required
def edit_appliance(appliance_id):
    session = get_session()
    try:
        app = session.query(Appliance).join(Room).filter(
            Appliance.appliance_id == appliance_id,
            Room.user_id == current_user.user_id
        ).first()
        if not app:
            return jsonify({'success': False, 'message': 'Appliance not found'}), 404
        data = request.get_json(silent=True) or request.form
        if data.get('appliance_name'):
            app.appliance_name = data.get('appliance_name')
        if data.get('quantity') is not None:
            app.quantity = int(data.get('quantity'))
        if data.get('min_power_rating_watt') is not None:
            app.min_power_rating_watt = float(data.get('min_power_rating_watt'))
        if data.get('max_power_rating_watt') is not None:
            app.max_power_rating_watt = float(data.get('max_power_rating_watt'))
        session.commit()
        return jsonify({'success': True, 'message': 'Appliance updated'})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/add-appliance', methods=['POST'])
@login_required
def add_appliance():
    session = get_session()
    try:
        appliance_name = request.form.get('appliance_name')
        room_id = request.form.get('room_id')
        max_power_rating_watt = request.form.get('max_power_rating_watt')
        quantity = request.form.get('quantity', 1)
        
        if not all([appliance_name, room_id, max_power_rating_watt]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
            
        # Check if room exists and belongs to current user
        room = session.query(Room).filter_by(room_id=room_id, user_id=current_user.user_id).first()
        if not room:
            return jsonify({'success': False, 'message': 'Room not found or unauthorized'}), 404
            
        min_power_rating_watt = request.form.get('min_power_rating_watt', 0)
        new_appliance = Appliance(
            appliance_name=appliance_name,
            min_power_rating_watt=float(min_power_rating_watt),
            max_power_rating_watt=float(max_power_rating_watt),
            quantity=int(quantity),
            room_id=int(room_id)
        )
        session.add(new_appliance)
        session.commit()
        return jsonify({'success': True, 'message': 'Appliance added successfully', 'appliance_id': new_appliance.appliance_id})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        remove_session()

@app.route('/api/update-appliance', methods=['POST'])
@login_required
def update_appliance_status():
    """Appliance model has no status field; endpoint kept for API compatibility."""
    return jsonify({'success': True, 'message': 'OK'})

@app.route('/api/delete-room/<int:room_id>', methods=['DELETE'])
@login_required
def delete_room(room_id):
    session = get_session()
    try:
        room = session.query(Room).filter_by(room_id=room_id, user_id=current_user.user_id).first()
        if not room:
            return jsonify({'success': False, 'message': 'Room not found'}), 404
        for appliance in room.appliances:
            session.query(UsageLog).filter_by(appliance_id=appliance.appliance_id).delete()
            session.delete(appliance)
        session.delete(room)
        session.commit()
        return jsonify({'success': True, 'message': 'Room and associated items deleted'})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/delete-appliance/<int:appliance_id>', methods=['DELETE'])
@login_required
def delete_appliance(appliance_id):
    session = get_session()
    try:
        appliance = session.query(Appliance).join(Room).filter(Appliance.appliance_id == appliance_id, Room.user_id == current_user.user_id).first()
        if not appliance:
            return jsonify({'success': False, 'message': 'Appliance not found'}), 404
        session.query(UsageLog).filter_by(appliance_id=appliance_id).delete()
        session.delete(appliance)
        session.commit()
        return jsonify({'success': True, 'message': 'Appliance and usage logs deleted'})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/delete-usage-log/<int:log_id>', methods=['DELETE'])
@login_required
def delete_usage_log(log_id):
    session = get_session()
    try:
        log = session.query(UsageLog).join(Appliance).join(Room).filter(UsageLog.log_id == log_id, Room.user_id == current_user.user_id).first()
        if not log:
            return jsonify({'success': False, 'message': 'Log entry not found'}), 404
        session.delete(log)
        session.commit()
        return jsonify({'success': True, 'message': 'Log entry deleted'})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/simulate-alerts', methods=['POST'])
@login_required
def simulate_alerts():
    session = get_session()
    try:
        end_time = datetime.utcnow()
        start_time = end_time.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_usage = 0
        user_rooms = session.query(Room).filter_by(user_id=current_user.user_id).all()
        for room in user_rooms:
            for appliance in room.appliances:
                logs = session.query(UsageLog).filter(
                    UsageLog.appliance_id == appliance.appliance_id,
                    UsageLog.timestamp >= start_time,
                    UsageLog.timestamp <= end_time
                ).all()
                total_usage += sum(log.energy_consumed or 0 for log in logs)
        thresholds = session.query(ThresholdLevels).filter_by(user_id=current_user.user_id).first()
        if not thresholds:
            thresholds = ThresholdLevels(user_id=current_user.user_id, warning_kwh=30, critical_kwh=35)
            session.add(thresholds)
            session.commit()
        alerts = []
        if total_usage >= thresholds.critical_kwh:
            session.query(ThresholdAlerts).filter(
                ThresholdAlerts.user_id == current_user.user_id,
                ThresholdAlerts.level_id == 'Critical',
                ThresholdAlerts.alert_date >= start_time
            ).delete()
            alerts.append(ThresholdAlerts(user_id=current_user.user_id, level_id='Critical', alert_date=end_time, current_kwh=total_usage))
        elif total_usage >= thresholds.warning_kwh:
            session.query(ThresholdAlerts).filter(
                ThresholdAlerts.user_id == current_user.user_id,
                ThresholdAlerts.level_id == 'Warning',
                ThresholdAlerts.alert_date >= start_time
            ).delete()
            alerts.append(ThresholdAlerts(user_id=current_user.user_id, level_id='Warning', alert_date=end_time, current_kwh=total_usage))
        if alerts:
            session.add_all(alerts)
            session.commit()
        return jsonify({
            'success': True,
            'message': f'Generated {len(alerts)} alerts',
            'current_usage': round(total_usage, 2),
            'warning_threshold': thresholds.warning_kwh,
            'critical_threshold': thresholds.critical_kwh,
            'alerts': [{'level': a.level_id, 'current_kwh': a.current_kwh, 'date': a.alert_date.strftime('%Y-%m-%d %H:%M:%S')} for a in alerts]
        })
    except Exception as e:
        session.rollback()
        print(f"Error simulating alerts: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

@app.route('/api/add-room', methods=['POST'])
@login_required
def add_room():
    session = get_session()
    try:
        room_name = request.form.get('room_name')
        if not room_name:
            return jsonify({
                'success': False,
                'message': 'Room name is required'
            }), 400

        # Check if room already exists for this user
        existing_room = session.query(Room).filter_by(
            user_id=current_user.user_id,
            room_name=room_name
        ).first()

        if existing_room:
            return jsonify({
                'success': False,
                'message': 'A room with this name already exists'
            }), 400

        # Create new room
        new_room = Room(
            room_name=room_name,
            user_id=current_user.user_id
        )
        session.add(new_room)
        session.commit()

        return jsonify({
            'success': True,
            'message': 'Room added successfully',
            'room': {
                'room_id': new_room.room_id,
                'room_name': new_room.room_name
            }
        })

    except Exception as e:
        session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error adding room: {str(e)}'
        }), 500

@app.route('/api/update-thresholds', methods=['POST'])
@login_required
def update_thresholds():
    session = get_session()
    try:
        data = request.get_json(silent=True) or request.form
        warning_kwh = float(data.get('warning_kwh', 30))
        critical_kwh = float(data.get('critical_kwh', 35))
        thresholds = session.query(ThresholdLevels).filter_by(user_id=current_user.user_id).first()
        if not thresholds:
            thresholds = ThresholdLevels(user_id=current_user.user_id, warning_kwh=warning_kwh, critical_kwh=critical_kwh)
            session.add(thresholds)
        else:
            thresholds.warning_kwh = warning_kwh
            thresholds.critical_kwh = critical_kwh
        session.commit()
        return jsonify({'success': True, 'message': 'Thresholds updated'})
    except Exception as e:
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

if __name__ == '__main__':
    initialize_database()
    app.run(debug=True)
