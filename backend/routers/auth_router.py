from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from datetime import timedelta
import random

import models, schemas, auth, database

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user(request: Request, db: Session = Depends(database.get_db)):
    user = auth.get_user_from_request(request, db)
    return user

@router.put("/me", response_model=schemas.UserResponse)
def update_current_user(user_update: schemas.UserUpdate, request: Request, db: Session = Depends(database.get_db)):
    db_user = auth.get_user_from_request(request, db)
    
    if user_update.name is not None:
        db_user.name = user_update.name
    if user_update.email is not None:
        # Check if email is taken
        if user_update.email != db_user.email:
            existing = db.query(models.User).filter(models.User.email == user_update.email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Email already taken")
        db_user.email = user_update.email
    if user_update.password is not None and len(user_update.password) > 0:
        db_user.hashed_password = auth.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/me")
def delete_current_user(request: Request, response: Response, db: Session = Depends(database.get_db)):
    db_user = auth.get_user_from_request(request, db)
    
    # Manually delete dependent records to avoid constraint errors
    db.query(models.CoverLetter).filter(models.CoverLetter.user_id == db_user.id).delete(synchronize_session=False)
    db.query(models.Resume).filter(models.Resume.user_id == db_user.id).delete(synchronize_session=False)
    db.query(models.ResumeTemplate).filter(models.ResumeTemplate.user_id == db_user.id).delete(synchronize_session=False)
    
    # Delete user
    db.delete(db_user)
    db.commit()
    
    # Clear the cookie
    response.delete_cookie("access_token")
    return {"message": "Account deleted successfully"}


@router.post("/register")
def register(user: schemas.UserCreate, response: Response, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    
    # Give 3 days free trial
    from datetime import datetime
    trial_end = datetime.utcnow() + timedelta(days=3)
    
    db_user = models.User(
        email=user.email, 
        name=user.name, 
        hashed_password=hashed_password,
        trial_end_date=trial_end,
        subscription_status="trial"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Auto-login after register by issuing cookie
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(db_user.id), "email": db_user.email}, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    return {"message": "Registration successful", "user_id": db_user.id}

@router.post("/login")
def login(user: schemas.UserLogin, response: Response, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(db_user.id), "email": db_user.email}, expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    # Return access_token temporarily for backwards compatibility with frontends not completely refactored
    return {"access_token": access_token, "token_type": "bearer", "message": "Login successful"}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(data: schemas.ForgotPassword, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == data.email).first()
    if not db_user:
        # We return success anyway to prevent email enumeration
        return {"message": "If that email is registered, an OTP has been sent.", "otp": "000000"}
    
    # Generate mock OTP
    otp = str(random.randint(100000, 999999))
    print(f"--- MOCK EMAIL ---")
    print(f"To: {db_user.email}")
    print(f"Subject: Password Reset")
    print(f"Your OTP is: {otp}")
    print(f"------------------")
    
    # We return the OTP in the payload just for the frontend alert requirement (DO NOT DO THIS IN PROD)
    return {"message": "If that email is registered, an OTP has been sent.", "otp": otp}
