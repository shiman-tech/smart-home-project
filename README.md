# Smart Home Energy Monitor

A web application for tracking and visualizing energy consumption across rooms and appliances in your home. Built with Flask, it provides a dashboard for monitoring usage, setting thresholds, and receiving alerts when consumption exceeds your limits.

---

## Features

- **User accounts** — Register, log in, and manage your profile with optional phone number. Password recovery via security question and answer.
- **Rooms & appliances** — Organize your home by rooms and add appliances with min/max power ratings (watts) and quantity.
- **Usage tracking** — Record energy consumption (kWh) per appliance with timestamps and duration.
- **Dashboard** — View today’s and monthly usage, power usage over time chart, and recent energy readings.
- **Thresholds & alerts** — Set warning and critical kWh limits; get alerts when usage exceeds them.
- **Simulation** — Generate sample usage data (e.g. 7 days) and simulate alerts for testing and demos.
- **REST-style API** — Endpoints for rooms, appliances, usage history, alerts, and thresholds so the frontend (or other clients) can integrate easily.

---

## Tech Stack

| Layer        | Technology        |
|-------------|--------------------|
| Backend     | Python 3, Flask    |
| Auth        | Flask-Login        |
| Database    | SQLite, SQLAlchemy |
| Frontend    | HTML, CSS, JS, Bootstrap-style UI |

---

## Prerequisites

- **Python 3.8+**
- **pip** (Python package manager)

---

## Installation

1. **Clone the repository** (or download and extract the project):

   ```bash
   git clone <repository-url>
   cd smart-home-project
   ```

2. **Create a virtual environment** (recommended):

   ```bash
   python -m venv venv
   ```

   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize the database** (optional; the app can create tables on first run):

   ```bash
   python init_db.py
   ```

   Or run the app once; it will create the SQLite database and tables if they don’t exist.

---

## Running the Application

From the project root (with your virtual environment activated):

```bash
python app.py
```

The app will:

- Initialize the database (create `smart_home.db` in the project directory if needed).
- Start the Flask development server (typically at **http://127.0.0.1:5000**).

Open that URL in your browser. You’ll be redirected to the login page; use **Register** to create an account, then log in to access the dashboard.

---

## Project Structure

```
smart-home-project/
├── app.py              # Flask app, routes, and API endpoints
├── models.py           # SQLAlchemy models (User, Room, Appliance, UsageLog, etc.)
├── database.py         # DB engine, session, and initialization (SQLite)
├── init_db.py          # Script to create database tables
├── requirements.txt    # Python dependencies
├── schema.sql          # Reference SQL schema (legacy/alternate)
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       ├── main_fixed.js
│       └── dashboard.js
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── forgot_password.html
│   ├── verify_security.html
│   └── reset_password.html
└── migrations/         # Optional DB migration scripts
```

---

## Main API Endpoints (overview)

All API routes under `/api/` require an authenticated user (session) unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List user’s rooms |
| POST | `/api/add-room` | Add a room |
| POST/PUT | `/api/edit-room/<id>` | Edit room name |
| DELETE | `/api/delete-room/<id>` | Delete room and its appliances/logs |
| GET | `/api/room-usage` | Room-wise usage and appliances |
| POST | `/api/add-appliance` | Add appliance to a room |
| POST/PUT | `/api/edit-appliance/<id>` | Edit appliance |
| DELETE | `/api/delete-appliance/<id>` | Delete appliance and its logs |
| GET | `/api/usage-history` | Monthly usage history (for charts) |
| GET | `/api/dashboard-stats` | Today’s and monthly usage, alerts |
| GET | `/api/alerts` | Recent threshold alerts |
| POST | `/api/simulate-data` | Generate sample usage data |
| POST | `/api/simulate-alerts` | Generate alerts from current usage |
| POST | `/api/update-thresholds` | Update warning/critical kWh thresholds |

---

## Database

- **Engine:** SQLite  
- **File:** `smart_home.db` (created in the project root by default).  
- **Configuration:** See `database.py` for the path and connection options.  
- Tables are created automatically on first run or when you execute `init_db.py`.

---

## License

This project is provided as-is. Use and modify it according to your needs.
