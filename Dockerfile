FROM python:3.12-slim

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh && chown -R appuser:appgroup /app
USER appuser

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["/app/start.sh"]
