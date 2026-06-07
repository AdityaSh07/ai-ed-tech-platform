from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from .config import db_settings as settings

SQLALCHEMY_DATABASE_URL = f'postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}'

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#
# first we create engine. engine is actually the main thing here it connects sqlalchemy was the database and converts sqlalchemy functions into sql queries
#
# second we create sessionmaker() function which establish a connection for proper transactions so that we can commit or rollback transactions if something goes wrong
#
# third is Base = declarative_base() we use this when we want to create a class which creates table so we inherit it to create tables in our database
