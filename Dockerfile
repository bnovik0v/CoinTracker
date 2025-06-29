# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install poetry
RUN pip install poetry

# Copy the dependency definition files
COPY pyproject.toml ./

# Generate the lock file and install dependencies
# This ensures that the lock file is always in sync with pyproject.toml
RUN poetry config virtualenvs.create false && \
    poetry lock && \
    poetry install --without dev --no-interaction --no-ansi --no-root

# Copy the rest of the application's code to the working directory
COPY . .

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
