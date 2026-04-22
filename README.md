# rl-portfolio-optimizer

A reinforcement learning based portfolio optimization system with a React frontend and Django backend.

## Project Setup

### Prerequisites

Make sure the following is installed on your system:

- Docker
- Docker Compose

You can verify installation with:


```bash
docker --version
docker compose version
```


### Running the Project

Clone the repository:


```bash
git clone https://github.com/PushkarOM/rl-portfolio-optimizer.git
cd rl-portfolio-optimizer
```


Start the application using Docker:


```bash
docker compose up --build
```


This will:

- Build the backend (Django) container
- Build the frontend (React + Vite) container
- Start both services

### Access the Application

Once the containers are running, open the following in your browser:

Frontend:

[http://localhost:5173](http://localhost:5173)

Backend API:

[http://localhost:8000](http://localhost:8000)



### Stopping the Application

To stop the containers:
```bash
Ctrl + C
```


Or if running in detached mode:


```bash
docker compose down
```



## Architecture

The project uses a containerized development environment:

- **Frontend:** React + Vite
- **Backend:** Django + Django REST Framework
- **Containerization:** Docker + Docker Compose

