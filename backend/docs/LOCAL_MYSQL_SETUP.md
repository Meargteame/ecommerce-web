# Local MySQL Setup Guide (Linux)

Follow these steps to set up MySQL on your local Linux machine without using Docker.

## 1. Install MySQL Server

For Ubuntu/Debian:
```bash
sudo apt update
sudo apt install mysql-server
```

For Fedora/RHEL:
```bash
sudo dnf install mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

## 2. Secure MySQL Installation
Run this command to set your root password and remove insecure default settings:
```bash
sudo mysql_secure_installation
```

## 3. Create Database and User
Log into MySQL as root:
```bash
sudo mysql -u root -p
```

Then run these SQL commands:
```sql
CREATE DATABASE ecommerce_db;
CREATE USER 'ecommerce_user'@'localhost' IDENTIFIED BY 'ecommerce_pass';
GRANT ALL PRIVILEGES ON ecommerce_db.* TO 'ecommerce_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Configure Environment Variables
Update your `backend/.env` file with these values:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce_db
DB_USER=ecommerce_user
DB_PASSWORD=ecommerce_pass
```

## 5. Run Migrations
Once MySQL is running and configured, run:
```bash
cd backend
chmod +x scripts/run-migrations-mysql.sh
./scripts/run-migrations-mysql.sh
```
