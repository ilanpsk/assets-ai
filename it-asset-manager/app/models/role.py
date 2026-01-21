from sqlalchemy import Column, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

role_permission_table = Table(
    "role_permissions",
    Base.metadata,
    Column("role_name", String, ForeignKey("role.name"), primary_key=True),
    Column("permission_slug", String, ForeignKey("permission.slug"), primary_key=True),
)

class Permission(Base, TimestampMixin):
    slug = Column(String, primary_key=True)
    description = Column(String, nullable=True)

class Role(Base, TimestampMixin):
    name = Column(String, primary_key=True)  # "admin", "it", "user"
    description = Column(String, nullable=True)
    permissions = relationship("Permission", secondary=role_permission_table, lazy="selectin")
