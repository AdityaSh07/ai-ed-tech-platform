from fastapi import Depends, APIRouter, HTTPException,status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core import schemas
from core.database import get_db
from core.models import user_model
from OAuth2 import OAuth2
from ..utils import hashing

router = APIRouter(
    prefix="/profile",
    tags=["profile"]
)

@router.get("/me", status_code=status.HTTP_200_OK, response_model=schemas.UserProfileOut)
def get_profile(db: Session = Depends(get_db), id: int = Depends(OAuth2.get_current_user)):
    user_data = db.query(user_model.User).filter(user_model.User.id == id).first()
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_data

@router.put("/me", status_code=status.HTTP_200_OK, response_model=schemas.UserProfileOut)
def update_details(user_details: schemas.UserData, db: Session = Depends(get_db), id: int = Depends(OAuth2.get_current_user)):
    
    user_data = db.query(user_model.User).filter(user_model.User.id == id).first()

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    


    update_data = user_details.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user_data, field, value)

    try:
        db.commit()
        db.refresh(user_data)

    except IntegrityError:
        db.rollback()

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Email is already in use")


    return user_data


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(password: schemas.PassWord, db: Session = Depends(get_db), id: int = Depends(OAuth2.get_current_user)):

    user_data = db.query(user_model.User).filter(user_model.User.id == id).first()

    if not user_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    
    if not hashing.verify_password(
        password.current_password,
        user_data.password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    user_data.password = hashing.hash_password(
        password.new_password
    )

    db.commit()

