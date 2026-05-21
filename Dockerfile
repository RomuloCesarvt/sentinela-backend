# Backend
FROM python:3.11-slim as backend

WORKDIR /app/backend

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY backend/requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Instalar dependências de sistema do Playwright (libnss3, libgbm, etc.)
RUN playwright install-deps chromium

# Download Playwright browsers
RUN playwright install chromium

# Copiar código do backend
COPY backend/ .

# Expor porta
EXPOSE 8000

# Comando para rodar o backend
CMD ["python", "main.py"]
