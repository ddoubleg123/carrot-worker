FROM python:3.9-slim

WORKDIR /app

# Install Flask
RUN pip install flask==2.3.3

# Copy app
COPY main.py .

# Expose port
EXPOSE 8080

# Run app
CMD ["python", "main.py"]
