from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.database_url)
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='username'"))
    if not res.fetchone():
        conn.execute(text("ALTER TABLE users ADD COLUMN username TEXT"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_username ON users (username)"))
        conn.commit()
    print("DB check done")
