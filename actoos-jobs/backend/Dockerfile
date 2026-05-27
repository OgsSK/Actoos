# Utiliser une image Python 3.12 légère
FROM python:3.12-slim

# Installer Rust (nécessaire pour compiler pydantic-core si pas de wheel, mais on va éviter avec une version récente)
# On installe aussi les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY . .

# Exposer le port (Render utilise $PORT)
EXPOSE 8000

# Commande de démarrage
CMD uvicorn main:app --host 0.0.0.0 --port $PORT