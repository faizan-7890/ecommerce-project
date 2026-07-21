"""
Users router — profile and address management.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
from models import User, Address
from schemas import UserOut, UserUpdate, AddressCreate, AddressOut, MessageResponse

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/profile", response_model=UserOut)
def get_profile(user: User = Depends(get_current_user)):
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/addresses", response_model=List[AddressOut])
def list_addresses(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Address).filter(Address.user_id == user.id).all()


@router.post("/addresses", response_model=AddressOut, status_code=201)
def create_address(
    data: AddressCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.is_default:
        db.query(Address).filter(
            Address.user_id == user.id, Address.address_type == data.address_type
        ).update({"is_default": False})

    address = Address(user_id=user.id, **data.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/addresses/{address_id}", response_model=AddressOut)
def update_address(
    address_id: int,
    data: AddressCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    update_data = data.model_dump()
    if update_data.get("is_default"):
        db.query(Address).filter(
            Address.user_id == user.id, Address.address_type == data.address_type
        ).update({"is_default": False})

    for key, value in update_data.items():
        setattr(address, key, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/addresses/{address_id}", response_model=MessageResponse)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    db.delete(address)
    db.commit()
    return {"message": "Address deleted successfully"}
